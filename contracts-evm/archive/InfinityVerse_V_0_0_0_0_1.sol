// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse
 * @notice Fully On-chain Grid Universe designed for infinite longevity and modular scaling.
 * 
 * Grid representation:
 * 0, 1, 2
 * 3, 4, 5
 * 6, 7, 8
 * 
 * Cell values:
 * 0 = Empty
 * > 0 = Player ID (each player gets a unique sequential 1-based ID: 1, 2, 3...)
 */
contract InfinityVerse_V_0_0_0_0_1 {
    // Current grid width and size (fixed 3x3 for initial epoch, scalable via future logic)
    uint8 public constant GRID_WIDTH = 3;
    uint8 public constant TOTAL_CELLS = 9;

    // Grid state: cellIndex (0..8) => playerId (0 = empty, 1..N = player)
    uint256[TOTAL_CELLS] public grid;

    // Total unique registered players counter (1, 2, 3...)
    uint256 public nextPlayerId = 1;

    // Player metadata
    mapping(address => uint256) public addressToPlayerId;
    mapping(uint256 => address) public playerIdToAddress;
    mapping(uint256 => uint8) public playerPosition;
    mapping(uint256 => bool) public playerSpawned;

    // Events
    event PlayerSpawned(address indexed wallet, uint256 indexed playerId, uint8 cell);
    event PlayerMoved(address indexed wallet, uint256 indexed playerId, uint8 fromCell, uint8 toCell);

    /**
     * @notice Get full grid state in a single RPC call
     */
    function getGrid() external view returns (uint256[TOTAL_CELLS] memory) {
        return grid;
    }

    /**
     * @notice Register or retrieve player ID for an address
     */
    function getOrCreatePlayerId(address wallet) public returns (uint256) {
        uint256 id = addressToPlayerId[wallet];
        if (id == 0) {
            id = nextPlayerId;
            nextPlayerId++;
            addressToPlayerId[wallet] = id;
            playerIdToAddress[id] = wallet;
        }
        return id;
    }

    /**
     * @notice Spawn player into a specific cell if empty
     */
    function spawn(uint8 targetCell) public returns (uint256) {
        require(targetCell < TOTAL_CELLS, "Invalid cell");
        require(grid[targetCell] == 0, "Cell already occupied");

        uint256 playerId = getOrCreatePlayerId(msg.sender);
        require(!playerSpawned[playerId], "Player already spawned");

        grid[targetCell] = playerId;
        playerPosition[playerId] = targetCell;
        playerSpawned[playerId] = true;

        emit PlayerSpawned(msg.sender, playerId, targetCell);
        return playerId;
    }

    /**
     * @notice Check if two cells are adjacent (up, down, left, right)
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

        // Manhattan distance == 1 (orthogonal step)
        return (dx + dy == 1);
    }

    /**
     * @notice Move player to target cell
     */
    function move(uint8 targetCell) external {
        require(targetCell < TOTAL_CELLS, "Invalid cell");
        uint256 playerId = addressToPlayerId[msg.sender];
        
        // Auto-spawn if not on grid yet
        if (playerId == 0 || !playerSpawned[playerId]) {
            spawn(targetCell);
            return;
        }

        uint8 currentCell = playerPosition[playerId];
        require(currentCell != targetCell, "Already in this cell");
        require(isAdjacent(currentCell, targetCell), "Target cell is not adjacent");
        require(grid[targetCell] == 0, "Target cell occupied");

        // Clear previous cell and occupy target
        grid[currentCell] = 0;
        grid[targetCell] = playerId;
        playerPosition[playerId] = targetCell;

        emit PlayerMoved(msg.sender, playerId, currentCell, targetCell);
    }
}
