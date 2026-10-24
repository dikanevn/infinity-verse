// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_2
 * @notice Полностью он-чейн Вселенная (Autonomous World) с горизонтом жизни на миллионы лет.
 * 
 * Версия: 0.0.0.0.2
 * 
 * Архитектурные особенности этой версии:
 * 1. Идентификация игроков напрямую через их адрес кошелька (address), без порядковых номеров.
 * 2. Ровно 1 звезда на поле (индекс 0..8).
 * 3. Нативная он-чейн энтропия для случайного спавна:
 *    prevrandao (консенсус валидаторов) + timestamp + number блока + локальный nonce + адрес игрока.
 * 4. Мгновенный респавн звезды при подборе (Вариант А).
 * 5. Он-чейн баланс собранных звёзд для каждого адреса.
 */
contract InfinityVerse_V_0_0_0_0_2 {
    // 5-разрядная версия смарт-контракта
    string public constant VERSION = "0.0.0.0.2";

    // Размерность сетки первого поколения (3x3 = 9 клеток)
    uint8 public constant GRID_WIDTH = 3;
    uint8 public constant TOTAL_CELLS = 9;

    // Игровое поле: индекс клетки (0..8) => адрес игрока (address(0) означает, что клетка пустая)
    address[TOTAL_CELLS] public grid;

    // Текущая клетка со звездой: 0..8 (или -1, если звезды на поле временно нет)
    int8 public starCell = -1;

    // Счётчик-соль для обеспечения уникальности псевдослучайных чисел внутри одного блока
    uint256 private entropyNonce;

    // Данные игроков
    mapping(address => uint8) public playerPosition; // Текущая клетка игрока (0..8)
    mapping(address => bool) public isSpawned;        // Спавнился ли уже игрок в этом мире
    mapping(address => uint256) public starBalance;  // Баланс собранных звёзд игрока

    // События (логируются в блокчейне для фронтенда и индексаторов)
    event PlayerSpawned(address indexed player, uint8 cell);
    event PlayerMoved(address indexed player, uint8 fromCell, uint8 toCell);
    event StarSpawned(uint8 cell);
    event StarCollected(address indexed player, uint8 cell, uint256 newBalance);

    constructor() {
        // При деплое мира сразу создаём первую случайную звезду на пустом поле
        _spawnStar();
    }

    /**
     * @notice Получить всё состояние поля (все 9 клеток) за один RPC-запрос
     * @return Массив из 9 адресов (пустые клетки возвращают 0x000...000)
     */
    function getGrid() external view returns (address[TOTAL_CELLS] memory) {
        return grid;
    }

    /**
     * @notice Проверка ортогонального соседства двух клеток (вверх, вниз, влево, вправо)
     * Диагональные ходы запрещены (манхэттенское расстояние должно быть строго равно 1).
     */
    function isAdjacent(uint8 fromCell, uint8 toCell) public pure returns (bool) {
        if (fromCell >= TOTAL_CELLS || toCell >= TOTAL_CELLS) return false;

        uint8 fromX = fromCell % GRID_WIDTH;
        uint8 fromY = fromCell / GRID_WIDTH;
        uint8 toX = toCell % GRID_WIDTH;
        uint8 toY = toCell / GRID_WIDTH;

        int8 dx = int8(fromX) - int8(toX);
        int8 dy = int8(fromY) - int8(toY);

        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        return (dx + dy == 1);
    }

    /**
     * @notice Внутренняя функция генерации новой случайной звезды на пустой клетке поля
     */
    function _spawnStar() internal {
        uint8[TOTAL_CELLS] memory emptyCells;
        uint8 emptyCount = 0;

        // 1. Находим все клетки, где сейчас НЕТ игроков
        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            if (grid[i] == address(0)) {
                emptyCells[emptyCount] = i;
                emptyCount++;
            }
        }

        // 2. Если есть свободные клетки — вычисляем псевдослучайную клетку
        if (emptyCount > 0) {
            entropyNonce++;
            uint256 rand = uint256(
                keccak256(
                    abi.encodePacked(
                        block.prevrandao,  // Случайность консенсуса валидаторов сети
                        block.timestamp,   // Время создания блока
                        block.number,      // Номер блока
                        entropyNonce,      // Счётчик-соль транзакции
                        msg.sender         // Адрес инициатора
                    )
                )
            );
            uint8 selectedIndex = uint8(rand % emptyCount);
            starCell = int8(emptyCells[selectedIndex]);
            emit StarSpawned(uint8(starCell));
        } else {
            // Если всё поле заполнено игроками — звезда временно ждёт освобождения места
            starCell = -1;
        }
    }

    /**
     * @notice Первичное появление (спавн) игрока в выбранную клетку
     * @param targetCell Индекс клетки (0..8)
     */
    function spawn(uint8 targetCell) public {
        require(targetCell < TOTAL_CELLS, unicode"Неверный номер клетки");
        require(grid[targetCell] == address(0), unicode"Клетка уже занята другим игроком");
        require(!isSpawned[msg.sender], unicode"Вы уже появились в этом мире");

        grid[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;
        isSpawned[msg.sender] = true;

        emit PlayerSpawned(msg.sender, targetCell);

        // Если игрок заспавнился прямо на клетку со звездой — подбираем её
        if (starCell == int8(targetCell)) {
            starBalance[msg.sender] += 1;
            emit StarCollected(msg.sender, targetCell, starBalance[msg.sender]);
            _spawnStar();
        } else if (starCell == -1) {
            _spawnStar();
        }
    }

    /**
     * @notice Перемещение игрока в соседнюю клетку
     * @param targetCell Индекс целевой клетки (0..8)
     */
    function move(uint8 targetCell) external {
        require(targetCell < TOTAL_CELLS, unicode"Неверный номер клетки");

        // Если игрок ещё не спавнился — первый вызов move() работает как авто-спавн
        if (!isSpawned[msg.sender]) {
            spawn(targetCell);
            return;
        }

        uint8 currentCell = playerPosition[msg.sender];
        require(currentCell != targetCell, unicode"Вы уже находитесь в этой клетке");
        require(isAdjacent(currentCell, targetCell), unicode"Ход возможен только в соседнюю клетку");
        require(grid[targetCell] == address(0), unicode"Целевая клетка занята");

        // 1. Освобождаем старую клетку и занимаем новую
        grid[currentCell] = address(0);
        grid[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;

        emit PlayerMoved(msg.sender, currentCell, targetCell);

        // 2. Механика звезды: если шагнули на звезду, начисляем очко и сразу респавним новую
        if (starCell == int8(targetCell)) {
            starBalance[msg.sender] += 1;
            emit StarCollected(msg.sender, targetCell, starBalance[msg.sender]);
            _spawnStar();
        }
    }
}
