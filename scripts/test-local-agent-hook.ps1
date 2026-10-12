# Phase 7B local Auth Hook integration test.
# Run from the repository root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-local-agent-hook.ps1
# This test uses only local Docker services and refuses non-loopback port bindings.
$ErrorActionPreference = "Stop"

$testEmail = $null
$testUserId = $null
$testPassed = $false
$dbContainer = "supabase_db_technaam-web"
$apiContainer = "supabase_kong_technaam-web"
$apiUrl = "http://127.0.0.1:54321"

function Invoke-LocalPsql([string]$Sql) {
    $output = & docker exec $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A -c $Sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Local PostgreSQL command failed. Output: $($output -join ' ')"
    }
    return ($output -join "").Trim()
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
        throw "The local role-assignment table or hook function is missing. Do not run a remote migration."
    }

    # The CLI can report intentionally excluded services on stderr. Capture both
    # streams and parse only environment assignment lines; never print key values.
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

    $statusApiUrl = $values["API_URL"]
    if ($statusApiUrl -ne $apiUrl) {
        throw "CLI status did not report the expected local API URL. Refusing to send requests."
    }

    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) {
        throw "CLI output did not include a local publishable/anon key. No key was printed."
    }

    $testEmail = "phase7b-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $headers = @{ apikey = $apiKey }
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress

    $signup = Invoke-RestMethod -Method Post -Uri "$($apiUrl.TrimEnd('/'))/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
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
    $login = Invoke-RestMethod -Method Post -Uri "$($apiUrl.TrimEnd('/'))/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) {
        throw "Local password sign-in returned no access token."
    }

    $segments = $login.access_token.Split('.')
    if ($segments.Length -lt 2) {
        throw "Local Auth returned a token that is not in JWT format."
    }
    $payload = $segments[1].Replace('-', '+').Replace('_', '/')
    switch ($payload.Length % 4) {
        2 { $payload += '==' }
        3 { $payload += '=' }
    }
    $claimsJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    $claims = $claimsJson | ConvertFrom-Json

    if ($claims.role -eq "agent_contributor") {
        Write-Host "PASS: Local Supabase Auth issued the agent_contributor role."
        $testPassed = $true
    } else {
        Write-Host "FAIL: Local token role was '$($claims.role)', expected 'agent_contributor'."
    }
}
catch {
    Write-Host "TEST ERROR: $($_.Exception.Message)"
    Write-Host "No API key, password, or access token was printed."
}
finally {
    if ($testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $cleanupSql = "DELETE FROM auth.users WHERE id = '$testUserId'; DELETE FROM public.agent_role_assignments WHERE user_id = '$testUserId';"
            $null = Invoke-LocalPsql $cleanupSql
            Write-Host "Cleanup: temporary local user and role assignment removed."
        } catch {
            Write-Warning "Cleanup could not be confirmed. Check the local test assignment before continuing."
        }
    } elseif ($testEmail) {
        try {
            $escapedEmail = $testEmail.Replace("'", "''")
            $cleanupSql = "DELETE FROM auth.users WHERE email = '$escapedEmail' AND email LIKE 'phase7b-%@example.com';"
            $null = Invoke-LocalPsql $cleanupSql
            Write-Host "Cleanup: any user for this exact generated test email removed."
        } catch {
            Write-Warning "Cleanup could not be confirmed. Check local auth.users for the generated phase7b test email."
        }
    }
}

if ($testPassed) {
    Write-Host "Local Phase 7B Auth Hook integration test passed."
} else {
    exit 1
}
