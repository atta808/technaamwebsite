# Phase 7B local Agent API live integration test.
# Run from repository root in PowerShell 7+ or Windows PowerShell 5.1.
# Local services only. Tokens and API keys are never printed.
# Creates uniquely named local test users and one temporary proposal; cleanup is scoped.
# Validation cases are expected to fail before any database write.

$ErrorActionPreference = "Stop"

$dbContainer = "supabase_db_technaam-web"
$apiContainer = "supabase_kong_technaam-web"
$apiUrl = "http://127.0.0.1:55433"
$appUrl = "http://127.0.0.1:3000"
$testEmail = $null
$testUserId = $null
$testPassword = $null
$testProposalId = $null
$ordinaryEmail = $null
$ordinaryUserId = $null
$ordinaryPassword = $null
$apiKey = $null
$testFailed = $false

function Invoke-LocalPsql([string]$Sql) {
    $output = & docker exec $dbContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A -c $Sql 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Local PostgreSQL command failed: $($output -join ' ')" }
    return ($output -join "").Trim()
}

function Get-LocalJwtClaims([string]$Token) {
    $segments = $Token.Split('.')
    if ($segments.Length -lt 2) { throw "Local Auth returned a token that is not in JWT format." }
    $payload = $segments[1].Replace('-', '+').Replace('_', '/')
    switch ($payload.Length % 4) { 2 { $payload += '==' } 3 { $payload += '=' } }
    $json = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    return ($json | ConvertFrom-Json)
}

function Get-ResponseStatus([string]$Uri, [string]$Method, [hashtable]$Headers, [string]$Body, [string]$ContentType = "application/json") {
    try {
        $response = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $Headers -ContentType $ContentType -Body $Body -TimeoutSec 20
        return [pscustomobject]@{ Status = [int]$response.StatusCode; Content = [string]$response.Content }
    } catch {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw "Request failed without an HTTP response: $($_.Exception.Message)" }
        $status = [int]$response.StatusCode
        $content = ""
        try {
            if ($response.Content) { $content = [string]$response.Content.ReadAsStringAsync().GetAwaiter().GetResult() }
            elseif ($response.GetResponseStream()) {
                $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
                $content = $reader.ReadToEnd()
                $reader.Dispose()
            }
        } catch { }
        return [pscustomobject]@{ Status = $status; Content = $content }
    }
}

function Assert-Status([string]$Name, [int]$Expected, [int]$Actual) {
    if ($Actual -ne $Expected) { throw "$Name failed: expected HTTP $Expected, received HTTP $Actual." }
    Write-Host "PASS: $Name (HTTP $Actual)" -ForegroundColor Green
}

function Remove-LocalTestUser([string]$UserId, [string]$Email) {
    # Delete only an account created by this harness, with matching UUID and unique test email.
    if ($UserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    $proposalCleanupSafe = $true
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail; IsContributor = $true }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail; IsContributor = $false })) {
        if ($user.Id -or $user.Email) {
            # If a proposal could not be safely removed, retain its contributor account
            # so foreign keys/audit references are not disturbed.
            if ($user.IsContributor -and -not $proposalCleanupSafe) {
                Write-Warning "Contributor account retained because proposal cleanup was not verified. User ID: $($user.Id)"
                continue
            }
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: verified temporary local test user/assignment cleanup checked."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: no verified test-user UUID."
        return
    }
    if (-not $Email -or $Email -notmatch '^phase7b-live-(ordinary-)?[0-9a-f]{32}@example\.com

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: email is not in the unique local test-account format."
        return
    }

    $safeEmail = $Email.Replace("'", "''")
    $matches = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($matches -ne "1") {
        Write-Warning "Skipping user cleanup: UUID/email pair was not verified in local auth.users."
        return
    }

    # Do not remove an account if any proposal remains attached to it. This protects
    # retained proposals and any related audit history from cascading/dependency cleanup.
    $proposalCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_proposals WHERE agent_id = '$UserId';"
    if ($proposalCount -ne "0") {
        Write-Warning "Temporary user retained because proposals still reference it. User ID: $UserId"
        return
    }

    $null = Invoke-LocalPsql "DELETE FROM public.agent_role_assignments WHERE user_id = '$UserId';"
    $null = Invoke-LocalPsql "DELETE FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    $remaining = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($remaining -ne "0") {
        throw "Verified temporary test user could not be removed."
    }
}

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
 -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: no verified test-user UUID."
        return
    }
    if (-not $Email -or $Email -notmatch '^phase7b-live-(ordinary-)?[0-9a-f]{32}@example\.com

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: email is not in the unique local test-account format."
        return
    }

    $safeEmail = $Email.Replace("'", "''")
    $matches = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($matches -ne "1") {
        Write-Warning "Skipping user cleanup: UUID/email pair was not verified in local auth.users."
        return
    }

    # Do not remove an account if any proposal remains attached to it. This protects
    # retained proposals and any related audit history from cascading/dependency cleanup.
    $proposalCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_proposals WHERE agent_id = '$UserId';"
    if ($proposalCount -ne "0") {
        Write-Warning "Temporary user retained because proposals still reference it. User ID: $UserId"
        return
    }

    $null = Invoke-LocalPsql "DELETE FROM public.agent_role_assignments WHERE user_id = '$UserId';"
    $null = Invoke-LocalPsql "DELETE FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    $remaining = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($remaining -ne "0") {
        throw "Verified temporary test user could not be removed."
    }
}

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        try {
            $ownedProposal = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
            if ($ownedProposal -ne "1") {
                Write-Warning "Proposal cleanup skipped because the exact proposal/contributor pair could not be verified. Proposal ID: $testProposalId"
                $proposalCleanupSafe = $false
            } else {
                $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
                if ($auditCount -eq "0") {
                    $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                    $remainingProposal = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                    if ($remainingProposal -ne "0") {
                        Write-Warning "Test proposal deletion could not be verified. Proposal ID: $testProposalId"
                        $proposalCleanupSafe = $false
                    } else {
                        Write-Host "Cleanup: verified temporary proposal removed."
                    }
                } else {
                    Write-Warning "Test proposal retained because audit records reference it. Proposal ID: $testProposalId"
                    $proposalCleanupSafe = $false
                }
            }
        } catch {
            Write-Warning "Could not verify proposal cleanup. Proposal ID: $testProposalId. Inspect it before rerunning."
            $proposalCleanupSafe = $false
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: no verified test-user UUID."
        return
    }
    if (-not $Email -or $Email -notmatch '^phase7b-live-(ordinary-)?[0-9a-f]{32}@example\.com

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
) {
        Write-Warning "Skipping user cleanup: email is not in the unique local test-account format."
        return
    }

    $safeEmail = $Email.Replace("'", "''")
    $matches = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($matches -ne "1") {
        Write-Warning "Skipping user cleanup: UUID/email pair was not verified in local auth.users."
        return
    }

    # Do not remove an account if any proposal remains attached to it. This protects
    # retained proposals and any related audit history from cascading/dependency cleanup.
    $proposalCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_proposals WHERE agent_id = '$UserId';"
    if ($proposalCount -ne "0") {
        Write-Warning "Temporary user retained because proposals still reference it. User ID: $UserId"
        return
    }

    $null = Invoke-LocalPsql "DELETE FROM public.agent_role_assignments WHERE user_id = '$UserId';"
    $null = Invoke-LocalPsql "DELETE FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    $remaining = Invoke-LocalPsql "SELECT COUNT(*) FROM auth.users WHERE id = '$UserId' AND email = '$safeEmail';"
    if ($remaining -ne "0") {
        throw "Verified temporary test user could not be removed."
    }
}

try {
    if (-not (Test-Path ".\supabase\config.toml")) { throw "Run this script from the repository root; supabase/config.toml was not found." }
    $config = Get-Content ".\supabase\config.toml" -Raw
    if ($config -notmatch '(?s)\[auth\.hook\.custom_access_token\]\s*enabled\s*=\s*true\s*uri\s*=\s*"pg-functions://postgres/public/custom_access_token_hook"') {
        throw "The local Custom Access Token Hook is not enabled. Refusing to run."
    }

    $runningDb = @(& docker ps --filter "name=^/$dbContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningDb -notcontains $dbContainer) { throw "Local database container is not running." }
    $runningApi = @(& docker ps --filter "name=^/$apiContainer$" --format "{{.Names}}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $runningApi -notcontains $apiContainer) { throw "Local Supabase API gateway is not running." }

    $apiPorts = @(& docker port $apiContainer "8000/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $apiPorts.Count -eq 0) { throw "Could not verify local Supabase API port binding." }
    foreach ($binding in $apiPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55433$') { throw "Refusing to test: Supabase API binding is not localhost-only." }
    }

    $dbPorts = @(& docker port $dbContainer "5432/tcp" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $dbPorts.Count -eq 0) { throw "Could not verify local database port binding." }
    foreach ($binding in $dbPorts) {
        if ([string]$binding -notmatch '^(127\.0\.0\.1|\[::1\]):55434$') { throw "Refusing to test: database binding is not localhost-only." }
    }

    $schemaCheck = Invoke-LocalPsql "SELECT CASE WHEN to_regclass('public.agent_proposals') IS NOT NULL AND to_regclass('public.agent_role_assignments') IS NOT NULL AND to_regprocedure('public.submit_agent_proposal(text,jsonb,text,numeric)') IS NOT NULL THEN 'ok' ELSE 'missing' END;"
    if ($schemaCheck -ne "ok") { throw "Required local Phase 7B database objects are missing." }

    $statusOutput = @()
    $savedErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $statusOutput = @(& supabase status -o env 2>&1)
    } finally { $ErrorActionPreference = $savedErrorActionPreference }

    $values = @{}
    foreach ($item in $statusOutput) {
        $line = [string]$item
        if ($line -match '^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$') {
            $keyName = $matches[1]
            $rawValue = $matches[2].Trim()
            if ($rawValue.Length -ge 2 -and (($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) -or ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")))) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $values[$keyName] = $rawValue
        }
    }
    if ($values["API_URL"] -ne $apiUrl) { throw "Supabase CLI did not confirm the expected local API URL. Refusing to send requests." }
    $apiKey = $values["PUBLISHABLE_KEY"]
    if (-not $apiKey) { $apiKey = $values["ANON_KEY"] }
    if (-not $apiKey) { throw "Supabase CLI did not provide a local publishable/anon key. No key was printed." }
    $headers = @{ apikey = $apiKey }

    $health = Invoke-WebRequest -Uri "$apiUrl/auth/v1/health" -Method Get -TimeoutSec 10
    Assert-Status "Local Supabase Auth health" 200 ([int]$health.StatusCode)
    $homeResponse = Invoke-WebRequest -Uri $appUrl -Method Get -TimeoutSec 15
    Assert-Status "Local Next.js homepage" 200 ([int]$homeResponse.StatusCode)

    $missing = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers @{} -Body '{"type":"test"}'
    Assert-Status "Missing bearer token rejected" 401 $missing.Status

    $invalidHeaders = @{ Authorization = "Bearer invalid-local-test-token" }
    $invalid = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $invalidHeaders -Body '{"type":"test"}'
    Assert-Status "Invalid bearer token rejected" 401 $invalid.Status

    $testEmail = "phase7b-live-$([Guid]::NewGuid().ToString('N'))@example.com"
    $testPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $signupBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $signup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $signupBody
    if ($signup.user -and $signup.user.id) { $testUserId = [string]$signup.user.id } elseif ($signup.id) { $testUserId = [string]$signup.id }
    if ($testUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local contributor sign-up did not return a valid user ID; email confirmation may be required." }

    $null = Invoke-LocalPsql "INSERT INTO public.agent_role_assignments (user_id, role, is_active, grant_reason) VALUES ('$testUserId', 'agent_contributor', true, 'Temporary Phase 7B live API test');"
    $loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $loginBody
    if (-not $login.access_token) { throw "Local contributor sign-in returned no access token." }
    $contributorClaims = Get-LocalJwtClaims $login.access_token
    if ($contributorClaims.role -ne "agent_contributor") { throw "Contributor JWT role was not agent_contributor." }
    Write-Host "PASS: Temporary contributor received agent_contributor role." -ForegroundColor Green
    $contributorHeaders = @{ Authorization = "Bearer $($login.access_token)" }

    $malformed = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body '{"type":'
    Assert-Status "Malformed JSON rejected" 400 $malformed.Status

    $retailBody = @{ type = "suggest_retail_observation"; payload = @{}; source_url = "https://example.com/phase7b-retail-disabled"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $retail = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $retailBody
    Assert-Status "Retail pilot remains disabled" 403 $retail.Status

    # Validation failures must be rejected before any proposal is written.
    $invalidSourceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid source URL test"; slug = "invalid-source-url-test"; entity_type = "other" }
        source_url = "http://example.com/not-https"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidSource = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidSourceBody
    Assert-Status "Non-HTTPS source URL rejected" 400 $invalidSource.Status

    $invalidConfidenceBody = @{
        type = "suggest_technology"
        payload = @{ name = "Invalid confidence test"; slug = "invalid-confidence-test"; entity_type = "other" }
        source_url = "https://example.com/phase7b-invalid-confidence"
        confidence = 1.01
    } | ConvertTo-Json -Depth 8 -Compress
    $invalidConfidence = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $invalidConfidenceBody
    Assert-Status "Confidence above 1 rejected" 400 $invalidConfidence.Status

    $unsupportedBody = @{
        type = "unsupported_test_type"
        payload = @{}
        source_url = "https://example.com/phase7b-unsupported-type"
        confidence = 0.5
    } | ConvertTo-Json -Depth 8 -Compress
    $unsupported = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $unsupportedBody
    Assert-Status "Unsupported proposal type rejected" 400 $unsupported.Status

    $ordinaryEmail = "phase7b-live-ordinary-$([Guid]::NewGuid().ToString('N'))@example.com"
    $ordinaryPassword = [Guid]::NewGuid().ToString('N') + "Aa1!"
    $ordinarySignupBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinarySignup = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" -Headers $headers -ContentType "application/json" -Body $ordinarySignupBody
    if ($ordinarySignup.user -and $ordinarySignup.user.id) { $ordinaryUserId = [string]$ordinarySignup.user.id } elseif ($ordinarySignup.id) { $ordinaryUserId = [string]$ordinarySignup.id }
    if ($ordinaryUserId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "Local ordinary-user sign-up did not return a valid user ID." }
    $ordinaryLoginBody = @{ email = $ordinaryEmail; password = $ordinaryPassword } | ConvertTo-Json -Compress
    $ordinaryLogin = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/token?grant_type=password" -Headers $headers -ContentType "application/json" -Body $ordinaryLoginBody
    if (-not $ordinaryLogin.access_token) { throw "Local ordinary-user sign-in returned no access token." }
    $ordinaryClaims = Get-LocalJwtClaims $ordinaryLogin.access_token
    if ($ordinaryClaims.role -ne "authenticated") { throw "Ordinary-user JWT role was not authenticated." }
    Write-Host "PASS: Temporary ordinary user retained authenticated role." -ForegroundColor Green
    $ordinaryHeaders = @{ Authorization = "Bearer $($ordinaryLogin.access_token)" }
    $ordinaryBody = @{ type = "suggest_technology"; payload = @{ name = "Phase 7B Live Test $([Guid]::NewGuid().ToString('N').Substring(0,8))"; slug = "phase7b-live-$([Guid]::NewGuid().ToString('N').Substring(0,12))"; entity_type = "other" }; source_url = "https://example.com/phase7b-ordinary-rejection"; confidence = 0.5 } | ConvertTo-Json -Depth 8 -Compress
    $ordinarySubmit = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $ordinaryHeaders -Body $ordinaryBody
    Assert-Status "Ordinary user cannot submit proposals" 403 $ordinarySubmit.Status

    $unique = [Guid]::NewGuid().ToString('N')
    $payload = @{ name = "Phase 7B Test $unique"; slug = "phase7b-test-$unique"; entity_type = "other" }
    $proposalBodyObject = @{ type = "suggest_technology"; payload = $payload; source_url = "https://example.com/phase7b-test/$unique"; confidence = 0.73 }
    $proposalBody = $proposalBodyObject | ConvertTo-Json -Depth 8 -Compress
    $first = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Contributor proposal submission" 201 $first.Status
    $firstJson = $first.Content | ConvertFrom-Json
    if (-not $firstJson.id -or $firstJson.status -ne "pending_review" -or $firstJson.duplicate -ne $false) { throw "Proposal creation response did not match the expected contract." }
    $testProposalId = [string]$firstJson.id
    if ($testProposalId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw "API returned an invalid proposal ID." }
    Write-Host "PASS: Proposal response reports pending_review." -ForegroundColor Green

    $duplicate = Get-ResponseStatus -Uri "$appUrl/api/agent/proposals" -Method "Post" -Headers $contributorHeaders -Body $proposalBody
    Assert-Status "Identical pending proposal recognized" 200 $duplicate.Status
    $duplicateJson = $duplicate.Content | ConvertFrom-Json
    if ([string]$duplicateJson.id -ne $testProposalId -or $duplicateJson.duplicate -ne $true) { throw "Duplicate response did not return the original proposal ID." }
    Write-Host "PASS: Duplicate response returned the original proposal." -ForegroundColor Green

    $persisted = Invoke-LocalPsql "SELECT CASE WHEN EXISTS (SELECT 1 FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId' AND proposal_type = 'suggest_technology' AND status = 'pending_review') THEN 'ok' ELSE 'missing' END;"
    if ($persisted -ne "ok") { throw "Created proposal could not be verified in the local database." }
    Write-Host "PASS: Proposal persisted in local Supabase." -ForegroundColor Green
    Write-Host "All live local Agent API tests passed." -ForegroundColor Green
} catch {
    $testFailed = $true
    Write-Host "TEST FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "No API key, password, or access token was printed."
} finally {
    if ($testProposalId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and $testUserId -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
        try {
            $auditCount = Invoke-LocalPsql "SELECT COUNT(*) FROM public.agent_audit_log WHERE proposal_id = '$testProposalId';"
            if ($auditCount -eq "0") {
                $null = Invoke-LocalPsql "DELETE FROM public.agent_proposals WHERE id = '$testProposalId' AND agent_id = '$testUserId';"
                Write-Host "Cleanup: test proposal removed (scoped to the created proposal and contributor)." 
            } else {
                Write-Warning "Test proposal retained because audit records reference it; review proposal ID $testProposalId manually."
            }
        } catch {
            Write-Warning "Could not confirm proposal cleanup. If a proposal was created, inspect the test proposal ID before retrying."
        }
    }
    foreach ($user in @([pscustomobject]@{ Id = $testUserId; Email = $testEmail }, [pscustomobject]@{ Id = $ordinaryUserId; Email = $ordinaryEmail })) {
        if ($user.Id -or $user.Email) {
            try {
                Remove-LocalTestUser -UserId ([string]$user.Id) -Email ([string]$user.Email)
                Write-Host "Cleanup: temporary local test user/assignment removed where present."
            } catch {
                Write-Warning "Could not confirm cleanup of a temporary test user. Do not rerun until checking local auth.users."
            }
        }
    }
}

if ($testFailed) { exit 1 }
