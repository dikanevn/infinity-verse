// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @notice Минимальный интерфейс взаимодействия с постоянным хранилищем InfinityVerse_Main_Ga_1
 */
interface IInfinityVerse_Main_Ga_1 {
    function readSector(bytes32 sector) external view returns (bytes32);
    function readSectorBatch(bytes32[] calldata sectors) external view returns (bytes32[] memory);
    function writeSector(bytes32 sector, bytes32 data) external;
    function writeSectorBatch(bytes32[] calldata sectors, bytes32[] calldata data) external;
}

/**
 * @title InfinityVerse_Ga_AAA
 * @notice Высокопроизводительный модуль игровой логики эпохи Ga (Поколение 1).
 * @dev Реализует валидацию физики мира, спавн, перемещение, разведку клеток и сессионные ключи (EIP-191).
 * Полностью лишен тяжелых ончейн-событий (events) для максимальной экономии газа при миллионах транзакций.
 * Все данные упаковываются бит-в-бит через низкоуровневый Yul и сохраняются в секторы Main_Ga_1:
 *  - Клетки мира: 1 слот = 4 байта (terrain, object, state, reserved).
 *  - Игрок: 2 ультра-плотных сектора вместо разрозненных слотов:
 *      * Сектор данных: (int32 x, int32 y, bool exists, uint64 regBlock, uint64 regTime)
 *      * Сектор авторизации: (address sessionKey, uint64 sessionExpiry, uint32 nonce)
 */
contract InfinityVerse_Ga_AAA {
    string public constant VERSION = "0.0.0.0.1-GA-AAA";
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // Префиксы секторов для физического разнесения пространства имен в Main_Ga_1
    bytes4 private constant PREFIX_CELL = 0x43454c4c; // "CELL"
    bytes4 private constant PREFIX_POS  = 0x504f535f; // "POS_"
    bytes4 private constant PREFIX_AUTH = 0x41555448; // "AUTH"

    // Кастомные 4-байтные ошибки (минимальный расход газа при ревертах)
    error Unauthorized();
    error ZeroAddress();
    error SessionExpired();
    error InvalidSessionKey();
    error InvalidSignature();
    error PlayerAlreadyExists();
    error PlayerNotSpawned();
    error MoveTooFar();
    error MoveZeroDistance();
    error ObstacleObelisk();
    error ObstacleWall();
    error CellAlreadyExists();
    error InvalidCoordinates();
    error InvalidBatchLength();
    error ArrayLengthMismatch();

    // Структура клетки (совместимость с фронтендом)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }

    IInfinityVerse_Main_Ga_1 public mainContract;
    address public immutable deployer;
    address public immutable relayer;

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert Unauthorized();
        _;
    }

    constructor(address _mainContract, address _relayer) {
        if (_mainContract == address(0) || _relayer == address(0)) revert ZeroAddress();
        deployer = msg.sender;
        mainContract = IInfinityVerse_Main_Ga_1(_mainContract);
        relayer = _relayer;
    }

    /**
     * @notice Изменение адреса хранилища Main_Ga_1 на этапе эволюции
     */
    function setMainContract(address _newMain) external onlyDeployer {
        if (_newMain == address(0)) revert ZeroAddress();
        mainContract = IInfinityVerse_Main_Ga_1(_newMain);
    }

    // ========================================================================
    // === ХЕЛПЕРЫ СЕКТОРОВ И АССЕМБЛЕРНАЯ УПАКОВКА ===
    // ========================================================================

    /**
     * @notice Вычисление детерминированного ключа сектора клетки
     */
    function getCellKey(int32 x, int32 y) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_CELL, x, y));
    }

    /**
     * @notice Вычисление ключа сектора позиции и статуса игрока
     */
    function getPlayerPosKey(address player) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_POS, player));
    }

    /**
     * @notice Вычисление ключа сектора авторизации и сессии игрока
     */
    function getPlayerAuthKey(address player) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_AUTH, player));
    }

    // ========================================================================
    // === МЕТОДЫ ЧТЕНИЯ ДЛЯ ФРОНТЕНДА И МОДУЛЕЙ (COMPATIBLE GETTERS) ===
    // ========================================================================

    /**
     * @notice Чтение данных клетки мира за 1 чтение сектора
     */
    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        return Cell({
            terrain: uint8(val[0]),
            object: uint8(val[1]),
            state: uint8(val[2]),
            reserved: uint8(val[3])
        });
    }

    /**
     * @notice Пакетное чтение клеток мира
     */
    function getCellsBatch(int32[] calldata xs, int32[] calldata ys) external view returns (Cell[] memory cells) {
        if (xs.length != ys.length) revert ArrayLengthMismatch();
        uint256 len = xs.length;
        bytes32[] memory keys = new bytes32[](len);
        for (uint256 i = 0; i < len;) {
            keys[i] = getCellKey(xs[i], ys[i]);
            unchecked { ++i; }
        }

        bytes32[] memory rawData = mainContract.readSectorBatch(keys);
        cells = new Cell[](len);
        for (uint256 i = 0; i < len;) {
            bytes32 val = rawData[i];
            cells[i] = Cell({
                terrain: uint8(val[0]),
                object: uint8(val[1]),
                state: uint8(val[2]),
                reserved: uint8(val[3])
            });
            unchecked { ++i; }
        }
    }

    /**
     * @notice Чтение полного профиля игрока (совместимо со всеми вызовами клиента)
     */
    function getPlayer(address player) public view returns (
        int32 x,
        int32 y,
        bool exists,
        address sessionKey,
        uint256 sessionExpiry,
        uint64 registeredAtBlock,
        uint64 registeredAtTimestamp
    ) {
        bytes32 posData = mainContract.readSector(getPlayerPosKey(player));
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));

        assembly {
            // Распаковка сектора позиции (32 байта):
            // [x: 4B][y: 4B][exists: 1B][regBlock: 8B][regTime: 8B][padding: 7B]
            x := sar(224, posData)
            y := sar(224, shl(32, posData))
            exists := byte(8, posData)
            registeredAtBlock := shr(192, shl(72, posData))
            registeredAtTimestamp := shr(192, shl(136, posData))

            // Распаковка сектора авторизации (32 байта):
            // [sessionKey: 20B][sessionExpiry: 8B][nonce: 4B]
            sessionKey := shr(96, authData)
            sessionExpiry := shr(192, shl(160, authData))
        }
    }

    /**
     * @notice Получение текущего нонса игрока
     */
    function nonces(address player) external view returns (uint256 currentNonce) {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        assembly {
            // nonce занимает последние 4 байта (байты 28..31)
            currentNonce := shr(224, shl(224, authData))
        }
    }

    /**
     * @notice Проверка валидности сессионного ключа
     */
    function isSessionValid(address player, address sessionKey) public view returns (bool) {
        if (sessionKey == address(0)) return false;
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        address activeKey;
        uint256 expiry;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
        }
        return (activeKey == sessionKey && block.timestamp < expiry);
    }

    // ========================================================================
    // === СЕССИОННЫЕ КЛЮЧИ (DIRECT <-> GASLESS) ===
    // ========================================================================

    function authorizeSessionDirect(address sessionKey, uint256 expiry) external {
        if (block.timestamp >= expiry) revert SessionExpired();
        if (sessionKey == address(0)) revert InvalidSessionKey();
        _updateSessionKey(msg.sender, sessionKey, expiry);
    }

    function authorizeSessionGasless(
        address player,
        address sessionKey,
        uint256 expiry,
        bytes calldata sig
    ) external {
        if (block.timestamp >= expiry) revert SessionExpired();
        if (sessionKey == address(0)) revert InvalidSessionKey();

        uint256 currentNonce = _incrementNonce(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("AuthorizeSession", player, sessionKey, expiry, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        if (signer != player) revert InvalidSignature();

        _updateSessionKey(player, sessionKey, expiry);
    }

    function revokeSessionDirect() external {
        _updateSessionKey(msg.sender, address(0), 0);
    }

    function revokeSessionGasless(address player, bytes calldata sig) external {
        uint256 currentNonce = _incrementNonce(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("RevokeSession", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        if (signer != player) revert InvalidSignature();

        _updateSessionKey(player, address(0), 0);
    }

    // ========================================================================
    // === ИГРОВЫЕ ДЕЙСТВИЯ: СПАВН И ХОДЫ ===
    // ========================================================================

    function spawnDirect() external returns (int32, int32) {
        return _executeSpawn(msg.sender);
    }

    function spawnGasless(address player, bytes calldata spawnSig) external returns (int32, int32) {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        address activeKey;
        uint256 expiry;
        uint256 currentNonce;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
            currentNonce := shr(224, shl(224, authData))
        }

        if (activeKey == address(0) || block.timestamp >= expiry) revert SessionExpired();

        bytes32 spawnHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Spawn", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(spawnHash, spawnSig);
        if (signer != activeKey) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        return _executeSpawn(player);
    }

    function moveDirect(int32 targetX, int32 targetY) external {
        _validateAndExecuteMove(msg.sender, targetX, targetY);
    }

    function moveGasless(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata moveSig
    ) external {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        address activeKey;
        uint256 expiry;
        uint256 currentNonce;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
            currentNonce := shr(224, shl(224, authData))
        }

        if (activeKey == address(0) || block.timestamp >= expiry) revert SessionExpired();

        bytes32 moveHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Move", player, targetX, targetY, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(moveHash, moveSig);
        if (signer != activeKey) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _validateAndExecuteMove(player, targetX, targetY);
    }

    // ========================================================================
    // === РАЗВЕДКА КЛЕТОК МИРА (DISCOVER) ===
    // ========================================================================

    function discoverCellDirect(int32 targetX, int32 targetY) external {
        _validateAndExecuteDiscoverCell(msg.sender, targetX, targetY);
    }

    function discoverCellGasless(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata sig
    ) external {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        address activeKey;
        uint256 expiry;
        uint256 currentNonce;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
            currentNonce := shr(224, shl(224, authData))
        }

        if (activeKey == address(0) || block.timestamp >= expiry) revert SessionExpired();

        bytes32 discoverHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("DiscoverCell", player, targetX, targetY, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(discoverHash, sig);
        if (signer != activeKey) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _validateAndExecuteDiscoverCell(player, targetX, targetY);
    }

    function discoverCellsBatchDirect(int32[] calldata xs, int32[] calldata ys) external {
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    function discoverCellsBatchGasless(
        address player,
        int32[] calldata xs,
        int32[] calldata ys,
        bytes calldata sig
    ) external {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        address activeKey;
        uint256 expiry;
        uint256 currentNonce;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
            currentNonce := shr(224, shl(224, authData))
        }

        if (activeKey == address(0) || block.timestamp >= expiry) revert SessionExpired();

        bytes32 batchHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("DiscoverBatch", player, keccak256(abi.encodePacked(xs)), keccak256(abi.encodePacked(ys)), currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(batchHash, sig);
        if (signer != activeKey) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _validateAndExecuteDiscoverBatch(player, xs, ys);
    }

    // ========================================================================
    // === ВНУТРЕННЕЕ ЯДРО ВЫПОЛНЕНИЯ (INTERNAL CORE С БИТОВОЙ УПАКОВКОЙ) ===
    // ========================================================================

    function _executeSpawn(address player) internal returns (int32 startX, int32 startY) {
        bytes32 posKey = getPlayerPosKey(player);
        bytes32 currentPos = mainContract.readSector(posKey);

        bool exists;
        assembly {
            exists := byte(8, currentPos)
        }
        if (exists) revert PlayerAlreadyExists();

        startX = 1;
        startY = 0;

        bytes32 packed;
        uint64 blockNum = uint64(block.number);
        uint64 curTime = uint64(block.timestamp);

        assembly {
            // [x: 4B][y: 4B][exists: 1B = 1][regBlock: 8B][regTime: 8B][0: 7B]
            packed := or(
                or(
                    or(shl(224, startX), shr(32, shl(224, startY))),
                    shl(184, 1)
                ),
                or(
                    shl(120, blockNum),
                    shl(56, curTime)
                )
            )
        }

        mainContract.writeSector(posKey, packed);
    }

    function _validateAndExecuteMove(address player, int32 targetX, int32 targetY) internal {
        bytes32 posKey = getPlayerPosKey(player);
        bytes32 currentPos = mainContract.readSector(posKey);

        int32 currentX;
        int32 currentY;
        bool exists;
        assembly {
            currentX := sar(224, currentPos)
            currentY := sar(224, shl(32, currentPos))
            exists := byte(8, currentPos)
        }
        if (!exists) revert PlayerNotSpawned();

        int32 dx = targetX - currentX;
        int32 dy = targetY - currentY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        if (dx > 1 || dy > 1) revert MoveTooFar();
        if (dx + dy == 0) revert MoveZeroDistance();

        // Проверяем препятствия (Обелиск или Стена)
        bytes32 cellVal = mainContract.readSector(getCellKey(targetX, targetY));
        uint8 objectType;
        assembly {
            objectType := byte(1, cellVal)
        }
        if (objectType == 1) revert ObstacleObelisk();
        if (objectType == 2) revert ObstacleWall();

        // Обновляем координаты x, y с сохранением неизменными exists, regBlock и regTime
        bytes32 updatedPos;
        assembly {
            // Затираем первые 8 байт (x, y) и подставляем targetX, targetY
            let preserved := and(currentPos, 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            let newCoords := or(shl(224, targetX), shr(32, shl(224, targetY)))
            updatedPos := or(newCoords, preserved)
        }

        mainContract.writeSector(posKey, updatedPos);
    }

    function _validateAndExecuteDiscoverCell(address player, int32 targetX, int32 targetY) internal {
        bytes32 posKey = getPlayerPosKey(player);
        bytes32 currentPos = mainContract.readSector(posKey);

        int32 currentX;
        int32 currentY;
        bool exists;
        assembly {
            currentX := sar(224, currentPos)
            currentY := sar(224, shl(32, currentPos))
            exists := byte(8, currentPos)
        }
        if (!exists) revert PlayerNotSpawned();

        int32 dx = targetX - currentX;
        int32 dy = targetY - currentY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;
        if (dx > 1 || dy > 1) revert MoveTooFar();

        bytes32 cellKey = getCellKey(targetX, targetY);
        bytes32 currentCell = mainContract.readSector(cellKey);
        uint8 terrain;
        assembly {
            terrain := byte(0, currentCell)
        }
        if (terrain != 0) revert CellAlreadyExists();

        // Упаковываем 4 байта новой клетки: terrain = 1 (Песок), object = 0, state = 0, reserved = 0
        bytes32 sandCell;
        assembly {
            sandCell := shl(248, 1) // byte 0 = 1, остальные 0
        }

        mainContract.writeSector(cellKey, sandCell);
    }

    function _validateAndExecuteDiscoverBatch(address player, int32[] calldata xs, int32[] calldata ys) internal {
        if (xs.length != ys.length) revert ArrayLengthMismatch();
        uint256 len = xs.length;
        if (len == 0 || len > 9) revert InvalidBatchLength();

        bytes32 posKey = getPlayerPosKey(player);
        bytes32 currentPos = mainContract.readSector(posKey);

        int32 currentX;
        int32 currentY;
        bool exists;
        assembly {
            currentX := sar(224, currentPos)
            currentY := sar(224, shl(32, currentPos))
            exists := byte(8, currentPos)
        }
        if (!exists) revert PlayerNotSpawned();

        bytes32[] memory keys = new bytes32[](len);
        bytes32[] memory values = new bytes32[](len);
        bytes32 sandCell;
        assembly {
            sandCell := shl(248, 1)
        }

        for (uint256 i = 0; i < len;) {
            int32 targetX = xs[i];
            int32 targetY = ys[i];

            int32 dx = targetX - currentX;
            int32 dy = targetY - currentY;
            if (dx < 0) dx = -dx;
            if (dy < 0) dy = -dy;
            if (dx > 1 || dy > 1) revert MoveTooFar();

            bytes32 key = getCellKey(targetX, targetY);
            bytes32 cellData = mainContract.readSector(key);
            uint8 terrain;
            assembly {
                terrain := byte(0, cellData)
            }
            if (terrain != 0) revert CellAlreadyExists();

            keys[i] = key;
            values[i] = sandCell;

            unchecked { ++i; }
        }

        // Атомарная пакетная запись всех разведанных клеток в Main_Ga_1 за 1 вызов
        mainContract.writeSectorBatch(keys, values);
    }

    // ========================================================================
    // === ВНУТРЕННЕЕ УПРАВЛЕНИЕ СЕССИЯМИ И НОНСАМИ ===
    // ========================================================================

    function _updateSessionKey(address player, address sessionKey, uint256 expiry) internal {
        bytes32 authKey = getPlayerAuthKey(player);
        bytes32 authData = mainContract.readSector(authKey);

        bytes32 newAuthData;
        uint64 exp64 = uint64(expiry);
        assembly {
            // Сохраняем нонс (последние 4 байта)
            let preservedNonce := and(authData, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)
            // Новая связка: [sessionKey: 20B][sessionExpiry: 8B][nonce: 4B]
            let newHeader := or(shl(96, sessionKey), shl(32, exp64))
            newAuthData := or(newHeader, preservedNonce)
        }

        mainContract.writeSector(authKey, newAuthData);
    }

    function _incrementNonce(address player) internal returns (uint256 currentNonce) {
        bytes32 authKey = getPlayerAuthKey(player);
        bytes32 authData = mainContract.readSector(authKey);

        assembly {
            currentNonce := shr(224, shl(224, authData))
        }

        _incrementNonceInternal(player, authData, currentNonce);
    }

    function _incrementNonceInternal(address player, bytes32 authData, uint256 currentNonce) internal {
        bytes32 newAuthData;
        uint32 nextNonce = uint32(currentNonce + 1);

        assembly {
            // Маска первых 28 байт (not(0xFFFFFFFF)): зануляем последние 4 байта нонса
            let header := and(authData, not(0xFFFFFFFF))
            newAuthData := or(header, nextNonce)
        }

        mainContract.writeSector(getPlayerAuthKey(player), newAuthData);
    }

    // ========================================================================
    // === EIP-191 / EIP-2 КРИПТОГРАФИЯ ===
    // ========================================================================

    function recoverSigner(bytes32 messageHash, bytes memory sig) public pure returns (address signer) {
        if (sig.length != 65) revert InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();

        // Защита от Signature Malleability (EIP-2)
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignature();
        }

        signer = ecrecover(messageHash, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
    }
}
