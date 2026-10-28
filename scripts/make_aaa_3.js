// scripts/make_aaa_3.js
const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_1.sol');
const dstPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_2.sol');

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Имя контракта и версия
content = content.replace(
  'contract InfinityVerse_Gb_AAA_1 {',
  'contract InfinityVerse_Gb_AAA_2 {'
);

content = content.replace(
  'string public constant VERSION = "0.0.0.0.1-GB-AAA-1";',
  'string public constant VERSION = "0.0.0.0.1-GB-AAA-2";'
);

// 2. Структура Cell расширяется полем uint32 weight
const oldCellStruct = `    // Структура клетки (для фронтенда)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }`;

const newCellStruct = `    // Структура клетки (для фронтенда)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
        uint32 weight; // Вес квантовой субстанции (токены $INFER)
    }`;

content = content.replace(oldCellStruct, newCellStruct);

// 3. Константы Биткоина и ключ LAST_MINED_KEY
const authTarget = 'bytes4 private constant PREFIX_AUTH = 0x41555448; // "AUTH"';
const authReplacement = `${authTarget}

    // Универсальный ключ в памяти Main_Gb_1 для хранения времени последнего майнинга
    bytes32 public constant LAST_MINED_KEY = keccak256("INFINITY_VERSE.LAST_MINED_AT");

    // Параметры эмиссии в стиле Биткоина (50 токенов за 600 секунд)
    uint256 public constant BTC_BLOCK_REWARD = 50 ether;
    uint256 public constant BTC_BLOCK_TIME = 600; // 10 минут`;

content = content.replace(authTarget, authReplacement);

// 4. View функции: getCell, getCellsBatch и getCurrentMiningReward
const viewTarget = '    function getCellKey(int32 x, int32 y) public pure returns (bytes32 key) {';
const viewHelper = `    /**
     * @notice Расчет текущей накопленной награды за майнинг в стиле Биткоина
     * @return reward Количество токенов $INFER к начислению
     * @return deltaT Прошедшее время в секундах с момента последнего сбора
     * @return lastMined Время последнего успешного майнинга
     */
    function getCurrentMiningReward() external view returns (uint256 reward, uint256 deltaT, uint256 lastMined) {
        bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
        lastMined = uint256(rawLastMined);
        if (lastMined == 0) {
            deltaT = 12; // Стартовый пул (12 сек = 1 INFER)
        } else if (block.timestamp > lastMined) {
            deltaT = block.timestamp - lastMined;
        } else {
            deltaT = 1;
        }
        reward = (deltaT * BTC_BLOCK_REWARD) / BTC_BLOCK_TIME;
    }

`;

content = content.replace(viewTarget, viewHelper + viewTarget);

// 5. Заменяем getCell и getCellsBatch для распаковки weight (uint32 из байт 2..5)
const oldGetCell = `    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        return
            Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3])
            });
    }`;

const newGetCell = `    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        uint32 w;
        assembly {
            w := shr(224, shl(16, val))
        }
        return
            Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3]),
                weight: w
            });
    }`;

content = content.replace(oldGetCell, newGetCell);

const oldGetCellsBatch = `        for (uint256 i = 0; i < len; ) {
            bytes32 val = rawData[i];
            cells[i] = Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3])
            });
            unchecked {
                ++i;
            }
        }`;

const newGetCellsBatch = `        for (uint256 i = 0; i < len; ) {
            bytes32 val = rawData[i];
            uint32 w;
            assembly {
                w := shr(224, shl(16, val))
            }
            cells[i] = Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3]),
                weight: w
            });
            unchecked {
                ++i;
            }
        }`;

content = content.replace(oldGetCellsBatch, newGetCellsBatch);

// 6. Логика сбора субстанции в _handleCellInteraction:
// Извлекаем uint32 weight из байт 2..5, минтим weight * 1 ether, очищаем клетку
const oldInteraction = `        // Если наступили на Звезду — считываем её вес (state: байт 2) и минтим weight * 1 ether токенов
        if (objectType == OBJECT_STAR) {
            uint8 starWeight;
            assembly {
                starWeight := byte(2, cellVal)
            }
            uint256 weightMultiplier = starWeight > 0 ? uint256(starWeight) : 1;
            uint256 totalReward = starRewardAmount * weightMultiplier;

            bytes32 clearedCell;
            assembly {
                clearedCell := and(
                    cellVal,
                    0xFF0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                )
            }
            mainContract.writeSector(cellKey, clearedCell);

            if (address(starToken) != address(0)) {
                try starToken.mint(player, totalReward) {} catch {}
            }
            emit StarCollected(player, targetX, targetY, totalReward);
        }`;

const newInteraction = `        // Если наступили на Квантовую субстанцию — собираем накопленный в ней вес (uint32)
        if (objectType == OBJECT_STAR) {
            uint32 starWeight;
            assembly {
                // Извлекаем 4 байта веса: байты 2, 3, 4, 5
                starWeight := shr(224, shl(16, cellVal))
            }
            uint256 weightMultiplier = starWeight > 0 ? uint256(starWeight) : 1;
            uint256 totalReward = weightMultiplier * 1 ether;

            // Очищаем клетку от объекта и его веса (сбрасываем байты 1..5)
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

content = content.replace(oldInteraction, newInteraction);

// 7. Логика падения субстанции в _maybeDropStar:
// В момент материализации субстанции считаем deltaT с прошлого майнинга, рассчитываем вес в стиле Биткоина,
// записываем в Main_Gb_1 lastMinedAt = block.timestamp, и пакуем uint32 weight в клетку!
const oldDrop = `        // Вес звезды: 1 или 2 токена
        uint8 weight = (uint8(rand[3]) % 2 == 0) ? 1 : 2;

        // Квантовая субстанция не может появляться там, где игрок (dx == 0 && dy == 0)
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

        bytes32 starCell;
        assembly {
            // [terrainType: 1B][OBJECT_STAR(3): 1B][weight: 1B][reserved(0): 1B]
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(232, weight)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, weight);`;

const newDrop = `        // Квантовая субстанция не может появляться там, где игрок (dx == 0 && dy == 0)
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

        // --- РАСЧЕТ МАЙНИНГА В МОМЕНТ МАТЕРИАЛИЗАЦИИ СУБСТАНЦИИ ---
        bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
        uint256 lastMined = uint256(rawLastMined);
        uint256 deltaT;
        if (lastMined == 0) {
            deltaT = 12; // Стартовый пул (1 токен при первом рождении)
        } else if (block.timestamp > lastMined) {
            deltaT = block.timestamp - lastMined;
        } else {
            deltaT = 1;
        }

        // Расчет награды по модели Биткоина: 50 токенов за 600 секунд
        uint256 calculatedTokens = (deltaT * 50) / 600;
        if (calculatedTokens == 0) {
            calculatedTokens = 1; // Минимальный квант веса: 1 токен INFER
        }
        if (calculatedTokens > type(uint32).max) {
            calculatedTokens = type(uint32).max;
        }
        uint32 weight = uint32(calculatedTokens);

        // Обновляем время последнего майнинга в памяти Main_Gb_1
        mainContract.writeSector(LAST_MINED_KEY, bytes32(block.timestamp));

        // Пакуем: [terrainType: 1B][OBJECT_STAR(3): 1B][weight: 4B (uint32)]
        bytes32 starCell;
        assembly {
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(208, weight)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, uint8(weight > 255 ? 255 : weight));`;

content = content.replace(oldDrop, newDrop);

fs.writeFileSync(dstPath, content, 'utf8');
console.log('Successfully generated InfinityVerse_Gb_AAA_2.sol with uint32 mining weight!');
