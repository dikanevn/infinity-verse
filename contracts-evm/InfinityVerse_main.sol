// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_Main
 * @notice Вечное хранилище состояния мира (State Keeper).
 * Хранит координаты мира, структуру клеток (4 байта) и данные игроков.
 * Вся игровая логика вынесена во внешний контракт-исполнитель (AAA),
 * который в будущем может передаваться по наследству (BBB, CCC...).
 */
contract InfinityVerse_Main {
    string public constant VERSION = "0.0.0.0.8-MAIN";

    // 4 байта = 32 бита на клетку (до 8 клеток в одном слоте storage)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }

    struct Player {
        int32 x;
        int32 y;
        bool exists;
        uint256 lastMoveBlock;
        address sessionKey;
        uint256 sessionExpiry;
    }

    // Постоянное ончейн-состояние мира
    mapping(bytes32 => Cell) public cells;
    mapping(address => Player) public players;
    mapping(address => uint256) public nonces;

    // Адрес активного исполняющего контракта (AAA)
    address public logicContract;

    event LogicContractSet(address indexed newLogic);
    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    event PlayerSpawned(address indexed player, int32 x, int32 y);
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event SessionAuthorized(address indexed player, address indexed sessionKey, uint256 expiry);
    event SessionRevoked(address indexed player);

    modifier onlyLogic() {
        require(msg.sender == logicContract, "Main: Caller is not logic contract");
        _;
    }

    constructor() {
        // Инициализируем стартовую сетку 5х5 (от -2 до +2)
        for (int32 x = -2; x <= 2; x++) {
            for (int32 y = -2; y <= 2; y++) {
                bytes32 key = getCellKey(x, y);

                if (x == 0 && y == 0) {
                    cells[key] = Cell({
                        terrain: 1, // Песок
                        object: 1,  // Обелиск
                        state: 0,
                        reserved: 0
                    });
                } else {
                    cells[key] = Cell({
                        terrain: 1, // Песок
                        object: 0,
                        state: 0,
                        reserved: 0
                    });
                }
            }
        }
    }

    /**
     * @notice Установка логического контракта (без владельцев/наследников на текущем этапе)
     */
    function setLogicContract(address _logicContract) external {
        require(logicContract == address(0) || msg.sender == logicContract, "Main: Not allowed");
        logicContract = _logicContract;
        emit LogicContractSet(_logicContract);
    }

    // ========================================================================
    // === VIEW МЕТОДЫ ДЛЯ ЧТЕНИЯ КЛИЕНТОМ И ЛОГИКОЙ ===
    // ========================================================================

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
        require(xs.length == ys.length, "Main: Array mismatch");
        uint256 total = xs.length;
        Cell[] memory result = new Cell[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = cells[getCellKey(xs[i], ys[i])];
        }
        return result;
    }

    function getPlayer(address player) external view returns (
        int32 x,
        int32 y,
        bool exists,
        address sessionKey,
        uint256 sessionExpiry
    ) {
        Player memory p = players[player];
        return (p.x, p.y, p.exists, p.sessionKey, p.sessionExpiry);
    }

    // ========================================================================
    // === STATE MUTATION (ТОЛЬКО ДЛЯ АКТИВНОГО ЛОГИЧЕСКОГО КОНТРАКТА) ===
    // ========================================================================

    function setCell(int32 x, int32 y, Cell calldata cellData) external onlyLogic {
        bytes32 key = getCellKey(x, y);
        cells[key] = cellData;
        emit CellUpdated(x, y, cellData.terrain, cellData.object);
    }

    function spawnPlayer(address player, int32 startX, int32 startY) external onlyLogic {
        require(!players[player].exists, "Main: Player already exists");
        players[player].x = startX;
        players[player].y = startY;
        players[player].exists = true;
        players[player].lastMoveBlock = block.number;
        emit PlayerSpawned(player, startX, startY);
    }

    function movePlayer(address player, int32 toX, int32 toY) external onlyLogic {
        Player storage p = players[player];
        int32 fromX = p.x;
        int32 fromY = p.y;

        p.x = toX;
        p.y = toY;
        p.lastMoveBlock = block.number;
        emit PlayerMoved(player, fromX, fromY, toX, toY);
    }

    function setPlayerSession(address player, address sessionKey, uint256 expiry) external onlyLogic {
        players[player].sessionKey = sessionKey;
        players[player].sessionExpiry = expiry;
        emit SessionAuthorized(player, sessionKey, expiry);
    }

    function revokePlayerSession(address player) external onlyLogic {
        players[player].sessionKey = address(0);
        players[player].sessionExpiry = 0;
        emit SessionRevoked(player);
    }

    function incrementNonce(address player) external onlyLogic returns (uint256) {
        return nonces[player]++;
    }
}
