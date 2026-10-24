// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_main
 * @notice Основной контракт Infinity-Verse: бесконечная сетка клеток (x, y) 
 * с поддержкой Игроков и Gasless ходов через Релеер.
 * 
 * Стартовая сетка 5х5: x от -2 до +2, y от -2 до +2 (25 клеток).
 * Центр (0, 0): Обелиск (terrain: 1, object: 1).
 * Вокруг: чистый песок (terrain: 1, object: 0).
 */
contract InfinityVerse_main {
    string public constant VERSION = "0.0.0.0.6";

    struct Cell {
        uint8 terrain;   // Ландшафт: 1 = песок, 2 = вода, 3 = скала
        uint8 object;    // Объект: 0 = пусто, 1 = обелиск, 2 = камень
        uint8 state;     // Состояние / прочность
        uint8 reserved;  // Резерв на будущее
        uint16 paramA;   // Расширенный параметр A
        uint16 paramB;   // Расширенный параметр B
    }

    struct Player {
        int32 x;
        int32 y;
        bool exists;
        uint256 lastMoveBlock;
    }

    // Хранилище клеток: keccak256(x, y) => Клетка
    mapping(bytes32 => Cell) public cells;

    // Хранилище игроков: address => Player
    mapping(address => Player) public players;

    // Адрес доверенного спонсора/релеера для gasless транзакций
    address public relayer;
    address public owner;

    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    event PlayerSpawned(address indexed player, int32 x, int32 y);
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event RelayerUpdated(address indexed newRelayer);

    modifier onlyRelayerOrPlayer(address player) {
        require(msg.sender == player || msg.sender == relayer || msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;

        // Инициализируем стартовую сетку 5х5 (25 клеток)
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

    function setRelayer(address _newRelayer) external onlyOwner {
        relayer = _newRelayer;
        emit RelayerUpdated(_newRelayer);
    }

    function getCellKey(int32 x, int32 y) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    function getCell(int32 x, int32 y) external view returns (Cell memory) {
        return cells[getCellKey(x, y)];
    }

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

    /**
     * @notice Спавн игрока в мир. Если новый — появляется рядом с Обелиском (например 0, 1)
     */
    function spawn(address player) public onlyRelayerOrPlayer(player) returns (int32, int32) {
        if (!players[player].exists) {
            players[player] = Player({
                x: 0,
                y: 1,
                exists: true,
                lastMoveBlock: block.number
            });
            emit PlayerSpawned(player, 0, 1);
        }
        return (players[player].x, players[player].y);
    }

    /**
     * @notice Перемещение игрока. Может вызывать сам игрок напрямую (если есть баланс)
     * либо доверенный релеер от имени игрока (полностью gasless для игрока!).
     */
    function move(address player, int32 targetX, int32 targetY) external onlyRelayerOrPlayer(player) {
        if (!players[player].exists) {
            spawn(player);
        }

        Player storage p = players[player];
        int32 curX = p.x;
        int32 curY = p.y;

        // Проверка: ход строго на соседнюю клетку
        int32 dx = targetX - curX;
        int32 dy = targetY - curY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        require((dx <= 1 && dy <= 1) && (dx + dy > 0), "Can only move to adjacent cell");

        // Проверка: клетка (0,0) занята Обелиском, на неё встать нельзя
        Cell memory dest = cells[getCellKey(targetX, targetY)];
        require(dest.object != 1, "Cell occupied by Obelisk");

        // Обновляем позицию игрока
        p.x = targetX;
        p.y = targetY;
        p.lastMoveBlock = block.number;

        emit PlayerMoved(player, curX, curY, targetX, targetY);
    }

    function getPlayer(address player) external view returns (int32 x, int32 y, bool exists) {
        Player memory p = players[player];
        return (p.x, p.y, p.exists);
    }
}
