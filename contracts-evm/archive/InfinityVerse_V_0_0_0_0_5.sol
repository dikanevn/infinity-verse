// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_5
 * @notice Бесконечная сетка клеток (x, y).
 * При деплое сразу заполняется стартовая область 3х3:
 * координаты от -1 до +1 по X и Y (всего 9 клеток с центром в 0, 0):
 *
 *   (-1, 1)  (0, 1)  (1, 1)
 *   (-1, 0)  (0, 0)  (1, 0)
 *   (-1,-1)  (0,-1)  (1,-1)
 */
contract InfinityVerse_V_0_0_0_0_5 {
    string public constant VERSION = "0.0.0.0.5";

    struct Cell {
        uint8 terrain; // Ландшафт: 1 = песок, 2 = вода, 3 = скала
        uint8 object; // Объект: 0 = пусто, 1 = обелиск, 2 = камень
        uint8 state; // Состояние / прочность
        uint8 reserved; // Резерв на будущее
        uint16 paramA; // Расширенный параметр A
        uint16 paramB; // Расширенный параметр B
    }

    // Хранилище клеток: ключ keccak256(x, y) => Клетка
    mapping(bytes32 => Cell) public cells;

    /**
     * @notice Конструктор: при деплое создаёт 25 клеток вокруг центра (5х5):
     * x от -2 до +2, y от -2 до +2
     */
    constructor() {
        for (int32 x = -2; x <= 2; x++) {
            for (int32 y = -2; y <= 2; y++) {
                bytes32 key = getCellKey(x, y);

                if (x == 0 && y == 0) {
                    // Центр (0, 0): песок (terrain: 1) и обелиск (object: 1)
                    cells[key] = Cell({
                        terrain: 1,
                        object: 1,
                        state: 0,
                        reserved: 0,
                        paramA: 0,
                        paramB: 0
                    });
                } else {
                    // Окружающие 24 клетки: песок (terrain: 1), пусто (object: 0)
                    cells[key] = Cell({
                        terrain: 1,
                        object: 0,
                        state: 0,
                        reserved: 0,
                        paramA: 0,
                        paramB: 0
                    });
                }
            }
        }
    }

    /**
     * @notice Превращает координаты (x, y) в уникальный ключ для mapping
     */
    function getCellKey(int32 x, int32 y) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    /**
     * @notice Прочитать одну клетку по координатам (x, y)
     */
    function getCell(int32 x, int32 y) external view returns (Cell memory) {
        return cells[getCellKey(x, y)];
    }

    /**
     * @notice Прочитать сразу несколько клеток по списку координат (для фронтенда)
     */
    function getCellsBatch(
        int32[] calldata xs,
        int32[] calldata ys
    ) external view returns (Cell[] memory) {
        require(xs.length == ys.length, "Arrays length mismatch");
        uint256 total = xs.length;
        Cell[] memory result = new Cell[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = cells[getCellKey(xs[i], ys[i])];
        }
        return result;
    }
}
