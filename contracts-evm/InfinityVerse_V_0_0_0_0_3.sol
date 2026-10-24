// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_3
 * @notice Шаг 1: Фундамент сетки на битовой маске (Bitpacked Grid).
 * 
 * Версия: 0.0.0.0.3
 * 
 * Суть архитектуры этого шага:
 * Вместо массива из 9 ячеек мы храним всё состояние сетки в ОДНОМ целом числе: uint256 public gridMask.
 * 
 * Как работают биты:
 * Клетка #0 -> бит 0 (значение 1 << 0)
 * Клетка #1 -> бит 1 (значение 1 << 1)
 * ...
 * Клетка #8 -> бит 8 (значение 1 << 8)
 * 
 * Если бит равен 1 -> клетка занята.
 * Если бит равен 0 -> клетка свободна.
 * 
 * Чтение или изменение сетки теперь стоит ровно 1 операцию с хранилищем (SSTORE/SLOAD),
 * что дает максимальную дешевизну газа и масштабируемость на миллионы лет.
 */
contract InfinityVerse_V_0_0_0_0_3 {
    // Версия смарт-контракта
    string public constant VERSION = "0.0.0.0.3";

    // Константы размера поля
    uint8 public constant GRID_WIDTH = 3;
    uint8 public constant TOTAL_CELLS = 9;

    // Вся сетка 3x3 хранится в битах 0..8 этого одного числа!
    // 0 = все 9 клеток свободны (двоичное: 000000000)
    uint256 public gridMask;

    // Кто занимает клетки: для отображения на фронтенде
    // индекс клетки (0..8) => адрес игрока
    mapping(uint8 => address) public cellOccupant;

    // Позиция каждого игрока
    mapping(address => uint8) public playerPosition;
    mapping(address => bool) public isSpawned;

    // События
    event PlayerSpawned(address indexed player, uint8 cell, uint256 newGridMask);
    event PlayerMoved(address indexed player, uint8 fromCell, uint8 toCell, uint256 newGridMask);

    /**
     * @notice Проверка: свободна ли клетка по битовой маске
     * @param cell Индекс клетки (0..8)
     */
    function isCellFree(uint8 cell) public view returns (bool) {
        require(cell < TOTAL_CELLS, unicode"Неверный номер клетки");
        // Сдвигаем маску вправо на cell бит и смотрим самый младший бит:
        // Если (gridMask >> cell) & 1 == 0, значит бит нулевой (клетка свободна)
        return ((gridMask >> cell) & 1) == 0;
    }

    /**
     * @notice Получить всю маску сетки (число от 0 до 511)
     */
    function getGridMask() external view returns (uint256) {
        return gridMask;
    }

    /**
     * @notice Получить массив адресов игроков во всех 9 клетках для фронтенда
     */
    function getGrid() external view returns (address[TOTAL_CELLS] memory cells) {
        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            cells[i] = cellOccupant[i];
        }
    }

    /**
     * @notice Проверка ортогонального соседства (вверх, вниз, влево, вправо)
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
     * @notice Первичное появление (спавн) в клетку
     */
    function spawn(uint8 targetCell) public {
        require(targetCell < TOTAL_CELLS, unicode"Неверный номер клетки");
        require(!isSpawned[msg.sender], unicode"Вы уже появились в этом мире");
        require(isCellFree(targetCell), unicode"Клетка уже занята");

        // Побитовая установка: ставим 1 в бит targetCell с помощью побитового ИЛИ (|)
        gridMask |= (1 << targetCell);

        cellOccupant[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;
        isSpawned[msg.sender] = true;

        emit PlayerSpawned(msg.sender, targetCell, gridMask);
    }

    /**
     * @notice Перемещение в соседнюю клетку через битовые операции
     */
    function move(uint8 targetCell) external {
        require(targetCell < TOTAL_CELLS, unicode"Неверный номер клетки");

        // Авто-спавн при первом вызове
        if (!isSpawned[msg.sender]) {
            spawn(targetCell);
            return;
        }

        uint8 currentCell = playerPosition[msg.sender];
        require(currentCell != targetCell, unicode"Вы уже в этой клетке");
        require(isAdjacent(currentCell, targetCell), unicode"Ход только в соседнюю клетку");
        require(isCellFree(targetCell), unicode"Целевая клетка занята");

        // АТОМАРНАЯ БИТОВАЯ ОПЕРАЦИЯ:
        // 1. ~(1 << currentCell) сбрасывает старый бит в 0 (освободили клетку)
        // 2. | (1 << targetCell) устанавливает новый бит в 1 (заняли новую клетку)
        gridMask = (gridMask & ~(1 << currentCell)) | (1 << targetCell);

        // Обновляем владельцев
        cellOccupant[currentCell] = address(0);
        cellOccupant[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;

        emit PlayerMoved(msg.sender, currentCell, targetCell, gridMask);
    }
}
