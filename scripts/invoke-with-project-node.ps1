[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Command,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ErrorActionPreference = "Stop"

function Get-ProjectNodeVersion {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  foreach ($candidate in @(".nvmrc", ".node-version")) {
    $versionFile = Join-Path $RootPath $candidate
    if (Test-Path $versionFile) {
      $version = (Get-Content $versionFile -Raw).Trim()
      if ($version) {
        return $version
      }
    }
  }

  throw "Unable to find .nvmrc or .node-version in $RootPath."
}

function Get-NvmRoot {
  if ($env:NVM_HOME -and (Test-Path $env:NVM_HOME)) {
    return $env:NVM_HOME
  }

  $nvmCommand = Get-Command nvm.exe -ErrorAction SilentlyContinue
  if ($nvmCommand) {
    return Split-Path -Parent $nvmCommand.Source
  }

  throw "Unable to resolve nvm installation path. Set NVM_HOME or make nvm.exe available in PATH."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nodeVersion = Get-ProjectNodeVersion -RootPath $repoRoot
if (-not $nodeVersion.StartsWith("v")) {
  $nodeVersion = "v$nodeVersion"
}

$nvmRoot = Get-NvmRoot
$nodeDir = Join-Path $nvmRoot $nodeVersion
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCmd = Join-Path $nodeDir "npm.cmd"
$npxCmd = Join-Path $nodeDir "npx.cmd"

if (-not (Test-Path $nodeExe)) {
  throw "Node executable not found for version $nodeVersion in $nodeDir."
}

$env:Path = "$nodeDir;$env:Path"

$resolvedCommand = switch ($Command.ToLowerInvariant()) {
  "node" { $nodeExe; break }
  "npm"  { $npmCmd; break }
  "npx"  { $npxCmd; break }
  default {
    $commandInfo = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $commandInfo) {
      throw "Command '$Command' was not found after adding $nodeDir to PATH."
    }
    $commandInfo.Source
  }
}

$nodeVersionOutput = & $nodeExe -v
$npmVersionOutput = & $npmCmd -v

Write-Host "node $nodeVersionOutput"
Write-Host "npm $npmVersionOutput"
Write-Host "exec $Command $($Arguments -join ' ')"

& $resolvedCommand @Arguments
$exitCode = $LASTEXITCODE

if ($null -ne $exitCode -and $exitCode -ne 0) {
  exit $exitCode
}
