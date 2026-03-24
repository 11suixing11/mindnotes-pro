$ErrorActionPreference = 'Stop'

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host '=== Electron Smoke Check ===' -ForegroundColor Cyan

$nodeOk = Test-Command 'node'
if (-not $nodeOk) {
    Write-Host '[MISSING] node command not found' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path 'electron/main.cjs')) {
    Write-Host '[MISSING] electron/main.cjs not found' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path 'electron/preload.cjs')) {
    Write-Host '[MISSING] electron/preload.cjs not found' -ForegroundColor Red
    exit 1
}

node --check electron/main.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] electron/main.cjs syntax invalid' -ForegroundColor Red
    exit $LASTEXITCODE
}

node --check electron/preload.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host '[FAIL] electron/preload.cjs syntax invalid' -ForegroundColor Red
    exit $LASTEXITCODE
}

if (-not (Test-Path 'dist/index.html')) {
    Write-Host '[WARN] dist/index.html missing, run npm run build before packaging validation' -ForegroundColor Yellow
} else {
    Write-Host '[OK] dist/index.html exists' -ForegroundColor Green
}

Write-Host '[OK] Electron smoke checks passed' -ForegroundColor Green
