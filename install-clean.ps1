$ErrorActionPreference = "Stop"

Write-Host "Stopping any local Node processes that may lock node_modules..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

npm config set registry https://registry.npmjs.org/

if (Test-Path .\node_modules) {
  Write-Host "Removing old node_modules..." -ForegroundColor Cyan
  Remove-Item .\node_modules -Recurse -Force
}

Write-Host "Installing Bite2Eat dependencies from the public npm registry..." -ForegroundColor Cyan
npm install

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npm run db:generate

Write-Host "Installation complete." -ForegroundColor Green
