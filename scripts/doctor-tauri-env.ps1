$ErrorActionPreference = 'Stop'

function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host '=== Tauri Environment Doctor ===' -ForegroundColor Cyan

$cargoOk = Test-Command 'cargo'
$rustupOk = Test-Command 'rustup'

if ($cargoOk) {
    Write-Host ('[OK] cargo: ' + (cargo --version)) -ForegroundColor Green
} else {
    Write-Host '[MISSING] cargo command not found' -ForegroundColor Yellow
}

if ($rustupOk) {
    Write-Host ('[OK] rustup: ' + (rustup --version)) -ForegroundColor Green
} else {
    Write-Host '[MISSING] rustup command not found' -ForegroundColor Yellow
}

$tauriDir = Test-Path 'src-tauri'
if ($tauriDir) {
    Write-Host '[OK] src-tauri directory exists' -ForegroundColor Green
} else {
    Write-Host '[MISSING] src-tauri directory not found' -ForegroundColor Red
}

Write-Host ''
Write-Host 'Recommended fix steps:' -ForegroundColor Cyan
Write-Host '1) Install Rust via rustup (stable toolchain).' 
Write-Host '2) Open a new terminal and verify: cargo --version'
Write-Host '3) Run: cd src-tauri; cargo check'

if (-not $cargoOk) {
    exit 1
}
