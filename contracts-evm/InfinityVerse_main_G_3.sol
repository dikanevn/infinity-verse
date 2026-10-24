// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInfinityVerse_PrevMain {
    function admin() external view returns (address);
    function contractAAA() external view returns (address);
    function nextMain() external view returns (address);
    function getAllowedContracts() external view returns (address[] memory);
}

/**
 * @title InfinityVerse_Main_G_1
 * @notice Вечное хранилище состояния мира (State Keeper) - Поколение 1 (G_1).
 * Хранит координаты мира, структуру клеток (4 байта) и реестр игроков.
 * Вся игровая логика вынесена во внешние контракты-исполнители (AAA, BBB, CCC...),
 * которые могут параллельно выполнять свои роли или заменяться по протоколу эволюции.
 *
 * ============================================================================
 * === РЕГЛАМЕНТ ЭВОЛЮЦИИ И СМЕНЫ ПОКОЛЕНИЙ (STATE GENERATIONS HANDSHAKE) ===
 * ============================================================================
 * 1. Иерархия: поколения именуются Main_G_1, Main_G_2, ..., Main_G_N (Эволюция).
 * 2. Рождение нового поколения (G_{N+1}):
 *    - При развертывании Main_G_{N+1} в конструктор передается адрес Main_G_N.
 *    - Для Main_G_1: prevMain = address(0) или 0x...dEaD.
 *    - Для Main_G_{N+1}: конструктор проверяет, что предок Main_G_N полностью готов:
 *      * prevAdmin == 0x000000000000000000000000000000000000dEaD (админ сожжен)
 *      * allowedContractsList.length == 0 && contractAAA == address(0) (вся логика отключена)
 *      * prevMain.nextMain() == address(this) (предок явно утвердил этого наследника).
 * 3. Ритуал цементирования старого поколения (Main_G_N) — ЗОЛОТОЙ КАНОН:
 *    - Шаг 1 (Зачистка логики):
 *      * Если использовался contractAAA: вызов setContractAAA(address(0)) автоматически обнуляет
 *        переменную и САМ удаляет контракт из allowedContractsList (два действия в одном!).
 *      * Для остальных дополнительных модулей (BBB, CCC...): вызов disallowContract(module).
 *      * ИТОГ ШАГА 1: contractAAA == address(0) и allowedContractsList.length == 0.
 *        Мутации мира остановлены намертво. Нонс деплоера после этого может быть любым.
 *    - Шаг 2 (Фиксация преемника с фиксированным нонсом + 2):
 *      Так как после этого остаётся ровно ОДНА транзакция сжигания админа, будущий адрес
 *      нового поколения Main_G_{N+1} ВСЕГДА строго равен:
 *      futureAddress = getContractAddress(deployer, currentNonce + 2).
 *      Вызываем: setNextMain(futureAddress).
 *    - Шаг 3 (Сжигание админа):
 *      Вызываем changeAdmin(0x000000000000000000000000000000000000dEaD).
 *      (Защита changeAdmin физически запретит вызов, если логика не отключена или nextMain не задан!)
 *    - Шаг 4 (Рождение поколения N+1):
 *      Деплой Main_G_{N+1} ровно на нонсе (currentNonce + 2). Конструктор сверяет адрес предка,
 *      проверяет сожжение админа и запечатывание логики. Мир переходит в новую эпоху!
 *    - Шаг 5 (Подключение логических модулей к новому поколению):
 *      * В каждом модуле логики (AAA, BBB, CCC...): вызов logic.setMainContract(address_G_{N+1}),
 *        чтобы модуль переключил свои вызовы на новое хранилище.
 *      * В новом Main_G_{N+1}: вызов setContractAAA(logic) или allowContract(logic), чтобы дать
 *        модулю право изменять состояние нового мира.
 * 4. Преемственность игроков (История происхождения):
 *    - При регистрации игрока фиксируются registeredAtBlock и registeredAtTimestamp.
 *    - Клиент и контракты опрашивают цепочку prevMain назад: если игрок уже родился
 *      в раннем поколении, его статус и дата рождения сохраняются навечно.
 * ============================================================================
 */
contract InfinityVerse_Main_G_3 {
    string public constant VERSION = "0.0.0.0.9-MAIN-G-3";
    uint256 public constant GENERATION = 3;
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

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
        uint64 registeredAtBlock;     // Номер блока Monad при спавне
        uint64 registeredAtTimestamp; // Точное время регистрации (unix timestamp)
    }

    // Постоянное ончейн-состояние мира
    mapping(bytes32 => Cell) public cells;
    mapping(address => Player) public players;
    mapping(address => uint256) public nonces;

    // Иерархия поколений хранилища Main
    uint256 public immutable generation;    // Номер поколения (1, 2, ..., N)
    uint64 public immutable deployedAt;     // Timestamp создания этого контракта
    address public immutable prevMain;      // Адрес предка (для Gen 1 = address(0) или dead)

    address public nextMain;                // Адрес следующего поколения (наследника)

    // Адрес активного логического контракта AAA (для обратной совместимости)
    address public contractAAA;

    // Мульти-логика: реестр разрешенных исполнителей (AAA, BBB, CCC...)
    mapping(address => bool) public allowedContracts;
    address[] public allowedContractsList;

    // Адрес администратора (в будущем передается на DAO или Dead-адрес)
    address public admin;

    event ContractAAASet(address indexed newContractAAA);
    event ContractAllowed(address indexed contractAddress);
    event ContractDisallowed(address indexed contractAddress);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event NextMainSet(address indexed nextMainAddress);
    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    event PlayerSpawned(address indexed player, int32 x, int32 y, uint64 registeredAtBlock, uint64 registeredAtTimestamp);
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event SessionAuthorized(address indexed player, address indexed sessionKey, uint256 expiry);
    event SessionRevoked(address indexed player);

    // Модификатор: вызовы разрешены только администратору (или DAO)
    modifier onlyAdmin() {
        require(msg.sender == admin, unicode"Main: Вызов разрешен только администратору");
        _;
    }

    // Модификатор: вызовы разрешены любому авторизованному контракту логики (AAA, BBB и т.д.)
    modifier onlyAllowedContracts() {
        require(
            allowedContracts[msg.sender] || msg.sender == contractAAA,
            unicode"Main: Вызов разрешен только авторизованному контракту логики"
        );
        _;
    }


    constructor(uint256 _generation, address _prevMain) {
        if (_prevMain != address(0) && _prevMain != 0x000000000000000000000000000000000000dEaD) {
            // Проверка запечатывания предыдущего поколения:
            // 1. Админ старого контракта должен быть сожжен на Dead-адрес
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).admin();
            require(
                prevAdmin == 0x000000000000000000000000000000000000dEaD,
                unicode"Main: Админ предыдущего поколения еще не сожжен (не dead)"
            );

            // 2. Все контракты логики старого контракта должны быть отключены
            try IInfinityVerse_PrevMain(_prevMain).getAllowedContracts() returns (address[] memory prevList) {
                require(
                    prevList.length == 0,
                    unicode"Main: Список логических контрактов предыдущего поколения не пуст"
                );
            } catch {
                // Если предок старой версии без getAllowedContracts, проверяем contractAAA
                address prevAAA = IInfinityVerse_PrevMain(_prevMain).contractAAA();
                require(
                    prevAAA == address(0),
                    unicode"Main: Логика предыдущего поколения еще не отключена"
                );
            }

            // 3. Старый контракт обязан явно указать этот новый контракт своим наследником
            require(
                IInfinityVerse_PrevMain(_prevMain).nextMain() == address(this),
                unicode"Main: Этот контракт не зарегистрирован как nextMain в предыдущем поколении"
            );
        }

        admin = msg.sender;
        generation = _generation;
        prevMain = _prevMain;
        deployedAt = uint64(block.timestamp);

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
     * @dev Для обратной совместимости. Также автоматически добавляет/заменяет адрес в allowedContracts
     * @param _contractAAA Адрес нового развернутого контракта логики AAA
     */
    function setContractAAA(address _contractAAA) external onlyAdmin {
        if (contractAAA != address(0) && allowedContracts[contractAAA]) {
            allowedContracts[contractAAA] = false;
            _removeAllowedContract(contractAAA);
            emit ContractDisallowed(contractAAA);
        }

        contractAAA = _contractAAA;
        if (_contractAAA != address(0) && !allowedContracts[_contractAAA]) {
            allowedContracts[_contractAAA] = true;
            allowedContractsList.push(_contractAAA);
            emit ContractAllowed(_contractAAA);
        }

        emit ContractAAASet(_contractAAA);
    }

    /**
     * @notice Авторизация дополнительного контракта логики (BBB, CCC и др.)
     * @param logicContract Адрес контракта игровой логики
     */
    function allowContract(address logicContract) external onlyAdmin {
        require(logicContract != address(0), unicode"Main: Адрес логики не может быть нулевым");
        require(!allowedContracts[logicContract], unicode"Main: Контракт уже авторизован");
        allowedContracts[logicContract] = true;
        allowedContractsList.push(logicContract);
        emit ContractAllowed(logicContract);
    }

    /**
     * @notice Отзыв авторизации у контракта логики
     * @param logicContract Адрес отзываемого контракта
     */
    function disallowContract(address logicContract) external onlyAdmin {
        require(allowedContracts[logicContract], unicode"Main: Контракт не авторизован");
        allowedContracts[logicContract] = false;
        _removeAllowedContract(logicContract);
        if (contractAAA == logicContract) {
            contractAAA = address(0);
        }
        emit ContractDisallowed(logicContract);
    }

    /**
     * @notice Получение полного списка всех авторизованных контрактов логики
     */
    function getAllowedContracts() external view returns (address[] memory) {
        return allowedContractsList;
    }

    function _removeAllowedContract(address logicContract) internal {
        uint256 len = allowedContractsList.length;
        for (uint256 i = 0; i < len; i++) {
            if (allowedContractsList[i] == logicContract) {
                allowedContractsList[i] = allowedContractsList[len - 1];
                allowedContractsList.pop();
                break;
            }
        }
    }

    /**
     * @notice Установка адреса следующего поколения Main (наследника)
     * @dev Вызывается администратором при миграции на новое поколение мира
     * @param _nextMain Адрес контракта-наследника Main
     */
    function setNextMain(address _nextMain) external onlyAdmin {
        require(_nextMain != address(0), unicode"Main: Некорректный адрес следующего Main");
        require(nextMain == address(0), unicode"Main: Следующий Main уже зафиксирован");
        nextMain = _nextMain;
        emit NextMainSet(_nextMain);
    }

    /**
     * @notice Передача прав администратора на новый адрес
     * @dev При финализации миграции передается на 0x...dEaD. Для защиты от ошибок сжечь админа
     * можно только если:
     * 1) Следующее поколение зафиксировано (nextMain != address(0)).
     * 2) ВСЕ контракты логики текущего поколения полностью отключены (allowedContractsList пуст и contractAAA == address(0)).
     * @param newAdmin Адрес нового администратора
     */
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), unicode"Main: Новый админ не может быть нулевым адресом");
        require(newAdmin != admin, unicode"Main: Адрес уже является текущим админом");

        if (newAdmin == 0x000000000000000000000000000000000000dEaD) {
            require(nextMain != address(0), unicode"Main: Сначала зафиксируйте nextMain перед сжиганием админа");
            require(
                contractAAA == address(0) && allowedContractsList.length == 0,
                unicode"Main: Отключите все контракты логики (список должен быть пуст) перед сжиганием админа"
            );
        }

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
     * @return registeredAtBlock Номер блока Monad при рождении
     * @return registeredAtTimestamp Время регистрации игрока
     */
    function getPlayer(address player) external view returns (
        int32 x,
        int32 y,
        bool exists,
        address sessionKey,
        uint256 sessionExpiry,
        uint64 registeredAtBlock,
        uint64 registeredAtTimestamp
    ) {
        Player memory p = players[player];
        return (p.x, p.y, p.exists, p.sessionKey, p.sessionExpiry, p.registeredAtBlock, p.registeredAtTimestamp);
    }

    // ========================================================================
    // === STATE MUTATION (ДЛЯ АКТИВНЫХ КОНТРАКТОВ ЛОГИКИ AAA, BBB, CCC...) ===
    // ========================================================================

    /**
     * @notice Изменение данных клетки мира
     * @dev Вызывается только авторизованным логическим контрактом (AAA, BBB и т.д.)
     * @param x Координата X
     * @param y Координата Y
     * @param cellData Новые упакованные данные клетки (4 байта)
     */
    function setCell(int32 x, int32 y, Cell calldata cellData) external onlyAllowedContracts {
        bytes32 key = getCellKey(x, y);
        cells[key] = cellData;
        emit CellUpdated(x, y, cellData.terrain, cellData.object);
    }

    /**
     * @notice Рождение (спавн) нового игрока в игровом мире
     * @dev Вызывается только авторизованным логическим контрактом после проверки правил спавна
     * @param player Адрес кошелька игрока
     * @param startX Начальная координата X
     * @param startY Начальная координата Y
     */
    function spawnPlayer(address player, int32 startX, int32 startY) external onlyAllowedContracts {
        require(!players[player].exists, unicode"Main: Игрок уже родился в этом мире");
        players[player].x = startX;
        players[player].y = startY;
        players[player].exists = true;
        players[player].lastMoveBlock = block.number;
        players[player].registeredAtBlock = uint64(block.number);
        players[player].registeredAtTimestamp = uint64(block.timestamp);
        emit PlayerSpawned(player, startX, startY, uint64(block.number), uint64(block.timestamp));
    }

    /**
     * @notice Перемещение игрока на новые координаты
     * @dev Вызывается только авторизованным логическим контрактом после валидации шага и препятствий
     * @param player Адрес игрока
     * @param toX Целевая координата X
     * @param toY Целевая координата Y
     */
    function movePlayer(address player, int32 toX, int32 toY) external onlyAllowedContracts {
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
     * @dev Вызывается логическим контрактом после проверки EIP-191 подписи владельца кошелька
     * @param player Адрес игрока
     * @param sessionKey Временный сессионный ключ
     * @param expiry Время истечения сессии
     */
    function setPlayerSession(address player, address sessionKey, uint256 expiry) external onlyAllowedContracts {
        players[player].sessionKey = sessionKey;
        players[player].sessionExpiry = expiry;
        emit SessionAuthorized(player, sessionKey, expiry);
    }

    /**
     * @notice Досрочный отзыв сессионного ключа игрока
     * @dev Обнуляет sessionKey и sessionExpiry в хранилище
     * @param player Адрес игрока
     */
    function revokePlayerSession(address player) external onlyAllowedContracts {
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
    function incrementNonce(address player) external onlyAllowedContracts returns (uint256) {
        return nonces[player]++;
    }

}
