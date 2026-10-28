// scripts/make_aaa_2.js
const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_1.sol');
const dstPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_2.sol');

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Заменяем объявление контракта
content = content.replace(
  'contract InfinityVerse_Gb_AAA_1 {',
  `contract InfinityVerse_Gb_AAA_2 {`
);

content = content.replace(
  'string public constant VERSION = "0.0.0.0.1-GB-AAA-1";',
  `string public constant VERSION = "0.0.0.0.1-GB-AAA-2";`
);

// 2. Добавляем константы для майнинга после PREFIX_AUTH
const authTarget = 'bytes4 private constant PREFIX_AUTH = 0x41555448; // "AUTH"';
const authReplacement = `${authTarget}

    // Универсальный ключ в памяти Main_Gb_1 для хранения времени последнего майнинга
    bytes32 public constant LAST_MINED_KEY = keccak256("INFINITY_VERSE.LAST_MINED_AT");

    // Параметры эмиссии в стиле Биткоина (50 токенов за 600 секунд)
    uint256 public constant BTC_BLOCK_REWARD = 50 ether;
    uint256 public constant BTC_BLOCK_TIME = 600; // 10 минут`;

content = content.replace(authTarget, authReplacement);

// 3. Добавляем view-функцию перед getCellKey
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

// 4. Заменяем логику _handleCellInteraction для сбора звезды (OBJECT_STAR)
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

const newInteraction = `        // Если наступили на Квантовую субстанцию ($INFER) — ончейн-майнинг по модели Биткоина
        if (objectType == OBJECT_STAR) {
            // 1. Очищаем клетку от субстанции (возвращаем в чистое состояние)
            bytes32 clearedCell;
            assembly {
                clearedCell := and(
                    cellVal,
                    0xFF0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                )
            }
            mainContract.writeSector(cellKey, clearedCell);

            // 2. Считываем время последнего майнинга из памяти Main_Gb_1
            bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
            uint256 lastMined = uint256(rawLastMined);
            uint256 deltaT;
            if (lastMined == 0) {
                deltaT = 12; // Стартовый сбор при инициализации (12 сек = 1 токен)
            } else if (block.timestamp > lastMined) {
                deltaT = block.timestamp - lastMined;
            } else {
                deltaT = 1;
            }

            // 3. Формула Биткоина: 50 INFER за каждые 600 секунд (10 минут)
            uint256 totalReward = (deltaT * BTC_BLOCK_REWARD) / BTC_BLOCK_TIME;

            // 4. Обновляем время последнего майнинга в памяти Main_Gb_1
            mainContract.writeSector(LAST_MINED_KEY, bytes32(block.timestamp));

            // 5. Минтим заработанную награду игроку
            if (address(starToken) != address(0) && totalReward > 0) {
                try starToken.mint(player, totalReward) {} catch {}
            }
            emit StarCollected(player, targetX, targetY, totalReward);
        }`;

content = content.replace(oldInteraction, newInteraction);

// 5. Заменяем _maybeDropStar: убираем разные веса (weight = 1 всегда)
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

        // Единый вес: 1 (без жирных вариантов)
        uint8 weight = 1;
        bytes32 starCell;
        assembly {
            // [terrainType: 1B][OBJECT_STAR(3): 1B][weight(1): 1B][reserved(0): 1B]
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(232, 1)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, weight);`;

content = content.replace(oldDrop, newDrop);

fs.writeFileSync(dstPath, content, 'utf8');
console.log('Successfully regenerated InfinityVerse_Gb_AAA_2.sol!');
