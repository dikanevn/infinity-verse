// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_3
 * @notice Шаг 1: Фундамент. Голая сетка 3х3 на битовой маске.
 * 
 * Мы строим автономный мир с расчётом на миллионы лет вперёд.
 * Здесь нет игроков, нет позиций и нет перемещений — чистая база 3х3.
 * 
 * Как устроена сетка 3х3:
 * Поле состоит из 9 клеток с номерами от 0 до 8:
 * [0] [1] [2]
 * [3] [4] [5]
 * [6] [7] [8]
 * 
 * Вся сетка хранится всего в ОДНОМ числе — uint256 gridMask!
 * Каждый бит этого числа отвечает за одну конкретную клетку:
 * - Бит 0 = клетка 0
 * - Бит 1 = клетка 1
 * - ...
 * - Бит 8 = клетка 8
 * 
 * Значение бита:
 * 0 = клетка свободна
 * 1 = клетка занята
 */
contract InfinityVerse_V_0_0_0_0_3 {
    // Версия этого смарт-контракта
    string public constant VERSION = "0.0.0.0.3";

    // Ширина сетки: 3 клетки
    uint8 public constant GRID_WIDTH = 3;
    // Всего клеток на поле: 3 умножить на 3 = 9 клеток
    uint8 public constant TOTAL_CELLS = 9;

    // Grid 3x3 packed in bits 0..8
    // 0 = all 9 cells free (000000000)
    uint256 public gridMask;


    // Функция возвращает число всей сетки (например: 0 если пусто, 1 если занята клетка 0)
    function getGridMask() external view returns (uint256) {
        return gridMask;
    }

    // Проверка: свободна ли конкретная клетка (от 0 до 8)
    // Возвращает true если свободна, и false если занята
    function isCellFree(uint8 cell) public view returns (bool) {
        // Шаг 1: Проверяем корректность номера клетки (от 0 до 8)
        require(cell < TOTAL_CELLS, "Invalid cell");
        // Шаг 2: Сдвигаем биты вправо и смотрим младший бит (& 1): если 0 — клетка свободна!
        return ((gridMask >> cell) & 1) == 0;
    }

    // Занять клетку по её номеру от 0 до 8 (ставим её бит в 1)
    function occupyCell(uint8 cell) external {
        require(cell < TOTAL_CELLS, "Invalid cell");
        // Шаг 2: Нельзя занять клетку, если она уже занята
        require(isCellFree(cell), "Cell already occupied");

        // Шаг 3: Магия битов: (1 << cell) ставит 1 в нужный бит через побитовое ИЛИ (|=)
        gridMask |= (1 << cell);

    }

    // Освободить клетку по её номеру от 0 до 8 (сбрасываем её бит в 0)
    function freeCell(uint8 cell) external {
        require(cell < TOTAL_CELLS, "Invalid cell");
        // Шаг 2: Нельзя освободить клетку, если она и так свободна
        require(!isCellFree(cell), "Cell already free");

        // Шаг 3: Сброс бита в 0: &= ~(1 << cell) обнуляет этот бит, не трогая остальные
        gridMask &= ~(1 << cell);

    }
}
