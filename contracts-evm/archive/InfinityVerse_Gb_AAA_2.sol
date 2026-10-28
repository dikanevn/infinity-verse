// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @notice Минимальный интерфейс взаимодействия с постоянным хранилищем InfinityVerse_Main_Gb_1
 
 Этот контракт в отличии от main вообще мало проверялся на логику и безопасность, так как защищенные слоты он не сможет повредить (но это не точно).
 
 */
interface IInfinityVerse_Main_Gb_1 {
    function readSector(bytes32 sector) external view returns (bytes32);
    function readSectorBatch(
        bytes32[] calldata sectors
    ) external view returns (bytes32[] memory);
    function writeSector(bytes32 sector, bytes32 data) external;
    function writeSectorBatch(
        bytes32[] calldata sectors,
        bytes32[] calldata data
    ) external;
    function registerPlayer(address account) external returns (uint256);
    function getPlayerId(address account) external view returns (uint256);
    function getPlayerAddress(uint256 id) external view returns (address);
    function totalPlayers() external view returns (uint256);
    function createPortal(
        address targetContract,
        address founder,
        bytes32 founderName,
        bytes32 worldName
    ) external returns (uint256);
    function totalPortals() external view returns (uint256);
    function getPortal(uint256 id) external view returns (
        uint256 idOut,
        address parentContract,
        address targetContract,
        address founder,
        bytes32 founderName,
        bytes32 worldName,
        uint256 createdAt
    );
    function getPortalId(address targetContract) external view returns (uint256);
    function getPortalByFounder(address founder) external view returns (uint256);
    function transferPortalOwnership(uint256 portalId, address newOwner) external;
    function destroyPortal(uint256 portalId) external;
}

/**
 * @notice Полный интерфейс токена Ga_TTT для управления из модуля Gb_AAA_1
 */
interface IInfinityVerse_Ga_TTT {
    function mint(address to, uint256 amount) external returns (bool);
    function mintBatch(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (bool);
    function forceBurn(address from, uint256 amount) external returns (bool);
    function forceTransfer(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function setPaused(bool _paused) external;
    function setFrozenAccount(address target, bool freeze) external;
    function setAllowedMinter(address minter, bool allowed) external;
    function transferSuperAdminDirect(address newAdmin) external;
    function setNameAndSymbol(
        string memory _name,
        string memory _symbol
    ) external;
}

/**
 * @title InfinityVerse_Gb_AAA_1
 * @author Николай Диканёв (dikanevn)
 * @notice Исполнительный модуль игровой логики поколения Gb (Gb_AAA_1).
 * @dev Чистая копия Ga_AAA_2 с адаптацией под хранилище Main_Gb_1.
 * Байткод оптимизирован под runs = 4294967295.
 */
contract InfinityVerse_Gb_AAA_2 {
    string public constant CREATOR = "Nikolai Dikanev (dikanevn)";
    string public constant VERSION = "0.0.0.0.1-GB-AAA-2";
    string public constant REPOSITORY =
        "https://github.com/dikanevn/infinity-verse";

    // Префиксы секторов в Main_Gb_1
    bytes4 private constant PREFIX_CELL = 0x43454c4c; // "CELL"
    bytes4 private constant PREFIX_POS = 0x504f535f; // "POS_"
    bytes4 private constant PREFIX_AUTH = 0x41555448; // "AUTH"

    // Универсальный ключ в памяти Main_Gb_1 для хранения времени последнего майнинга
    bytes32 public constant LAST_MINED_KEY = keccak256("INFINITY_VERSE.LAST_MINED_AT");

    // Параметры эмиссии в стиле Биткоина (50 токенов за 600 секунд)
    uint256 public constant BTC_BLOCK_REWARD = 50 ether;
    uint256 public constant BTC_BLOCK_TIME = 600; // 10 минут

    // Игровые идентификаторы объектов
    uint8 public constant OBJECT_NONE = 0;
    uint8 public constant OBJECT_OBELISK = 1;
    uint8 public constant OBJECT_WALL = 2;
    uint8 public constant OBJECT_STAR = 3; // Упавшая Звезда
    uint8 public constant OBJECT_PORTAL = 4; // Врата во вложенную вселенную

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
    error SacredZoneProtected();
    error CellNotPortal();
    error PortalMustBeOnRight();

    // Структура клетки (для фронтенда)
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
        uint32 secondsWeight;
    }

    IInfinityVerse_Main_Gb_1 public mainContract;
    IInfinityVerse_Ga_TTT public starToken;
    address public superAdmin;
    address public immutable relayer;

    event StarCollected(
        address indexed player,
        int32 x,
        int32 y,
        uint256 reward
    );
    event StarDropped(int32 indexed x, int32 indexed y, uint8 weight);
    event PortalEntered(
        address indexed player,
        int32 indexed x,
        int32 indexed y,
        uint256 portalId
    );
    event PortalDirectDestroyed(
        address indexed player,
        uint256 indexed portalId,
        int32 x,
        int32 y
    );

    modifier onlySuperAdmin() {
        if (msg.sender != superAdmin) revert Unauthorized();
        _;
    }

    constructor(address _mainContract, address _relayer, address _superAdmin) {
        if (
            _mainContract == address(0) ||
            _relayer == address(0) ||
            _superAdmin == address(0)
        ) revert ZeroAddress();
        superAdmin = _superAdmin;
        mainContract = IInfinityVerse_Main_Gb_1(_mainContract);
        relayer = _relayer;
    }

    function setMainContract(address _newMain) external onlySuperAdmin {
        if (_newMain == address(0)) revert ZeroAddress();
        mainContract = IInfinityVerse_Main_Gb_1(_newMain);
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
     * @notice Передача полномочий SuperAdmin токена новому модулю логики
     */
    function transferStarTokenSuperAdmin(
        address newModule
    ) external onlySuperAdmin {
        if (address(starToken) == address(0) || newModule == address(0))
            revert ZeroAddress();
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
    function forceBurnStarToken(
        address from,
        uint256 amount
    ) external onlySuperAdmin {
        starToken.forceBurn(from, amount);
    }

    /**
     * @notice Принудительный перевод токенов через SuperAdmin
     */
    function forceTransferStarToken(
        address from,
        address to,
        uint256 amount
    ) external onlySuperAdmin {
        starToken.forceTransfer(from, to, amount);
    }

    /**
     * @notice Заморозка кошелька в токене через SuperAdmin
     */
    function setFrozenStarTokenAccount(
        address target,
        bool freeze
    ) external onlySuperAdmin {
        starToken.setFrozenAccount(target, freeze);
    }

    // ========================================================================
    // === ХЕЛПЕРЫ СЕКТОРОВ И АССЕМБЛЕРНАЯ УПАКОВКА ===
    // ========================================================================

    /**
     * @notice Расчет текущей накопленной награды за майнинг в стиле Биткоина
     * @return reward Количество токенов $INFER к начислению в wei
     * @return deltaT Прошедшее время в секундах с момента последнего появления субстанции
     * @return lastMined Время последнего успешного майнинга
     */
    function getCurrentMiningReward() external view returns (uint256 reward, uint256 deltaT, uint256 lastMined) {
        bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
        lastMined = uint256(rawLastMined);
        if (lastMined == 0) {
            deltaT = 1; // Стартовый минимальный квант (1 секунда = 0.0833 INFER)
        } else if (block.timestamp > lastMined) {
            deltaT = block.timestamp - lastMined;
        } else {
            deltaT = 1;
        }
        reward = (deltaT * BTC_BLOCK_REWARD) / BTC_BLOCK_TIME;
    }

    function getCellKey(int32 x, int32 y) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_CELL, x, y));
    }

    function getPlayerPosKey(address player) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_POS, player));
    }

    function getPlayerAuthKey(
        address player
    ) public pure returns (bytes32 key) {
        return keccak256(abi.encodePacked(PREFIX_AUTH, player));
    }

    // ========================================================================
    // === ОНЧЕЙН ГЕТТЕРЫ (VIEW) ДЛЯ ФРОНТЕНДА ===
    // ========================================================================

    function getCell(int32 x, int32 y) public view returns (Cell memory c) {
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
    }

    function getPlayer(
        address player
    )
        public
        view
        returns (
            int32 x,
            int32 y,
            bool exists,
            address sessionKey,
            uint256 sessionExpiry,
            uint64 registeredAtBlock,
            uint64 registeredAtTimestamp
        )
    {
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

    function nonces(
        address player
    ) external view returns (uint256 currentNonce) {
        bytes32 authVal = mainContract.readSector(getPlayerAuthKey(player));
        assembly {
            currentNonce := shr(224, shl(224, authVal))
        }
    }

    /**
     * @notice Получение постоянного ID жителя Мультивселенной за O(1)
     */
    function getPlayerId(address player) external view returns (uint256) {
        return mainContract.getPlayerId(player);
    }

    /**
     * @notice Получение адреса жителя по его порядковому ID за O(1)
     */
    function getPlayerAddress(uint256 id) external view returns (address) {
        return mainContract.getPlayerAddress(id);
    }

    /**
     * @notice Общее количество зарегистрированных жителей во Вселенной
     */
    function totalPlayers() external view returns (uint256) {
        return mainContract.totalPlayers();
    }

    /**
     * @notice Общее количество открытых порталов во Вселенной
     */
    function totalPortals() external view returns (uint256) {
        return mainContract.totalPortals();
    }

    /**
     * @notice Получение ID портала по адресу вложенного смарт-контракта
     */
    function getPortalId(address targetContract) external view returns (uint256) {
        return mainContract.getPortalId(targetContract);
    }

    /**
     * @notice Получение ID портала создателя (1 портал на создателя)
     */
    function getPortalByFounder(address founder) external view returns (uint256) {
        return mainContract.getPortalByFounder(founder);
    }

    function getCellsBatch(
        int32[] calldata xs,
        int32[] calldata ys
    ) external view returns (Cell[] memory cells) {
        if (xs.length != ys.length) revert ArrayLengthMismatch();
        uint256 len = xs.length;
        bytes32[] memory keys = new bytes32[](len);
        for (uint256 i = 0; i < len; ) {
            keys[i] = getCellKey(xs[i], ys[i]);
            unchecked {
                ++i;
            }
        }

        bytes32[] memory rawData = mainContract.readSectorBatch(keys);
        cells = new Cell[](len);
        for (uint256 i = 0; i < len; ) {
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

    function discoverCellsBatchDirect(
        int32[] calldata xs,
        int32[] calldata ys
    ) external {
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    function discoverBatchDirect(
        int32[] calldata xs,
        int32[] calldata ys
    ) external {
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    function authorizeSessionDirect(
        address sessionKey,
        uint256 sessionExpiry
    ) external {
        _saveSessionInternal(msg.sender, sessionKey, sessionExpiry);
    }

    function revokeSessionDirect() external {
        _saveSessionInternal(msg.sender, address(0), 0);
    }

    /**
     * @notice Открытие Врат во вложенную вселенную с материализацией на карте!
     * @param targetContract Адрес смарт-контракта вложенного мира
     * @param founderName Имя основателя (до 32 байт)
     * @param worldName Название мира (до 32 байт)
     * @param portalX Координата X для установки Врат на карте
     * @param portalY Координата Y для установки Врат на карте
     * @return portalId Уникальный сквозной номер созданного портала
     */
    function createPortalDirect(
        address targetContract,
        bytes32 founderName,
        bytes32 worldName,
        int32 portalX,
        int32 portalY
    ) external returns (uint256 portalId) {
        // Защита священной зоны 5x5 вокруг Обелиска (0, 0)
        if (portalX >= -2 && portalX <= 2 && portalY >= -2 && portalY <= 2) {
            revert SacredZoneProtected();
        }

        // 1. Проверяем, что игрок уже родился/существует в этом мире
        bytes32 posKey = getPlayerPosKey(msg.sender);
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

        // Портал разрешено ставить ТОЛЬКО строго справа от игрока (+1 по X, то же Y)
        if (portalX != currentX + 1 || portalY != currentY) {
            revert PortalMustBeOnRight();
        }

        // 2. Регистрируем портал в священном хранилище Main_Gb_1 (проверка 1 на человека, O(1) слоты)
        portalId = mainContract.createPortal(targetContract, msg.sender, founderName, worldName);

        // 3. Материализуем Врата на указанной клетке карты
        bytes32 cellKey = getCellKey(portalX, portalY);
        bytes32 currentCell = mainContract.readSector(cellKey);
        uint8 terr;
        assembly {
            terr := byte(0, currentCell)
        }
        uint8 terrainType = terr == 0 ? 1 : terr;

        bytes32 portalCell;
        uint16 pId16 = uint16(portalId);
        assembly {
            // [terrainType: 1B][OBJECT_PORTAL(4): 1B][portalId: 2B (байты state и reserved)]
            portalCell := or(
                or(shl(248, terrainType), shl(240, 4)),
                shl(224, pId16)
            )
        }
        mainContract.writeSector(cellKey, portalCell);
    }

    /**
     * @notice Передача прав владения порталом другому игроку через игровой модуль.
     * @param portalId ID существующего портала
     * @param newOwner Новый адрес владельца портала
     */
    function transferPortalDirect(
        uint256 portalId,
        address newOwner
    ) external {
        (, , , address founder, , , ) = mainContract.getPortal(portalId);
        if (msg.sender != founder) revert Unauthorized();
        mainContract.transferPortalOwnership(portalId, newOwner);
    }

    /**
     * @notice Уничтожение портала с одновременным сносом тайла Врат на карте!
     * @param portalId ID уничтожаемого портала
     * @param portalX Координата X тайла портала на карте
     * @param portalY Координата Y тайла портала на карте
     */
    function destroyPortalDirect(
        uint256 portalId,
        int32 portalX,
        int32 portalY
    ) external {
        // 0. Проверяем, что вызывающий - владелец портала
        (, , , address founder, , , ) = mainContract.getPortal(portalId);
        if (msg.sender != founder) revert Unauthorized();

        // 1. Уничтожаем портал в священном хранилище Main_Gb_1
        mainContract.destroyPortal(portalId);

        // 2. Проверяем тайл на карте и сносим объект Врат
        bytes32 cellKey = getCellKey(portalX, portalY);
        bytes32 currentCell = mainContract.readSector(cellKey);
        uint8 obj;
        uint8 terr;
        assembly {
            terr := byte(0, currentCell)
            obj := byte(1, currentCell)
        }
        if (obj != OBJECT_PORTAL) revert CellNotPortal();

        uint8 terrainType = terr == 0 ? 1 : terr;
        bytes32 clearedCell;
        assembly {
            // [terrainType: 1B][OBJECT_EMPTY(0): 1B][state: 0][reserved: 0]
            clearedCell := shl(248, terrainType)
        }
        mainContract.writeSector(cellKey, clearedCell);

        emit PortalDirectDestroyed(msg.sender, portalId, portalX, portalY);
    }

    // ========================================================================
    // === GASLESS ДЕЙСТВИЯ (ЧЕРЕЗ RELAYER С ПОДПИСЬЮ EIP-191) ===
    // ========================================================================

    function authorizeSessionGasless(
        address player,
        address sessionKey,
        uint256 expiry,
        bytes calldata sig
    ) external {
        if (block.timestamp >= expiry) revert SessionExpired();
        if (sessionKey == address(0)) revert InvalidSessionKey();

        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        uint256 currentNonce;
        assembly {
            currentNonce := shr(224, shl(224, authData))
        }

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        "AuthorizeSession",
                        player,
                        sessionKey,
                        expiry,
                        currentNonce,
                        block.chainid
                    )
                )
            )
        );

        address signer = recoverSigner(messageHash, sig);
        if (signer != player) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _saveSessionInternal(player, sessionKey, expiry);
    }

    function revokeSessionGasless(address player, bytes calldata sig) external {
        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        uint256 currentNonce;
        assembly {
            currentNonce := shr(224, shl(224, authData))
        }

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        "RevokeSession",
                        player,
                        currentNonce,
                        block.chainid
                    )
                )
            )
        );

        address signer = recoverSigner(messageHash, sig);
        if (signer != player) revert InvalidSignature();

        _incrementNonceInternal(player, authData, currentNonce);
        _saveSessionInternal(player, address(0), 0);
    }

    function spawnGasless(address player, bytes calldata sig) external {
        if (msg.sender != relayer && msg.sender != superAdmin)
            revert Unauthorized();

        bytes32 authData = mainContract.readSector(getPlayerAuthKey(player));
        uint256 currentNonce;
        assembly {
            currentNonce := shr(224, shl(224, authData))
        }

        bytes32 spawnHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        "Spawn",
                        player,
                        currentNonce,
                        block.chainid
                    )
                )
            )
        );

        address signer = recoverSigner(spawnHash, sig);
        address activeKey;
        uint256 expiry;
        assembly {
            activeKey := shr(96, authData)
            expiry := shr(192, shl(160, authData))
        }
        bool isSessionAuth = (activeKey != address(0) && block.timestamp < expiry && signer == activeKey);
        if (signer != player && !isSessionAuth) revert InvalidSignature();

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

        if (activeKey == address(0) || block.timestamp >= expiry)
            revert SessionExpired();

        bytes32 moveHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        "Move",
                        player,
                        targetX,
                        targetY,
                        currentNonce,
                        block.chainid
                    )
                )
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

        if (activeKey == address(0) || block.timestamp >= expiry)
            revert SessionExpired();

        bytes32 batchHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        "DiscoverBatch",
                        player,
                        keccak256(abi.encodePacked(xs)),
                        keccak256(abi.encodePacked(ys)),
                        currentNonce,
                        block.chainid
                    )
                )
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

    function _executeSpawn(
        address player
    ) internal returns (int32 startX, int32 startY) {
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
                or(shl(120, blockNum), shl(56, curTime))
            )
        }

        mainContract.writeSector(posKey, packed);

        // Священная регистрация жителя во Вселенной (O(1) ончейн-запись или подтягивание древнего ID)
        mainContract.registerPlayer(player);
    }

    function _validateAndExecuteMove(
        address player,
        int32 targetX,
        int32 targetY
    ) internal {
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
            let preserved := and(
                currentPos,
                0x0000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
            )
            let newCoords := or(shl(224, targetX), shr(32, shl(224, targetY)))
            updatedPos := or(newCoords, preserved)
        }

        mainContract.writeSector(posKey, updatedPos);
    }

    function _handleCellInteraction(
        address player,
        int32 targetX,
        int32 targetY
    ) internal {
        bytes32 cellKey = getCellKey(targetX, targetY);
        bytes32 cellVal = mainContract.readSector(cellKey);
        uint8 objectType;
        assembly {
            objectType := byte(1, cellVal)
        }
        if (objectType == OBJECT_OBELISK) revert ObstacleObelisk();
        if (objectType == OBJECT_WALL) revert ObstacleWall();

        // Если наступили на Врата/Портал во вложенный мир — считываем portalId и эмитим событие входа
        if (objectType == OBJECT_PORTAL) {
            uint16 portalId;
            assembly {
                portalId := shr(240, shl(16, cellVal))
            }
            emit PortalEntered(player, targetX, targetY, uint256(portalId));
        }

        // Если наступили на Звезду — считываем её вес (state: байт 2) и минтим weight * 1 ether токенов
        if (objectType == OBJECT_STAR) {
            uint32 sw;
            assembly {
                // Извлекаем 4 байта secondsWeight (байты 2..5)
                sw := shr(224, shl(16, cellVal))
            }
            uint256 durationSec = sw > 0 ? uint256(sw) : 1;
            // Точный расчет в wei: 50 токенов за 600 секунд (1 сек = ~0.083333333333333333 ether)
            uint256 totalReward = (durationSec * BTC_BLOCK_REWARD) / BTC_BLOCK_TIME;

            // Очищаем клетку от субстанции и её 4 байт веса (сбрасываем байты 1..5)
            bytes32 clearedCell;
            assembly {
                clearedCell := and(
                    cellVal,
                    0xFF0000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                )
            }
            mainContract.writeSector(cellKey, clearedCell);

            if (address(starToken) != address(0) && totalReward > 0) {
                try starToken.mint(player, totalReward) {} catch {}
            }
            emit StarCollected(player, targetX, targetY, totalReward);
        }
    }

    /**
     * @notice Падение звезды вокруг игрока:
     * - Происходит на каждый 2-й ход (50% шанс)
     * - Выбирает случайное смещение dx, dy в радиусе [-2..2] в зоне 5x5 вокруг целевой позиции игрока
     * - Если звезда падает прямо червю на голову (dx == 0 && dy == 0), он сразу её съедает и получает токены!
     * - Случайный вес звезды: 1 или 2 токена
     * - Не перезаписывает препятствия (обелиски/стены) и порталы
     */
    function _maybeDropStar(
        address player,
        int32 targetX,
        int32 targetY
    ) internal {
        bytes32 rand = keccak256(
            abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                player,
                targetX,
                targetY
            )
        );
        // Шанс 50% (каждый 2-й ход)
        if (uint8(rand[0]) % 2 != 0) return;

        // Смещение dx, dy в диапазоне [-2..2] (любая из 25 клеток 5x5)
        int32 dx = int32(uint32(uint8(rand[1]) % 5)) - 2;
        int32 dy = int32(uint32(uint8(rand[2]) % 5)) - 2;

        int32 starX = targetX + dx;
        int32 starY = targetY + dy;

        // Квантовая субстанция не может появляться там, где игрок (dx == 0 && dy == 0)
        if (dx == 0 && dy == 0) return;

        bytes32 cellKey = getCellKey(starX, starY);
        bytes32 cellVal = mainContract.readSector(cellKey);

        uint8 obj;
        uint8 terr;
        assembly {
            terr := byte(0, cellVal)
            obj := byte(1, cellVal)
        }

        // Квантовая субстанция не может появляться там, где уже есть ЛЮБОЙ объект (обелиск 1, стена 2, портал 4, другая звезда 3 и т.д.)
        if (obj != 0) return;

        // Если клетки еще нет (terr == 0), генерируем песок (1)
        uint8 terrainType = terr == 0 ? 1 : terr;

        // --- РАСЧЕТ МАЙНИНГА В СЕКУНДАХ В МОМЕНТ МАТЕРИАЛИЗАЦИИ СУБСТАНЦИИ ---
        bytes32 rawLastMined = mainContract.readSector(LAST_MINED_KEY);
        uint256 lastMined = uint256(rawLastMined);
        uint256 deltaT;
        if (lastMined == 0) {
            deltaT = 1; // Стартовый минимальный квант (1 секунда = 0.0833 INFER)
        } else if (block.timestamp > lastMined) {
            deltaT = block.timestamp - lastMined;
        } else {
            deltaT = 1; // При одном блоке минимальный квант 1 секунда
        }

        if (deltaT > type(uint32).max) {
            deltaT = type(uint32).max;
        }
        uint32 secondsWeight = uint32(deltaT);

        // Обновляем время последнего майнинга в памяти Main_Gb_1
        mainContract.writeSector(LAST_MINED_KEY, bytes32(block.timestamp));

        // Пакуем в 32 байта: [terrainType: 1B][OBJECT_STAR(3): 1B][secondsWeight: 4B (uint32)]
        bytes32 starCell;
        assembly {
            starCell := or(
                or(shl(248, terrainType), shl(240, 3)),
                shl(208, secondsWeight)
            )
        }

        mainContract.writeSector(cellKey, starCell);
        emit StarDropped(starX, starY, uint8(secondsWeight > 255 ? 255 : secondsWeight));
    }

    function _validateAndExecuteDiscoverCell(
        address player,
        int32 targetX,
        int32 targetY
    ) internal {
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

    function _validateAndExecuteDiscoverBatch(
        address player,
        int32[] calldata xs,
        int32[] calldata ys
    ) internal {
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
            unchecked {
                ++i;
            }
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
                unchecked {
                    ++writeCount;
                }
            }
            unchecked {
                ++i;
            }
        }

        if (writeCount > 0) {
            bytes32[] memory finalKeys = new bytes32[](writeCount);
            bytes32[] memory finalData = new bytes32[](writeCount);
            for (uint256 i = 0; i < writeCount; ) {
                finalKeys[i] = writeKeys[i];
                finalData[i] = writeData[i];
                unchecked {
                    ++i;
                }
            }
            mainContract.writeSectorBatch(finalKeys, finalData);
        }
    }

    function _saveSessionInternal(
        address player,
        address sessionKey,
        uint256 sessionExpiry
    ) internal {
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
            // sessionKey занимает старшие 160 бит (shl(96, sessionKey))
            // expiry занимает следующие 64 бита (shl(32, expiry64))
            // nonce занимает младшие 32 бита (currentNonce)
            newAuth := or(
                or(shl(96, sessionKey), shl(32, expiry64)),
                currentNonce
            )
        }

        mainContract.writeSector(authKey, newAuth);
    }

    function _incrementNonceInternal(
        address player,
        bytes32 authData,
        uint256 currentNonce
    ) internal {
        uint32 nextNonce = uint32(currentNonce + 1);
        bytes32 updatedAuth;
        assembly {
            let preserved := and(
                authData,
                0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000
            )
            updatedAuth := or(preserved, nextNonce)
        }
        mainContract.writeSector(getPlayerAuthKey(player), updatedAuth);
    }

    function recoverSigner(
        bytes32 messageHash,
        bytes memory sig
    ) public pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (
            uint256(s) >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) {
            return address(0);
        }
        if (v != 27 && v != 28) {
            return address(0);
        }
        return ecrecover(messageHash, v, r, s);
    }
}
