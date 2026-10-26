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
 * @notice Полный интерфейс токена Ga_TTT для управления из модуля Ga_AAA_2
 */
interface IInfinityVerse_Ga_TTT {
    function mint(address to, uint256 amount) external returns (bool);
    function mintBatch(address[] calldata recipients, uint256[] calldata amounts) external returns (bool);
    function forceBurn(address from, uint256 amount) external returns (bool);
    function forceTransfer(address from, address to, uint256 amount) external returns (bool);
    function setPaused(bool _paused) external;
    function setFrozenAccount(address target, bool freeze) external;
    function setAllowedMinter(address minter, bool allowed) external;
    function transferSuperAdminDirect(address newAdmin) external;
    function setNameAndSymbol(string memory _name, string memory _symbol) external;
}

/**
 * @title InfinityVerse_Ga_AAA_2
 * @notice Исполнительный модуль игровой логики следующего поколения (Ga_AAA_2).
 * @dev Расширение Ga_AAA:
 * 1. Интеграция с токеном звёзд Ga_TTT (сбор упавших звёзд с клетки и автоматический минт токена игроку).
 * 2. Роль управления superAdmin (с возможностью привязки токена Ga_TTT и хранилища Main_Ga_1).
 * 3. Низкоуровневая обработка физики, спавна, перемещения и сессионных подписей (EIP-191).
 * 4. Байткод оптимизирован под runs = 4294967295.
 */
contract InfinityVerse_Ga_AAA_2 {
    string public constant VERSION = "0.0.0.0.2-GA-AAA-2";
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // Префиксы секторов в Main_Ga_1
    bytes4 private constant PREFIX_CELL = 0x43454c4c; // "CELL"
    bytes4 private constant PREFIX_POS  = 0x504f535f; // "POS_"
    bytes4 private constant PREFIX_AUTH = 0x41555448; // "AUTH"

    // Игровые идентификаторы объектов
    uint8 public constant OBJECT_NONE    = 0;
    uint8 public constant OBJECT_OBELISK = 1;
    uint8 public constant OBJECT_WALL    = 2;
    uint8 public constant OBJECT_STAR    = 3; // Упавшая Звезда

    // Базовая награда за подобранную звезду (1 токен STAR = 1e18 wei)
    uint256 public starRewardAmount = 1 ether;

    // Кастомные 4-байтные ошибки
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

    // Структура клетки (для фронтенда)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }

    IInfinityVerse_Main_Ga_1 public mainContract;
    IInfinityVerse_Ga_TTT public starToken;
    address public superAdmin;
    address public immutable relayer;

    event StarCollected(address indexed player, int32 x, int32 y, uint256 reward);
    event StarDropped(int32 indexed x, int32 indexed y, uint8 weight);

    modifier onlySuperAdmin() {
        if (msg.sender != superAdmin) revert Unauthorized();
        _;
    }

    constructor(address _mainContract, address _relayer, address _superAdmin) {
        if (_mainContract == address(0) || _relayer == address(0) || _superAdmin == address(0)) revert ZeroAddress();
        superAdmin = _superAdmin;
        mainContract = IInfinityVerse_Main_Ga_1(_mainContract);
        relayer = _relayer;
    }

    function setMainContract(address _newMain) external onlySuperAdmin {
        if (_newMain == address(0)) revert ZeroAddress();
        mainContract = IInfinityVerse_Main_Ga_1(_newMain);
    }

    function setStarToken(address _token) external onlySuperAdmin {
        starToken = IInfinityVerse_Ga_TTT(_token);
    }

    function setStarReward(uint256 _newReward) external onlySuperAdmin {
        starRewardAmount = _newReward;
    }

    function transferSuperAdmin(address _newAdmin) external onlySuperAdmin {
        if (_newAdmin == address(0)) revert ZeroAddress();
        superAdmin = _newAdmin;
    }

    // ========================================================================
    // === УПРАВЛЕНИЕ ТОКЕНОМ ЗВЁЗД GA_TTT (ПРОКСИ-МЕТОДЫ SUPERADMIN) ===
    // ========================================================================

    /**
     * @notice Передача полномочий SuperAdmin токена новому модулю логики (например, Ga_AAA_3)
     */
    function transferStarTokenSuperAdmin(address newModule) external onlySuperAdmin {
        if (address(starToken) == address(0) || newModule == address(0)) revert ZeroAddress();
        starToken.transferSuperAdminDirect(newModule);
    }

    /**
     * @notice Экстренная пауза токена через SuperAdmin
     */
    function setStarTokenPaused(bool _paused) external onlySuperAdmin {
        starToken.setPaused(_paused);
    }

    /**
     * @notice Принудительное сжигание токенов (читерство, штраф) через SuperAdmin
     */
    function forceBurnStarToken(address from, uint256 amount) external onlySuperAdmin {
        starToken.forceBurn(from, amount);
    }

    /**
     * @notice Принудительный перевод токенов через SuperAdmin
     */
    function forceTransferStarToken(address from, address to, uint256 amount) external onlySuperAdmin {
        starToken.forceTransfer(from, to, amount);
    }

    /**
     * @notice Заморозка кошелька в токене через SuperAdmin
     */
    function setFrozenStarTokenAccount(address target, bool freeze) external onlySuperAdmin {
        starToken.setFrozenAccount(target, freeze);
    }

    // ========================================================================
    // === ХЕЛПЕРЫ СЕКТОРОВ И АССЕМБЛЕРНАЯ УПАКОВКА ===
    // ========================================================================

    function getCellKey(int32 x, int32 y) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_CELL, x, y));
    }

    function getPlayerPosKey(address player) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_POS, player));
    }

    function getPlayerAuthKey(address player) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_AUTH, player));
    }

    // ========================================================================
    // === ОНЧЕЙН ГЕТТЕРЫ (VIEW) ДЛЯ ФРОНТЕНДА ===
    // ========================================================================

    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
        bytes32 val = mainContract.readSector(getCellKey(x, y));
        return Cell({
            terrain: uint8(val[0]),
            object: uint8(val[1]),
            state: uint8(val[2]),
            reserved: uint8(val[3])
        });
    }

    function getPlayer(address player) public view returns (
        int32 x,
        int32 y,
        bool exists,
        address sessionKey,
        uint256 sessionExpiry,
        uint64 registeredAtBlock,
        uint64 registeredAtTimestamp
    ) {
        bytes32 posVal = mainContract.readSector(getPlayerPosKey(player));
        bytes32 authVal = mainContract.readSector(getPlayerAuthKey(player));

        assembly {
            x := sar(224, posVal)
            y := sar(224, shl(32, posVal))
            exists := byte(8, posVal)
            registeredAtBlock := shr(192, shl(72, posVal))
            registeredAtTimestamp := shr(192, shl(136, posVal))
            sessionKey := shr(96, authVal)
            sessionExpiry := shr(192, shl(160, authVal))
        }
    }

    function nonces(address player) external view returns (uint256 currentNonce) {
        bytes32 authVal = mainContract.readSector(getPlayerAuthKey(player));
        assembly {
            currentNonce := shr(224, shl(224, authVal))
        }
    }

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

    // ========================================================================
    // === ИГРОВЫЕ ДЕЙСТВИЯ (DIRECT) ===
    // ========================================================================

    function spawnDirect() external returns (int32 startX, int32 startY) {
        return _executeSpawn(msg.sender);
    }

    function moveDirect(int32 targetX, int32 targetY) external {
        _validateAndExecuteMove(msg.sender, targetX, targetY);
    }

    function discoverCellDirect(int32 targetX, int32 targetY) external {
        _validateAndExecuteDiscoverCell(msg.sender, targetX, targetY);
    }

    function discoverCellsBatchDirect(int32[] calldata xs, int32[] calldata ys) external {
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    function discoverBatchDirect(int32[] calldata xs, int32[] calldata ys) external {
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    function authorizeSessionDirect(address sessionKey, uint256 sessionExpiry) external {
        _saveSessionInternal(msg.sender, sessionKey, sessionExpiry);
    }

    function revokeSessionDirect() external {
        _saveSessionInternal(msg.sender, address(0), 0);
    }

    // ========================================================================
    // === GASLESS ДЕЙСТВИЯ (ЧЕРЕЗ RELAYER С ПОДПИСЬЮ EIP-191) ===
    // ========================================================================

    function spawnGasless(address player, bytes calldata sig) external {
        if (msg.sender != relayer && msg.sender != superAdmin) revert Unauthorized();

        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        uint256 currentNonce;
        assembly {
            currentNonce := shr(224, shl(224, authData))
        }

        bytes32 spawnHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Spawn", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(spawnHash, sig);
        if (signer != player) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _executeSpawn(player);
    }

    function moveGasless(
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

        bytes32 moveHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Move", player, targetX, targetY, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(moveHash, sig);
        if (signer != activeKey) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _validateAndExecuteMove(player, targetX, targetY);
    }

    function discoverBatchGasless(
        address player,
        int32[] calldata xs,
        int32[] calldata ys,
        bytes calldata sig
    ) public {
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

    function discoverCellsBatchGasless(
        address player,
        int32[] calldata xs,
        int32[] calldata ys,
        bytes calldata sig
    ) external {
        discoverBatchGasless(player, xs, ys, sig);
    }

    // ========================================================================
    // === ВНУТРЕННЕЕ ЯДРО ВЫПОЛНЕНИЯ (С МЕХАНИКОЙ СБОРА ЗВЕЗД) ===
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

        {
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
        }

        _handleCellInteraction(player, targetX, targetY);
        _maybeDropStar(player, targetX, targetY);

        // Обновляем координаты игрока
        bytes32 updatedPos;
        assembly {
            let preserved := and(currentPos, 0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            let newCoords := or(shl(224, targetX), shr(32, shl(224, targetY)))
            updatedPos := or(newCoords, preserved)
        }

        mainContract.writeSector(posKey, updatedPos);
    }

    function _handleCellInteraction(address player, int32 targetX, int32 targetY) internal {
        bytes32 cellKey = getCellKey(targetX, targetY);
        bytes32 cellVal = mainContract.readSector(cellKey);
        uint8 objectType;
        assembly {
            objectType := byte(1, cellVal)
        }
        if (objectType == OBJECT_OBELISK) revert ObstacleObelisk();
        if (objectType == OBJECT_WALL) revert ObstacleWall();

        // Если наступили на Звезду — считываем её вес (state: байт 2) и минтим weight * 1 ether токенов
        if (objectType == OBJECT_STAR) {
            uint8 starWeight;
            assembly {
                starWeight := byte(2, cellVal)
            }
            uint256 weightMultiplier = starWeight > 0 ? uint256(starWeight) : 1;
            uint256 totalReward = starRewardAmount * weightMultiplier;

            bytes32 clearedCell;
            assembly {
                clearedCell := and(cellVal, 0xFF0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            }
            mainContract.writeSector(cellKey, clearedCell);

            if (address(starToken) != address(0)) {
                try starToken.mint(player, totalReward) {} catch {}
            }
            emit StarCollected(player, targetX, targetY, totalReward);
        }
    }

    /**
     * @notice Падение звезды вокруг игрока:
     * - Происходит на каждый 2-й ход (50% шанс)
     * - Выбирает случайное смещение dx, dy в радиусе [-2..2] вокруг целевой позиции игрока
     * - Случайный вес звезды: 1 или 2 токена
     * - Не перезаписывает препятствия (обелиски/стены) и позицию самого игрока
     */
    function _maybeDropStar(address player, int32 targetX, int32 targetY) internal {
        bytes32 rand = keccak256(abi.encodePacked(block.prevrandao, block.timestamp, player, targetX, targetY));
        // Шанс 50% (каждый 2-й ход)
        if (uint8(rand[0]) % 2 != 0) return;

        // Смещение dx, dy в диапазоне [-2..2]
        int32 dx = int32(uint32(uint8(rand[1]) % 5)) - 2;
        int32 dy = int32(uint32(uint8(rand[2]) % 5)) - 2;
        if (dx == 0 && dy == 0) {
            dx = 1; // не падаем под ноги игроку
        }

        int32 starX = targetX + dx;
        int32 starY = targetY + dy;
        bytes32 cellKey = getCellKey(starX, starY);
        bytes32 cellVal = mainContract.readSector(cellKey);

        uint8 obj;
        uint8 terr;
        assembly {
            terr := byte(0, cellVal)
            obj  := byte(1, cellVal)
        }

        // Не падаем на обелиски (1) или стены (2)
        if (obj == OBJECT_OBELISK || obj == OBJECT_WALL) return;

        // Вес звезды: 1 или 2
        uint8 weight = (uint8(rand[3]) % 2 == 0) ? 1 : 2;
        // Если клетки еще нет (terr == 0), генерируем песок (1)
        uint8 terrainType = terr == 0 ? 1 : terr;

        bytes32 starCell;
        assembly {
            // [terrainType: 1B][OBJECT_STAR(3): 1B][weight: 1B][reserved(0): 1B]
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(232, weight)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, weight);
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
        if (dx > 2 || dy > 2) revert MoveTooFar();

        bytes32 cellKey = getCellKey(targetX, targetY);
        bytes32 currentCell = mainContract.readSector(cellKey);
        uint8 terrain;
        assembly {
            terrain := byte(0, currentCell)
        }
        if (terrain != 0) revert CellAlreadyExists();

        // 4 байта новой клетки: terrain = 1 (Песок), object = 0, state = 0, reserved = 0
        bytes32 sandCell;
        assembly {
            sandCell := shl(248, 1)
        }
        mainContract.writeSector(cellKey, sandCell);
    }

    function _validateAndExecuteDiscoverBatch(address player, int32[] calldata xs, int32[] calldata ys) internal {
        uint256 len = xs.length;
        if (len == 0 || len > 25) revert InvalidBatchLength();
        if (len != ys.length) revert ArrayLengthMismatch();

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
        for (uint256 i = 0; i < len; ) {
            int32 targetCellX = xs[i];
            int32 targetCellY = ys[i];
            int32 dx = targetCellX - currentX;
            int32 dy = targetCellY - currentY;
            if (dx < 0) dx = -dx;
            if (dy < 0) dy = -dy;
            if (dx > 2 || dy > 2) revert MoveTooFar();

            keys[i] = getCellKey(targetCellX, targetCellY);
            unchecked { ++i; }
        }

        bytes32[] memory readCells = mainContract.readSectorBatch(keys);
        bytes32[] memory writeKeys = new bytes32[](len);
        bytes32[] memory writeData = new bytes32[](len);
        uint256 writeCount = 0;

        bytes32 sandVal;
        assembly {
            sandVal := shl(248, 1)
        }

        for (uint256 i = 0; i < len; ) {
            bytes32 cv = readCells[i];
            uint8 t;
            assembly {
                t := byte(0, cv)
            }
            if (t == 0) {
                writeKeys[writeCount] = keys[i];
                writeData[writeCount] = sandVal;
                unchecked { ++writeCount; }
            }
            unchecked { ++i; }
        }

        if (writeCount > 0) {
            bytes32[] memory finalKeys = new bytes32[](writeCount);
            bytes32[] memory finalData = new bytes32[](writeCount);
            for (uint256 i = 0; i < writeCount; ) {
                finalKeys[i] = writeKeys[i];
                finalData[i] = writeData[i];
                unchecked { ++i; }
            }
            mainContract.writeSectorBatch(finalKeys, finalData);
        }
    }

    function _saveSessionInternal(address player, address sessionKey, uint256 sessionExpiry) internal {
        bytes32 authKey = getPlayerAuthKey(player);
        bytes32 currentAuth = mainContract.readSector(authKey);

        uint32 currentNonce;
        assembly {
            currentNonce := shr(224, shl(224, currentAuth))
        }

        uint64 expiry64 = uint64(sessionExpiry);
        bytes32 newAuth;
        assembly {
            // [sessionKey: 20B][expiry: 8B][nonce: 4B]
            newAuth := or(
                or(shl(96, sessionKey), shr(64, shl(192, expiry64))),
                currentNonce
            )
        }

        mainContract.writeSector(authKey, newAuth);
    }

    function _incrementNonceInternal(address player, bytes32 authData, uint256 currentNonce) internal {
        uint32 nextNonce = uint32(currentNonce + 1);
        bytes32 updatedAuth;
        assembly {
            let preserved := and(authData, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000)
            updatedAuth := or(preserved, nextNonce)
        }
        mainContract.writeSector(getPlayerAuthKey(player), updatedAuth);
    }

    function recoverSigner(bytes32 messageHash, bytes memory sig) public pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        if (v != 27 && v != 28) {
            return address(0);
        }
        return ecrecover(messageHash, v, r, s);
    }
}
