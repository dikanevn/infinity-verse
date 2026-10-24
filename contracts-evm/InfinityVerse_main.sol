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

    // Адрес активного логического контракта AAA
    address public contractAAA;

    // Адрес администратора (в будущем передается на DAO или Dead-адрес)
    address public admin;

    event ContractAAASet(address indexed newContractAAA);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    event PlayerSpawned(address indexed player, int32 x, int32 y);
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event SessionAuthorized(address indexed player, address indexed sessionKey, uint256 expiry);
    event SessionRevoked(address indexed player);

    // Модификатор: вызовы разрешены только администратору (или DAO)
    modifier onlyAdmin() {
        require(msg.sender == admin, unicode"Main: Вызов разрешен только администратору");
        _;
    }

    // Модификатор: вызовы разрешены только текущему контракту AAA
    modifier onlyContractAAA() {
        require(msg.sender == contractAAA, unicode"Main: Вызов разрешен только контракту AAA");
        _;
    }


    constructor() {
        admin = msg.sender;

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

    // ========================================================================
    // === АДМИНИСТРИРОВАНИЕ И МОДУЛЬНОСТЬ (DAO / MULTISIG) ===
    // ========================================================================

    /**
     * @notice Установка адреса контракта логики AAA администратором (или DAO)
     * @dev Только активный контракт AAA получает право изменять состояние мира
     * @param _contractAAA Адрес нового развернутого контракта логики
     */
    function setContractAAA(address _contractAAA) external onlyAdmin {
        require(_contractAAA != address(0), unicode"Main: Некорректный адрес контракта AAA");
        contractAAA = _contractAAA;
        emit ContractAAASet(_contractAAA);
    }

    /**
     * @notice Передача прав администратора на новый адрес
     * @dev В будущем используется для передачи управления смарт-контракту DAO или 0x...dead
     * @param newAdmin Адрес нового администратора
     */
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), unicode"Main: Новый админ не может быть нулевым адресом");
        require(newAdmin != admin, unicode"Main: Адрес уже является текущим админом");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    // ========================================================================
    // === VIEW МЕТОДЫ ДЛЯ ЧТЕНИЯ КЛИЕНТОМ И ЛОГИКОЙ ===
    // ========================================================================

    /**
     * @notice Получение 32-байтного ключа клетки в хранилище по координатам (x, y)
     * @dev Чистая математическая функция хеширования Keccak-256 без чтения состояния
     * @param x Координата X
     * @param y Координата Y
     * @return 32-байтный хеш-ключ для mapping(bytes32 => Cell)
     */
    function getCellKey(int32 x, int32 y) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    /**
     * @notice Получение данных одной клетки по координатам (x, y)
     * @param x Координата X
     * @param y Координата Y
     * @return Структура Cell (ландшафт, объект, состояние, резерв)
     */
    function getCell(int32 x, int32 y) external view returns (Cell memory) {
        return cells[getCellKey(x, y)];
    }

    /**
     * @notice Пакетное (батч) чтение массива клеток за один RPC-запрос
     * @dev Используется фронтендом для мгновенной загрузки всей видимой области карты
     * @param xs Массив координат X
     * @param ys Массив координат Y
     * @return result Массив структур Cell для каждой запрошенной координаты
     */
    function getCellsBatch(
        int32[] calldata xs,
        int32[] calldata ys
    ) external view returns (Cell[] memory) {
        require(xs.length == ys.length, unicode"Main: Несовпадение длины массивов координат");
        uint256 total = xs.length;
        Cell[] memory result = new Cell[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = cells[getCellKey(xs[i], ys[i])];
        }
        return result;
    }

    /**
     * @notice Получение базовых параметров игрока для фронтенда и логики
     * @param player Адрес кошелька игрока
     * @return x Текущая координата X
     * @return y Текущая координата Y
     * @return exists Флаг, рожден ли игрок в мире
     * @return sessionKey Адрес временного сессионного ключа
     * @return sessionExpiry Время истечения сессии (unix timestamp)
     */
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
    // === STATE MUTATION (ТОЛЬКО ДЛЯ АКТИВНОГО КОНТРАКТА AAA) ===
    // ========================================================================

    /**
     * @notice Изменение данных клетки мира
     * @dev Вызывается только авторизованным логическим контрактом AAA
     * @param x Координата X
     * @param y Координата Y
     * @param cellData Новые упакованные данные клетки (4 байта)
     */
    function setCell(int32 x, int32 y, Cell calldata cellData) external onlyContractAAA {
        bytes32 key = getCellKey(x, y);
        cells[key] = cellData;
        emit CellUpdated(x, y, cellData.terrain, cellData.object);
    }

    /**
     * @notice Рождение (спавн) нового игрока в игровом мире
     * @dev Вызывается только контрактом AAA после проверки правил спавна
     * @param player Адрес кошелька игрока
     * @param startX Начальная координата X
     * @param startY Начальная координата Y
     */
    function spawnPlayer(address player, int32 startX, int32 startY) external onlyContractAAA {
        require(!players[player].exists, unicode"Main: Игрок уже родился в этом мире");
        players[player].x = startX;
        players[player].y = startY;
        players[player].exists = true;
        players[player].lastMoveBlock = block.number;
        emit PlayerSpawned(player, startX, startY);
    }

    /**
     * @notice Перемещение игрока на новые координаты
     * @dev Вызывается только контрактом AAA после валидации шага и препятствий
     * @param player Адрес игрока
     * @param toX Целевая координата X
     * @param toY Целевая координата Y
     */
    function movePlayer(address player, int32 toX, int32 toY) external onlyContractAAA {
        Player storage p = players[player];
        int32 fromX = p.x;
        int32 fromY = p.y;

        p.x = toX;
        p.y = toY;
        p.lastMoveBlock = block.number;
        emit PlayerMoved(player, fromX, fromY, toX, toY);
    }

    /**
     * @notice Запись активного сессионного ключа игрока
     * @dev Вызывается контрактом AAA после проверки EIP-191 подписи владельца кошелька
     * @param player Адрес игрока
     * @param sessionKey Временный сессионный ключ
     * @param expiry Время истечения сессии
     */
    function setPlayerSession(address player, address sessionKey, uint256 expiry) external onlyContractAAA {
        players[player].sessionKey = sessionKey;
        players[player].sessionExpiry = expiry;
        emit SessionAuthorized(player, sessionKey, expiry);
    }

    /**
     * @notice Досрочный отзыв сессионного ключа игрока
     * @dev Обнуляет sessionKey и sessionExpiry в хранилище
     * @param player Адрес игрока
     */
    function revokePlayerSession(address player) external onlyContractAAA {
        players[player].sessionKey = address(0);
        players[player].sessionExpiry = 0;
        emit SessionRevoked(player);
    }

    /**
     * @notice Атомарный инкремент персонального нонса игрока
     * @dev Предотвращает replay-атаки сессионных подписей
     * @param player Адрес игрока
     * @return Предыдущее значение нонса перед увеличением на 1
     */
    function incrementNonce(address player) external onlyContractAAA returns (uint256) {
        return nonces[player]++;
    }

}
