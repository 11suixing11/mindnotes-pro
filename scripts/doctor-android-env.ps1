$ErrorActionPreference = 'Stop'

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host '=== Android Environment Doctor ===' -ForegroundColor Cyan

$javaOk = Test-Command 'java'
$javaHome = $env:JAVA_HOME
$javaHomeOk = -not [string]::IsNullOrWhiteSpace($javaHome)

if ($javaOk) {
    Write-Host ('[OK] java in PATH: ' + (java -version 2>&1 | Select-Object -First 1)) -ForegroundColor Green
} else {
    Write-Host '[MISSING] java command not found in PATH' -ForegroundColor Yellow
}

if ($javaHomeOk) {
    Write-Host ('[OK] JAVA_HOME: ' + $javaHome) -ForegroundColor Green
} else {
    Write-Host '[MISSING] JAVA_HOME not set' -ForegroundColor Yellow
}

$androidDir = Test-Path 'android'
if ($androidDir) {
    Write-Host '[OK] android directory exists' -ForegroundColor Green
} else {
    Write-Host '[MISSING] android directory not found' -ForegroundColor Red
}

Write-Host ''
Write-Host 'Recommended fix steps:' -ForegroundColor Cyan
Write-Host '1) Install JDK 21 (Temurin or Microsoft Build of OpenJDK).' 
Write-Host '2) Set JAVA_HOME to your JDK path.'
Write-Host '3) Add %JAVA_HOME%\\bin to PATH.'
Write-Host '4) Run: cd android; .\\gradlew.bat -q tasks --all'

if (-not $javaOk -or -not $javaHomeOk) {
    exit 1
}
