// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_4
 * @notice Шаг 1: Фундамент. Структурная сетка 3х3 (Cell Architecture).
 *
 * Мы строим автономный мир с расчётом на миллионы лет вперёд.
 * Каждая клетка поля — это расширяемая структура Cell:
 * 4 байта (4 шт uint8), упакованных без потерь.
 * В одном слоте памяти EVM (32 байта) ровно помещается 8 таких клеток (32 / 4 = 8).
 *
 * Вся сетка 3х3 (9 клеток):
 * [0] [1] [2]
 * [3] [4] [5]
 * [6] [7] [8]
 *
 * Каждая клетка содержит:
 * - terrain:  тип местности (0..255: пустота, земля, лава, скала, вода...)
 * - object:   сущность/предмет (0..255: пусто, звезда, сундук, моб...)
 * - state:    состояние/прочность/таймер (0..255)
 * - reserved: резерв под будущие эпохи (0..255)
 */
contract InfinityVerse_V_0_0_0_0_4 {
    // Версия этого смарт-контракта
    string public constant VERSION = "0.0.0.0.4";

    // Ширина сетки: 3 клетки
    uint8 public constant GRID_WIDTH = 3;
    // Всего клеток на поле: 3 умножить на 3 = 9 клеток
    uint8 public constant TOTAL_CELLS = 9;

    /**
     * @dev Структура одной клетки мира (ровно 4 байта).
     */
    struct Cell {
        uint8 terrain; // Тип ландшафта (0..255)
        uint8 object; // Объект на клетке (0..255)
        uint8 state; // Состояние / флаги / прочность (0..255)
        uint8 reserved; // Запас под расширение логики на века (0..255)
    }

    // Сетка поля 3х3: 9 клеток (занимает ровно 36 байт, 2 слота storage в EVM)
    Cell[TOTAL_CELLS] public grid;

    /**
     * @notice Получить данные конкретной клетки по индексу (0..8)
     */
    function getCell(uint8 cellIndex) external view returns (Cell memory) {
        require(cellIndex < TOTAL_CELLS, "Invalid cellIndex");
        return grid[cellIndex];
    }

    /**
     * @notice Получить всю сетку 3х3 целиком за один вызов
     */
    function getAllCells() external view returns (Cell[TOTAL_CELLS] memory) {
        return grid;
    }
}
