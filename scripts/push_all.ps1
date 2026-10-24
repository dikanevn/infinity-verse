param(
    [string]$Msg = "auto sync infinity-verse and private submodules"
)

$ErrorActionPreference = "Stop"

# Обновляем PATH из системных и пользовательских переменных окружения, если процесс был запущен до установки
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 1. Если есть изменения в .private, коммитим и пушим
if (Test-Path ".private") {
    $privateStatus = git -C .private status --porcelain
    if ($privateStatus) {
        Write-Host "--- Syncing .private repository ---" -ForegroundColor Cyan
        git -C .private add -A
        git -C .private commit -m $Msg
        git -C .private push origin main
    } else {
        Write-Host "--- .private repository is up to date ---" -ForegroundColor Green
    }
}

# 2. Коммитим и пушим основной репозиторий
$mainStatus = git status --porcelain
if ($mainStatus) {
    Write-Host "--- Syncing main repository ---" -ForegroundColor Cyan
    git add -A
    git commit -m $Msg
    git push origin main
} else {
    Write-Host "--- Main repository is up to date ---" -ForegroundColor Green
}

Write-Host "=== All repositories successfully pushed! ===" -ForegroundColor Green
