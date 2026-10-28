// scripts/patch_aaa_2_direct.js
const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_2.sol');
let code = fs.readFileSync(targetPath, 'utf8');

// Нормализуем переводы строк в LF
const isCRLF = code.includes('\r\n');
if (isCRLF) {
  code = code.replace(/\r\n/g, '\n');
}

// 1. Ищем и заменяем блок сбора в _handleCellInteraction
const startMarker = '        if (objectType == OBJECT_STAR) {';
const endMarker = '            emit StarCollected(player, targetX, targetY, totalReward);\n        }';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('ERROR: interaction block not found!');
  process.exit(1);
}

const replacementInteraction = `        if (objectType == OBJECT_STAR) {
            uint32 sw;
            assembly {
                // Извлекаем 4 байта secondsWeight (байты 2..5)
                sw := shr(224, shl(16, cellVal))
            }
            uint256 durationSec = sw > 0 ? uint256(sw) : 1;
            // Точный расчет в wei: 50 токенов за 600 секунд (1 сек = ~0.083333333333333333 ether)
            uint256 totalReward = (durationSec * BTC_BLOCK_REWARD) / BTC_BLOCK_TIME;

            // Очищаем клетку от субстанции и её 4 байт веса (сбрасываем байты 1..5)
            bytes32 clearedCell;
            assembly {
                clearedCell := and(
                    cellVal,
                    0xFF0000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                )
            }
            mainContract.writeSector(cellKey, clearedCell);

            if (address(starToken) != address(0) && totalReward > 0) {
                try starToken.mint(player, totalReward) {} catch {}
            }
            emit StarCollected(player, targetX, targetY, totalReward);
        }`;

code = code.slice(0, startIndex) + replacementInteraction + code.slice(endIndex + endMarker.length);

// 2. Ищем и заменяем блок появления в _maybeDropStar
const dropStartMarker = '        // Вес звезды: 1 или 2 токена';
const dropEndMarker = '        emit StarDropped(starX, starY, weight);';

const dropStartIndex = code.indexOf(dropStartMarker);
const dropEndIndex = code.indexOf(dropEndMarker, dropStartIndex);

if (dropStartIndex === -1 || dropEndIndex === -1) {
  console.error('ERROR: drop block not found!');
  process.exit(1);
}

const replacementDrop = `        // Квантовая субстанция не может появляться там, где игрок (dx == 0 && dy == 0)
        if (dx == 0 && dy == 0) return;

        bytes32 cellKey = getCellKey(starX, starY);
        bytes32 cellVal = mainContract.readSector(cellKey);

        uint8 obj;
        uint8 terr;
        assembly {
            terr := byte(0, cellVal)
            obj := byte(1, cellVal)
        }

        // Квантовая субстанция не может появляться там, где уже есть ЛЮБОЙ объект (обелиск 1, стена 2, портал 4, другая звезда 3 и т.д.)
        if (obj != 0) return;

        // Если клетки еще нет (terr == 0), генерируем песок (1)
        uint8 terrainType = terr == 0 ? 1 : terr;

        // --- РАСЧЕТ МАЙНИНГА В СЕКУНДАХ В МОМЕНТ МАТЕРИАЛИЗАЦИИ СУБСТАНЦИИ ---
        bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
        uint256 lastMined = uint256(rawLastMined);
        uint256 deltaT;
        if (lastMined == 0) {
            deltaT = 1; // Стартовый минимальный квант (1 секунда = 0.0833 INFER)
        } else if (block.timestamp > lastMined) {
            deltaT = block.timestamp - lastMined;
        } else {
            deltaT = 1; // При одном блоке минимальный квант 1 секунда
        }

        if (deltaT > type(uint32).max) {
            deltaT = type(uint32).max;
        }
        uint32 secondsWeight = uint32(deltaT);

        // Обновляем время последнего майнинга в памяти Main_Gb_1
        mainContract.writeSector(LAST_MINED_KEY, bytes32(block.timestamp));

        // Пакуем в 32 байта: [terrainType: 1B][OBJECT_STAR(3): 1B][secondsWeight: 4B (uint32)]
        bytes32 starCell;
        assembly {
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(208, secondsWeight)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, uint8(secondsWeight > 255 ? 255 : secondsWeight));`;

code = code.slice(0, dropStartIndex) + replacementDrop + code.slice(dropEndIndex + dropEndMarker.length);

if (isCRLF) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully patched InfinityVerse_Gb_AAA_2.sol directly!');
