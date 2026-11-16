param(
  [Parameter(Mandatory=$true)][ValidateSet('install','uninstall')][string]$Action,
  [Parameter(Mandatory=$true)][string]$Executable,
  [Parameter(Mandatory=$true)][string]$InstallDirectory
)
$ErrorActionPreference = 'Stop'
$testRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
$resolvedInstall = [System.IO.Path]::GetFullPath($InstallDirectory).TrimEnd('\')
if (-not $resolvedInstall.StartsWith($testRoot, [StringComparison]::OrdinalIgnoreCase) -or
    -not [System.IO.Path]::GetFileName($resolvedInstall).StartsWith('mindnotes-install-acceptance-')) {
  throw 'The installer target must be the isolated MindNotes test directory.'
}
$resolvedExecutable = (Resolve-Path -LiteralPath $Executable).Path
if ($Action -eq 'install') {
  $arguments = @('/S', ('/D=' + $resolvedInstall))
} else {
  if (-not $resolvedExecutable.StartsWith($resolvedInstall + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to uninstall outside the verified test installation.'
  }
  $arguments = @('/S')
}
$installer = Start-Process -FilePath $resolvedExecutable -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
if ($installer.ExitCode -ne 0) { throw "Installer action failed: $($installer.ExitCode)" }
@{ action=$Action; executable=$resolvedExecutable; installDirectory=$resolvedInstall; exitCode=$installer.ExitCode } | ConvertTo-Json -Compress
