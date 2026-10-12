# Phase 7B local Auth Hook integration test.
# Run from the repository root in PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-local-agent-hook.ps1
# This test refuses non-loopback API URLs and only talks to the local Docker DB.
$ErrorActionPreference = "Stop"

$testEmail = $null
$testUserId = $null
$testPassed = $false
$dbContainer = "supabase_db_technaam-web"

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

    $containerName = (& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or $containerName -ne $dbContainer) {
        throw "Expected local database container '$dbContainer' is not running."
    }

    $envLines = & supabase status -o env 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read local Supabase status. Ensure the local stack is running."
    }

    $values = @{}
    foreach ($line in $envLines) {
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

    $apiUrl = $values["API_URL"]
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiUrl -or -not $apiKey) {
        throw "Local API URL or publishable/anon key is missing from CLI status. No values were printed."
    }

    $apiUri = [System.Uri]$apiUrl
    if (-not $apiUri.IsLoopback -or $apiUri.Port -ne 54321 -or $apiUri.Scheme -ne "http") {
        throw "Refusing to test: API URL is not the expected local loopback endpoint on port 54321."
    }

    $objectCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.custom_access_token_hook(jsonb)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($objectCheck -ne "ok") {
        throw "The local role-assignment table or hook function is missing. Do not run a remote migration."
    }

    $testEmail = "phase7b-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = ([Guid]::NewGuid().ToString('N') + "Aa1!")
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
            Write-Warning "Cleanup could not be confirmed. Run the targeted local cleanup check before proceeding."
        }
    } elseif ($testEmail) {
        Write-Warning "A test email was generated but no user ID was obtained; check local auth.users for the random phase7b test email before continuing."
    }
}

if ($testPassed) {
    Write-Host "Local Phase 7B Auth Hook integration test passed."
} else {
    $host.SetShouldExit(1)
}
