# Phase 7B local Auth Hook integration test.
# Run from the repository root in PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-local-agent-hook.ps1
# Uses local Docker services only. Secrets and JWTs are never printed.
$ErrorActionPreference = "Stop"

$dbContainer = "supabase_db_technaam-web"
$apiContainer = "supabase_kong_technaam-web"
$apiUrl = "http://127.0.0.1:54321"
$testEmail = $null
$testUserId = $null
$ordinaryEmail = $null
$ordinaryUserId = $null
$contributorPassed = $false
$ordinaryPassed = $false
$testPassed = $false

function Invoke-LocalPsql([string]$Sql) {
    $output = & docker exec $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A -c $Sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Local PostgreSQL command failed: $($output -join ' ')"
    }
    return ($output -join "").Trim()
}

function Get-LocalJwtClaims([string]$Token) {
    $segments = $Token.Split('.')
    if ($segments.Length -lt 2) {
        throw "Local Auth returned a token that is not in JWT format."
    }
    $payload = $segments[1].Replace('-', '+').Replace('_', '/')
    switch ($payload.Length % 4) {
        2 { $payload += '==' }
        3 { $payload += '=' }
    }
    $json = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    return ($json | ConvertFrom-Json)
}

function Remove-LocalTestUser([string]$UserId, [string]$Email) {
    if ($UserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        $sql = "DELETE FROM auth.users WHERE id = '$UserId'; DELETE FROM public.agent_role_assignments WHERE user_id = '$UserId';"
        $null = Invoke-LocalPsql $sql
    } elseif ($Email -and $Email -like 'phase7b-*@example.com') {
        $safeEmail = $Email.Replace("'", "''")
        $sql = "DELETE FROM auth.users WHERE email = '$safeEmail';"
        $null = Invoke-LocalPsql $sql
    }
}

try {
    if (-not (Test-Path ".\supabase\config.toml")) {
        throw "supabase/config.toml is missing. Run this from the repository root."
    }

    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled in supabase/config.toml."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) {
        throw "Expected local database container '$dbContainer' is not running."
    }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) {
        throw "Expected local API gateway '$apiContainer' is not running."
    }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) {
        throw "Could not verify the local API port binding."
    }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):54321$') {
            throw "Refusing to test: API port binding is not localhost-only."
        }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) {
        throw "Could not verify the local database port binding."
    }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):54322$') {
            throw "Refusing to test: database port binding is not localhost-only."
        }
    }

    $objectCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.custom_access_token_hook(jsonb)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($objectCheck -ne "ok") {
        throw "Local role-assignment table or hook function is missing. Do not run a remote migration."
    }

    # supabase status may write an excluded-services diagnostic to stderr.
    # Temporarily permit that native stderr while capturing output; do not print it.
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally {
        $ErrorActionPreference = $savedErrorActionPreference
    }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and
                (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or
                 ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }

    if ($values["API_URL"] -ne $apiUrl) {
        throw "CLI status did not report the expected local API URL. Refusing to send requests."
    }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) {
        throw "CLI output did not include a local publishable/anon key. No key was printed."
    }

    $headers = @{ apikey = $apiKey }

    # Positive case: active contributor assignment must produce role=agent_contributor.
    $testEmail = "phase7b-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody

    if ($signup.user -and $signup.user.id) {
        $testUserId = [string]$signup.user.id
    } elseif ($signup.id) {
        $testUserId = [string]$signup.id
    }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        throw "Local sign-up did not return a valid user ID. Email confirmation may be required."
    }

    $insertSql = "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary local Phase 7B hook test');"
    $null = Invoke-LocalPsql $insertSql

    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) {
        throw "Local contributor sign-in returned no access token."
    }

    $claims = Get-LocalJwtClaims $login.access_token
    if ($claims.role -eq "agent_contributor") {
        Write-Host "PASS: Active contributor assignment produced role agent_contributor."
        $contributorPassed = $true
    } else {
        Write-Host "FAIL: Contributor role was '$($claims.role)', expected agent_contributor."
    }

    # Negative case: ordinary user with no assignment must retain role=authenticated.
    $ordinaryEmail = "phase7b-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody

    if ($ordinarySignup.user -and $ordinarySignup.user.id) {
        $ordinaryUserId = [string]$ordinarySignup.user.id
    } elseif ($ordinarySignup.id) {
        $ordinaryUserId = [string]$ordinarySignup.id
    }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        throw "Local ordinary-user sign-up did not return a valid user ID."
    }

    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) {
        throw "Local ordinary-user sign-in returned no access token."
    }

    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -eq "authenticated") {
        Write-Host "PASS: Ordinary user without an assignment retained role authenticated."
        $ordinaryPassed = $true
    } else {
        Write-Host "FAIL: Ordinary-user role was '$($ordinaryClaims.role)', expected authenticated."
    }

    $testPassed = $contributorPassed -and $ordinaryPassed
}
catch {
    Write-Host "TEST ERROR: $($_.Exception.Message)"
    Write-Host "No API key, password, or access token was printed."
}
finally {
    foreach ($user in @(
        [pscustomobject]@{ Id = $testUserId; Email = $testEmail },
        [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail }
    )) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Cleanup could not be confirmed for a temporary local test record."
            }
        }
    }
}

if ($testPassed) {
    Write-Host "Local Phase 7B Auth Hook integration test passed."
} else {
    exit 1
}
