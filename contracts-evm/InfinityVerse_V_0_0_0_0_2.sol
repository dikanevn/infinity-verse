// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerseV0_0_0_0_2
 * @notice Fully On-chain Grid Universe designed for eternal longevity (millions of years).
 * 
 * Version: 0.0.0.0.2
 * Features:
 * - Native address identity (cells store wallet addresses instead of sequential IDs)
 * - Single dynamic Star on the field (0..8)
 * - Pure on-chain entropy (prevrandao + timestamp + blocknumber + nonce + sender)
 * - Instant respawn of Star upon collection (Variant A)
 * - Player star balance tracking
 */
contract InfinityVerse_V_0_0_0_0_2 {
    string public constant VERSION = "0.0.0.0.2";
    uint8 public constant GRID_WIDTH = 3;
    uint8 public constant TOTAL_CELLS = 9;

    // Grid: cell index (0..8) => player address (address(0) = empty)
    address[TOTAL_CELLS] public grid;

    // Current star cell: 0..8 (or -1 if no star)
    int8 public starCell = -1;
    uint256 private entropyNonce;

    // Player metadata
    mapping(address => uint8) public playerPosition;
    mapping(address => bool) public isSpawned;
    mapping(address => uint256) public starBalance;

    // Events
    event PlayerSpawned(address indexed player, uint8 cell);
    event PlayerMoved(address indexed player, uint8 fromCell, uint8 toCell);
    event StarSpawned(uint8 cell);
    event StarCollected(address indexed player, uint8 cell, uint256 newBalance);

    constructor() {
        // Star will be spawned on first player move/spawn or directly in constructor
        _spawnStar();
    }

    /**
     * @notice Returns full grid addresses in a single call
     */
    function getGrid() external view returns (address[TOTAL_CELLS] memory) {
        return grid;
    }

    /**
     * @notice Check adjacency (orthogonal manhattan distance == 1)
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
     * @notice Internal star spawner using on-chain entropy
     */
    function _spawnStar() internal {
        uint8[TOTAL_CELLS] memory emptyCells;
        uint8 emptyCount = 0;

        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            // Star cannot spawn on a cell with a player
            if (grid[i] == address(0)) {
                emptyCells[emptyCount] = i;
                emptyCount++;
            }
        }

        if (emptyCount > 0) {
            entropyNonce++;
            uint256 rand = uint256(
                keccak256(
                    abi.encodePacked(
                        block.prevrandao,
                        block.timestamp,
                        block.number,
                        entropyNonce,
                        msg.sender
                    )
                )
            );
            uint8 selectedIndex = uint8(rand % emptyCount);
            starCell = int8(emptyCells[selectedIndex]);
            emit StarSpawned(uint8(starCell));
        } else {
            starCell = -1;
        }
    }

    /**
     * @notice Spawn new player on the board
     */
    function spawn(uint8 targetCell) public {
        require(targetCell < TOTAL_CELLS, "Invalid cell");
        require(grid[targetCell] == address(0), "Cell already occupied");
        require(!isSpawned[msg.sender], "Player already spawned");

        grid[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;
        isSpawned[msg.sender] = true;

        emit PlayerSpawned(msg.sender, targetCell);

        // Check if player spawned directly on the star
        if (starCell == int8(targetCell)) {
            starBalance[msg.sender] += 1;
            emit StarCollected(msg.sender, targetCell, starBalance[msg.sender]);
            _spawnStar();
        } else if (starCell == -1) {
            _spawnStar();
        }
    }

    /**
     * @notice Move player to target cell
     */
    function move(uint8 targetCell) external {
        require(targetCell < TOTAL_CELLS, "Invalid cell");

        if (!isSpawned[msg.sender]) {
            spawn(targetCell);
            return;
        }

        uint8 currentCell = playerPosition[msg.sender];
        require(currentCell != targetCell, "Already in this cell");
        require(isAdjacent(currentCell, targetCell), "Target cell is not adjacent");
        require(grid[targetCell] == address(0), "Target cell occupied");

        // Execute move
        grid[currentCell] = address(0);
        grid[targetCell] = msg.sender;
        playerPosition[msg.sender] = targetCell;

        emit PlayerMoved(msg.sender, currentCell, targetCell);

        // Check star collection (Variant A: collect and instantly respawn)
        if (starCell == int8(targetCell)) {
            starBalance[msg.sender] += 1;
            emit StarCollected(msg.sender, targetCell, starBalance[msg.sender]);
            _spawnStar();
        }
    }
}
