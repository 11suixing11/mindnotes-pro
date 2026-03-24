param(
    [switch]$Strict
)

$ErrorActionPreference = 'Stop'

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$results = @()

$results += [PSCustomObject]@{
    Item = 'Node.js'
    Status = if (Test-Command 'node') { 'OK' } else { 'MISSING' }
    Detail = if (Test-Command 'node') { (node --version) } else { 'Install Node.js 18+' }
}

$results += [PSCustomObject]@{
    Item = 'npm'
    Status = if (Test-Command 'npm') { 'OK' } else { 'MISSING' }
    Detail = if (Test-Command 'npm') { (npm --version) } else { 'Install npm 9+' }
}

$javaInPath = Test-Command 'java'
$javaHomeSet = -not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)
$javaStatus = if ($javaInPath -or $javaHomeSet) { 'OK' } else { 'MISSING' }
$javaDetail = if ($javaInPath) { (java -version 2>&1 | Select-Object -First 1) } elseif ($javaHomeSet) { "JAVA_HOME=$($env:JAVA_HOME)" } else { 'Set JAVA_HOME and ensure java is in PATH' }
$results += [PSCustomObject]@{ Item = 'Java / JAVA_HOME'; Status = $javaStatus; Detail = $javaDetail }

$cargoInPath = Test-Command 'cargo'
$results += [PSCustomObject]@{
    Item = 'Rust cargo'
    Status = if ($cargoInPath) { 'OK' } else { 'MISSING' }
    Detail = if ($cargoInPath) { (cargo --version) } else { 'Install Rust toolchain (rustup)' }
}

$results += [PSCustomObject]@{
    Item = 'Android project dir'
    Status = if (Test-Path 'android') { 'OK' } else { 'MISSING' }
    Detail = 'android/'
}

$results += [PSCustomObject]@{
    Item = 'Tauri project dir'
    Status = if (Test-Path 'src-tauri') { 'OK' } else { 'MISSING' }
    Detail = 'src-tauri/'
}

Write-Host ''
Write-Host '=== Multi-platform Environment Health ===' -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host

$missingCount = ($results | Where-Object { $_.Status -eq 'MISSING' }).Count
if ($missingCount -gt 0) {
    Write-Host "Detected $missingCount missing requirements." -ForegroundColor Yellow
    if ($Strict) {
        exit 1
    }
} else {
    Write-Host 'All required environment checks passed.' -ForegroundColor Green
}
