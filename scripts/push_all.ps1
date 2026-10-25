param(
    [string]$Msg = "auto sync infinity-verse and private submodules"
)

$ErrorActionPreference = "Stop"

# РћР±РЅРѕРІР»СЏРµРј PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Р—Р°РїСЂРµС‰Р°РµРј Р»СЋР±С‹Рµ РёРЅС‚РµСЂР°РєС‚РёРІРЅС‹Рµ РѕРєРЅР° Рё GUI/С‚РµСЂРјРёРЅР°Р»СЊРЅС‹Рµ РїСЂРѕРјРїС‚С‹ Git, С‡С‚РѕР±С‹ РЅРёС‡РµРіРѕ РЅРµ Р·Р°РІРёСЃР°Р»Рѕ
$env:GIT_TERMINAL_PROMPT = "0"
$env:GCM_INTERACTIVE = "never"

# РР·РІР»РµРєР°РµРј GITHUB_TOKEN РёР· .private/wallets.env (РµСЃР»Рё РµСЃС‚СЊ) РґР»СЏ РјРіРЅРѕРІРµРЅРЅРѕРіРѕ Рё РЅР°РґРµР¶РЅРѕРіРѕ РїСѓС€Р°
$token = ""
if (Test-Path ".private\wallets.env") {
    $line = Get-Content ".private\wallets.env" | Where-Object { $_ -match "^GITHUB_TOKEN=(.+)$" }
    if ($line) {
        $token = $line -replace "^GITHUB_TOKEN=", ""
        $token = $token.Trim()
    }
}

# 1. Р•СЃР»Рё РµСЃС‚СЊ РёР·РјРµРЅРµРЅРёСЏ РІ .private, РєРѕРјРјРёС‚РёРј Рё РїСѓС€РёРј
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
        # Р•СЃР»Рё РЅРµР·Р°РєРѕРјРјРёС‡РµРЅРЅС‹С… РЅРµС‚, РЅРѕ РµСЃС‚СЊ РЅРµРѕС‚РїСЂР°РІР»РµРЅРЅС‹Рµ РєРѕРјРјРёС‚С‹
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

# 2. РљРѕРјРјРёС‚РёРј Рё РїСѓС€РёРј РѕСЃРЅРѕРІРЅРѕР№ СЂРµРїРѕР·РёС‚РѕСЂРёР№
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
            git push "https://${token}@github.com/dikanevn/infinity-verse.git" main
        } else {
            git push origin main
        }
    } else {
        Write-Host "--- Main repository is up to date ---" -ForegroundColor Green
    }
}

Write-Host "=== All repositories successfully pushed! ===" -ForegroundColor Green
