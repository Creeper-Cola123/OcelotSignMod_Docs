# start.ps1 — 一键启动 Ocelot Sign Mod Wiki 本地服务器
# 用法: 右键 → "使用 PowerShell 运行"，或双击 start.bat

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot

# 检测 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[ERROR] Node.js 未安装或不在 PATH 中。" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Cyan
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host "正在启动本地服务器..." -ForegroundColor Green
Set-Location $scriptRoot
node serve.js
