#!/usr/bin/env pwsh
# Copies all files in this workspace to a sister directory named maplarge-ai-plugins.
# The destination is created if missing; existing files are overwritten.
# Excludes .git so the sister repo's history is never clobbered.

$ErrorActionPreference = "Stop"

$sourceDir = $PSScriptRoot
$destDir = Join-Path (Split-Path $sourceDir -Parent) "maplarge-ai-plugins"

# Directories to skip anywhere in the tree
$excludeDirs = @(".git", "node_modules")

Write-Host "Source:      $sourceDir" -ForegroundColor Cyan
Write-Host "Destination: $destDir" -ForegroundColor Cyan

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
    Write-Host "Created destination directory." -ForegroundColor Yellow
}

$copied = 0
Get-ChildItem -Path $sourceDir -Recurse -File -Force | ForEach-Object {
    $relative = [System.IO.Path]::GetRelativePath($sourceDir, $_.FullName)

    # Skip files under any excluded directory
    $segments = $relative -split '[\\/]'
    foreach ($dir in $excludeDirs) {
        if ($segments -contains $dir) { return }
    }

    $target = Join-Path $destDir $relative
    $targetParent = Split-Path $target -Parent
    if (-not (Test-Path $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    }

    Copy-Item -Path $_.FullName -Destination $target -Force
    $copied++
}

Write-Host "Copied $copied file(s) to $destDir" -ForegroundColor Green
