$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$timestampFile = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $root 'docs/AUTONOMOUS_HEALTH_SNAPSHOT.md'
$historyDir = Join-Path $root 'docs/health-history'
$historyPath = Join-Path $historyDir ("AUTONOMOUS_HEALTH_SNAPSHOT_" + $timestampFile + ".md")

if (-not (Test-Path $historyDir)) {
    New-Item -ItemType Directory -Path $historyDir -Force | Out-Null
}

function Parse-HealthSnapshot {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    $content = Get-Content -Path $Path -Raw

    $generatedAt = ''
    $overall = ''
    $criticalFailures = ''
    $bundleBudget = ''

    $m1 = [regex]::Match($content, '(?m)^- Generated At: (.+)$')
    if ($m1.Success) { $generatedAt = $m1.Groups[1].Value.Trim() }

    $m2 = [regex]::Match($content, '(?m)^- Overall: (.+)$')
    if ($m2.Success) { $overall = $m2.Groups[1].Value.Trim() }

    $m3 = [regex]::Match($content, '(?m)^- Critical Failures: (.+)$')
    if ($m3.Success) { $criticalFailures = $m3.Groups[1].Value.Trim() }

    $m4 = [regex]::Match($content, '(?m)^\| Bundle Budget \| ([^|]+)\|')
    if ($m4.Success) { $bundleBudget = $m4.Groups[1].Value.Trim() }

    return [PSCustomObject]@{
        GeneratedAt = $generatedAt
        Overall = $overall
        CriticalFailures = $criticalFailures
        BundleBudget = $bundleBudget
        Source = Split-Path -Leaf $Path
    }
}

function Compare-OverallTrend {
    param([string]$Current, [string]$Previous)

    if ([string]::IsNullOrWhiteSpace($Previous)) {
        return 'N/A'
    }

    if ($Current -eq $Previous) {
        return 'SAME'
    }

    if ($Current -eq 'HEALTHY' -and $Previous -ne 'HEALTHY') {
        return 'UP'
    }

    if ($Current -ne 'HEALTHY' -and $Previous -eq 'HEALTHY') {
        return 'DOWN'
    }

    return 'MIX'
}

function Compare-CriticalTrend {
    param([string]$Current, [string]$Previous)

    [int]$currValue = 0
    [int]$prevValue = 0
    $currOk = [int]::TryParse($Current, [ref]$currValue)
    $prevOk = [int]::TryParse($Previous, [ref]$prevValue)

    if (-not $currOk -or -not $prevOk) {
        return 'N/A'
    }

    if ($currValue -eq $prevValue) {
        return 'SAME'
    }

    if ($currValue -lt $prevValue) {
        return 'UP'
    }

    return 'DOWN'
}

function Compare-BudgetTrend {
    param([string]$Current, [string]$Previous)

    if ([string]::IsNullOrWhiteSpace($Previous)) {
        return 'N/A'
    }

    if ($Current -eq $Previous) {
        return 'SAME'
    }

    if ($Current -eq 'PASS' -and $Previous -ne 'PASS') {
        return 'UP'
    }

    if ($Current -ne 'PASS' -and $Previous -eq 'PASS') {
        return 'DOWN'
    }

    return 'MIX'
}

$checks = @(
    @{ Name = 'Multi Env'; Command = 'npm run health:multi:strict'; Critical = $true },
    @{ Name = 'Web Build'; Command = 'npm run build'; Critical = $true },
    @{ Name = 'Unit Tests'; Command = 'npm run test -- --run'; Critical = $true },
    @{ Name = 'Coverage'; Command = 'npm run test:coverage -- --run'; Critical = $true },
    @{ Name = 'Lint'; Command = 'npm run lint'; Critical = $true },
    @{ Name = 'Prod Audit'; Command = 'npm audit --omit=dev --registry=https://registry.npmjs.org'; Critical = $true },
    @{ Name = 'Electron Smoke'; Command = 'npm run electron:smoke'; Critical = $true },
    @{ Name = 'Bundle Analyze'; Command = 'npm run bundle:analyze'; Critical = $false },
    @{ Name = 'Bundle Budget'; Command = 'npm run bundle:budget'; Critical = $false }
)

$results = @()

foreach ($check in $checks) {
    Write-Host ("`n=== Running: " + $check.Name + " ===") -ForegroundColor Cyan

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $output = cmd /c $check.Command 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    $sw.Stop()

    $status = if ($exitCode -eq 0) { 'PASS' } else { 'FAIL' }

    $results += [PSCustomObject]@{
        Name = $check.Name
        Command = $check.Command
        Critical = $check.Critical
        Status = $status
        ExitCode = $exitCode
        DurationSec = [math]::Round($sw.Elapsed.TotalSeconds, 2)
        Output = $output.Trim()
    }
}

$criticalFailed = ($results | Where-Object { $_.Critical -and $_.Status -eq 'FAIL' }).Count
$overall = if ($criticalFailed -eq 0) { 'HEALTHY' } else { 'DEGRADED' }

$md = @()
$md += '# Autonomous Health Snapshot'
$md += ''
$md += ('- Generated At: ' + $timestamp)
$md += ('- Overall: ' + $overall)
$md += ('- Critical Failures: ' + $criticalFailed)
$md += ''

$recentRuns = @()
$recentRuns += [PSCustomObject]@{
    GeneratedAt = $timestamp
    Overall = $overall
    CriticalFailures = $criticalFailed
    BundleBudget = ($results | Where-Object { $_.Name -eq 'Bundle Budget' } | Select-Object -First 1).Status
    Source = 'current-run'
}

$historyFiles = @()
if (Test-Path $historyDir) {
    $historyFiles = Get-ChildItem -Path $historyDir -Filter 'AUTONOMOUS_HEALTH_SNAPSHOT_*.md' | Sort-Object Name -Descending
}

foreach ($file in $historyFiles) {
    if ($recentRuns.Count -ge 3) {
        break
    }

    $parsed = Parse-HealthSnapshot -Path $file.FullName
    if ($null -ne $parsed -and $parsed.GeneratedAt) {
        $recentRuns += $parsed
    }
}

$md += '## Recent Runs (Last 3)'
$md += ''
$md += '| Run | Generated At | Overall | Overall Delta | Critical Failures | Critical Delta | Bundle Budget | Budget Delta | Source |'
$md += '|---:|---|---|---|---:|---|---|---|---|'

$index = 1
foreach ($run in $recentRuns) {
    $previousRun = $null
    if ($index -lt $recentRuns.Count) {
        $previousRun = $recentRuns[$index]
    }

    $critical = if ([string]::IsNullOrWhiteSpace([string]$run.CriticalFailures)) { 'N/A' } else { [string]$run.CriticalFailures }
    $budget = if ([string]::IsNullOrWhiteSpace([string]$run.BundleBudget)) { 'N/A' } else { [string]$run.BundleBudget }

    $prevOverall = if ($null -ne $previousRun) { [string]$previousRun.Overall } else { '' }
    $prevCritical = if ($null -ne $previousRun) { [string]$previousRun.CriticalFailures } else { '' }
    $prevBudget = if ($null -ne $previousRun) { [string]$previousRun.BundleBudget } else { '' }

    $overallTrend = Compare-OverallTrend -Current ([string]$run.Overall) -Previous $prevOverall
    $criticalTrend = Compare-CriticalTrend -Current $critical -Previous $prevCritical
    $budgetTrend = Compare-BudgetTrend -Current $budget -Previous $prevBudget

    $md += ('| ' + $index + ' | ' + $run.GeneratedAt + ' | ' + $run.Overall + ' | ' + $overallTrend + ' | ' + $critical + ' | ' + $criticalTrend + ' | ' + $budget + ' | ' + $budgetTrend + ' | ' + $run.Source + ' |')
    $index += 1
}

$md += ''
$md += '| Check | Status | Critical | Duration(s) | Exit |'
$md += '|---|---|---|---:|---:|'

foreach ($r in $results) {
    $criticalText = 'No'
    if ($r.Critical) {
        $criticalText = 'Yes'
    }
    $md += ('| ' + $r.Name + ' | ' + $r.Status + ' | ' + $criticalText + ' | ' + $r.DurationSec + ' | ' + $r.ExitCode + ' |')
}

$md += ''
$md += '## Slowest Checks (Top 3)'
$md += ''
$md += '| Rank | Check | Duration(s) | Status | Critical |'
$md += '|---:|---|---:|---|---|'

$slowest = $results | Sort-Object DurationSec -Descending | Select-Object -First 3
$rank = 1
foreach ($item in $slowest) {
    $criticalText = if ($item.Critical) { 'Yes' } else { 'No' }
    $md += ('| ' + $rank + ' | ' + $item.Name + ' | ' + $item.DurationSec + ' | ' + $item.Status + ' | ' + $criticalText + ' |')
    $rank += 1
}

$md += ''
$md += '## Command Details'

foreach ($r in $results) {
    $md += ''
    $md += ('### ' + $r.Name)
    $md += ('- Command: `' + $r.Command + '`')
    $md += ('- Result: ' + $r.Status)
    $md += ('- Duration: ' + $r.DurationSec + 's')
    $md += ''
    $md += '```text'
    $md += $r.Output
    $md += '```'
}

Set-Content -Path $reportPath -Value ($md -join "`r`n") -Encoding UTF8
Set-Content -Path $historyPath -Value ($md -join "`r`n") -Encoding UTF8

Write-Host ("`nReport written: " + $reportPath) -ForegroundColor Green
Write-Host ("Report archived: " + $historyPath) -ForegroundColor Green

if ($criticalFailed -gt 0) {
    exit 1
}
