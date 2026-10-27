param(
    [string]$Msg = "auto sync infinity-verse and private submodules"
)

$ErrorActionPreference = "Stop"

# Обновляем PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Запрещаем любые интерактивные окна и GUI/терминальные промпты Git, чтобы ничего не зависало
$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

# Извлекаем GITHUB_TOKEN для мгновенного и надежного пуша:
# 1. Из .private/wallets.env (если есть)
# 2. Из ..\.env (папкой выше: C:\Users\dikan\projects\.env)
$token = ""
if (Test-Path ".private\wallets.env") {
    $line = Get-Content ".private\wallets.env" | Where-Object { $_ -match "^GITHUB_TOKEN=(.+)$" }
    if ($line) {
        $token = ($line -replace "^GITHUB_TOKEN=", "").Trim()
    }
}
if (-not $token -and (Test-Path "..\.env")) {
    $raw = (Get-Content "..\.env" -Raw).Trim()
    if ($raw -match "ghp_[A-Za-z0-9]+") {
        $token = $matches[0]
    } else {
        $token = $raw
    }
}

# 1. Если есть изменения в .private, коммитим и пушим
if (Test-Path ".private") {
    $privateStatus = git -C .private status --porcelain
    if ($privateStatus) {
        Write-Host "--- Syncing .private repository ---" -ForegroundColor Cyan
        git -C .private add -A
        git -C .private commit -m $Msg
        if ($token) {
            git -C .private push "https://${token}@github.com/dikanevn/infinity-verse-private.git" main
        } else {
            git -C .private push origin main
        }
    } else {
        # Если незакоммиченных нет, но есть неотправленные коммиты
        $ahead = git -C .private rev-list --count origin/main..main 2>$null
        if ($ahead -and [int]$ahead -gt 0) {
            Write-Host "--- Pushing unpushed commits in .private ($ahead ahead) ---" -ForegroundColor Cyan
            if ($token) {
                git -C .private push "https://${token}@github.com/dikanevn/infinity-verse-private.git" main
            } else {
                git -C .private push origin main
            }
        } else {
            Write-Host "--- .private repository is up to date ---" -ForegroundColor Green
        }
    }
}

# 2. Коммитим и пушим основной репозиторий
$mainStatus = git status --porcelain
if ($mainStatus) {
    Write-Host "--- Syncing main repository ---" -ForegroundColor Cyan
    git add -A
    git commit -m $Msg
    if ($token) {
        git push "https://${token}@github.com/dikanevn/infinity-verse.git" main
    } else {
        git push origin main
    }
} else {
    $ahead = git rev-list --count origin/main..main 2>$null
    if ($ahead -and [int]$ahead -gt 0) {
        Write-Host "--- Pushing unpushed commits in main ($ahead ahead) ---" -ForegroundColor Cyan
        if ($token) {
            git push "https://${token}@github.com/dikanevn/infinity-verse.git" HEAD:refs/heads/main
        } else {
            git push origin HEAD:refs/heads/main
        }
    } else {
        Write-Host "--- Main repository is up to date ---" -ForegroundColor Green
    }
}

Write-Host "=== All repositories successfully pushed! ===" -ForegroundColor Green
