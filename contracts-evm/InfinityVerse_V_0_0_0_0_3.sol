// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_V_0_0_0_0_3
 * @notice Step 1: Bare 3x3 bitpacked grid.
 * No players, no coordinates, no player state - absolute base grid.
 */
contract InfinityVerse_V_0_0_0_0_3 {
    string public constant VERSION = "0.0.0.0.3";

    uint8 public constant GRID_WIDTH = 3;
    uint8 public constant TOTAL_CELLS = 9;

    // Grid 3x3 packed in bits 0..8
    // 0 = all 9 cells free (000000000)
    uint256 public gridMask;

    event CellOccupied(uint8 indexed cell, uint256 newGridMask);
    event CellFreed(uint8 indexed cell, uint256 newGridMask);

    function getGridMask() external view returns (uint256) {
        return gridMask;
    }

    function isCellFree(uint8 cell) public view returns (bool) {
        require(cell < TOTAL_CELLS, "Invalid cell");
        return ((gridMask >> cell) & 1) == 0;
    }

    function occupyCell(uint8 cell) external {
        require(cell < TOTAL_CELLS, "Invalid cell");
        require(isCellFree(cell), "Cell already occupied");

        gridMask |= (1 << cell);

        emit CellOccupied(cell, gridMask);
    }

    function freeCell(uint8 cell) external {
        require(cell < TOTAL_CELLS, "Invalid cell");
        require(!isCellFree(cell), "Cell already free");

        gridMask &= ~(1 << cell);

        emit CellFreed(cell, gridMask);
    }
}
