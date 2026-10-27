param(
  [ValidateSet('doubao', 'claude', 'custom', 'none')]
  [string]$SkillAgent = 'doubao',

  [string]$SkillDir = '',

  [switch]$NoGlobalInstall,
  [switch]$NoSkillInstall
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillSource = Join-Path $RepoRoot 'skill'

if (-not $NoGlobalInstall) {
  Write-Host 'Installing bili-sub CLI globally with npm...' -ForegroundColor Cyan
  npm install -g $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw 'npm global install failed' }
}

if (-not $NoSkillInstall) {
  if ($SkillAgent -eq 'custom') {
    if (-not $SkillDir) { throw 'When -SkillAgent custom is used, -SkillDir must be provided.' }
    $TargetSkillDir = $SkillDir
  } elseif ($SkillAgent -eq 'doubao') {
    $TargetSkillDir = Join-Path $env:LOCALAPPDATA 'Doubao\User Data\Default\.doubao\agent_mode\workspace\.user_skills\bilibili-subtitle-watcher'
  } elseif ($SkillAgent -eq 'claude') {
    $TargetSkillDir = Join-Path $HOME '.claude\skills\bilibili-subtitle-watcher'
  } else {
    $TargetSkillDir = ''
  }

  if ($TargetSkillDir) {
    Write-Host "Installing Skill to $TargetSkillDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $TargetSkillDir -Force | Out-Null
    Copy-Item -Path (Join-Path $SkillSource '*') -Destination $TargetSkillDir -Recurse -Force
  }
}

Write-Host ''
Write-Host 'Install complete.' -ForegroundColor Green
Write-Host 'Run: bili-sub doctor'
Write-Host 'Then run: bili-sub login'
