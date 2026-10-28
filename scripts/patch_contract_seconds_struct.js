// scripts/patch_contract_seconds_struct.js
const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '..', 'contracts-evm', 'InfinityVerse_Gb_AAA_2.sol');
let code = fs.readFileSync(targetPath, 'utf8');

const isCRLF = code.includes('\r\n');
if (isCRLF) {
  code = code.replace(/\r\n/g, '\n');
}

// 1. Обновляем struct Cell
const oldStruct = `    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }`;

const newStruct = `    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
        uint32 secondsWeight;
    }`;

if (!code.includes(oldStruct)) {
  console.error('ERROR: oldStruct not found');
  process.exit(1);
}
code = code.replace(oldStruct, newStruct);

// 2. Обновляем getCell
const oldGetCell = `    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        return
            Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3])
            });
    }`;

const newGetCell = `    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        uint32 sw;
        assembly {
            sw := shr(224, shl(16, val))
        }
        return
            Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3]),
                secondsWeight: sw
            });
    }`;

if (!code.includes(oldGetCell)) {
  console.error('ERROR: oldGetCell not found');
  process.exit(1);
}
code = code.replace(oldGetCell, newGetCell);

// 3. Обновляем getCellsBatch
const oldGetCellsBatch = `        for (uint256 i = 0; i < len; ) {
            bytes32 val = rawData[i];
            cells[i] = Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3])
            });
            unchecked {
                ++i;
            }
        }`;

const newGetCellsBatch = `        for (uint256 i = 0; i < len; ) {
            bytes32 val = rawData[i];
            uint32 sw;
            assembly {
                sw := shr(224, shl(16, val))
            }
            cells[i] = Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3]),
                secondsWeight: sw
            });
            unchecked {
                ++i;
            }
        }`;

if (!code.includes(oldGetCellsBatch)) {
  console.error('ERROR: oldGetCellsBatch not found');
  process.exit(1);
}
code = code.replace(oldGetCellsBatch, newGetCellsBatch);

if (isCRLF) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully updated struct Cell and getCell/getCellsBatch in Gb_AAA_2!');
