// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IInfinityVerse_PrevMain {
    function superAdmin() external view returns (address);
    function nextMain() external view returns (address);
    function allowedAdminsCount() external view returns (uint256);
    function totalGenerations() external view returns (uint256);
    function getGeneration(uint256 genNumber) external view returns (address);
    function totalPlayers() external view returns (uint256);
    function getPlayerAddress(uint256 id) external view returns (address);
    function getPlayerId(address account) external view returns (uint256);
    function totalPortals() external view returns (uint256);
    function getPortalId(address targetContract) external view returns (uint256);
    function getPortalByFounder(address founder) external view returns (uint256);
}

/**
 * @title InfinityVerse_Main_Gb_1
 * @author Николай Диканёв (dikanevn)
 *
 * Тут наверно много галлюцинаций от ИИ если чё
 * 1
 * 3
 *
 * СуперАдмин должен каждые 5 дней а лучше каждый день нажимать IAmHere. Так задумано пока активная разработка.
 *
 * Админы со вторым уровнем доступа могут переписать весь маппинг, так и задумано.
 *
 * Events специально нету в каждом пуке для экономии газа.
 *
 * Новые Эпохи создаются CREATE2 методом через специальные контракты-прокси стандартные, соль-адрес суперАдмина, для детерменированного nextMain
 * @notice Главный контракт и вечный универсальный ончейн-накопитель мультивселенной Infinity-Verse.
 * Создан на основе манифеста PurplePaper: создание вселенных, бесконечных во времени.
 *
 * ФИЛОСОФИЯ И МАТЕМАТИКА ПАМЯТИ (PurplePaper):
 * - Внутренние вселенные внутри больше, чем снаружи.
 * - Число элементарных частиц во Вселенной (~10^80) превышает число бит в памяти одного EVM-контракта
 *   (2^256 * 256 бит ~ 3 * 10^79) всего примерно в 3 раза. Базовый смарт-контракт всего втрое меньше реальности!
 * - Но внутри одного смарт-контракта (уровень 0) располагаются ссылки на адреса вложенных контрактов-вселенных
 *   уровня 1. Память вырастает в 2^160 раз: вселенная в блокчейне становится больше реальности в 4.38 * 10^47
 *   (четыреста тридцать восемь септиллионов) раз!
 * - При бесконечной иерархии уровней (0 -> 1 -> 2 -> ... -> N) мы получаем вложенную мультивселенную бесконечного размера.
 * - Реальность работает в точности как разреженная память (sparse storage) и «ленивые вычисления» (lazy evaluation):
 *   квантовый хаос там, где нет наблюдателя, и фиксация материи при появлении взгляда.
 * - Вечное правило долговечности: при приближении к границам чисел (миллиарды лет) и мощностей подбора
 *   система обновляется на новые поколения/попытки. Все временные переменные спроектированы под сверхдолговечность.
 *
 * АРХИТЕКТУРА ХРАНИЛИЩА (3 независимых блока + управление):
 * 1. БЛОК 1: RAW DISK (Сырые 32-байтные секторы bytes32 => bytes32).
 * 2. БЛОК 2: LOW-LEVEL SLOTS (Прямой доступ к физическим слотам памяти EVM через Yul).
 * 3. БЛОК 3: РЕЕСТР ЖИТЕЛЕЙ, АДМИНИСТРИРОВАНИЕ И НАСЛЕДОВАНИЕ (Dead Man's Switch, Археологический ревайв, Золотой Канон).
 *
 * Полный регламент эволюции и правила наследования описаны в:
 * contracts-evm/правила наследования.md
 *
 * ПРАВИЛО КОМПИЛЯЦИИ И ОПТИМИЗАЦИИ (MAX RUNS):
 * - Compiler: solc 0.8.20
 * - Optimizer: enabled = true, runs = 4294967295 (максимум uint32)
 * - Обоснование: максимальное число runs обеспечивает предельно дешевый газ для вызовов функций
 *   в течение всей жизни контракта на миллионы лет.
 */
contract InfinityVerse_Main_Gb_1 {
    string public constant CREATOR = "Nikolai Dikanev (dikanevn)";
    string public constant VERSION = "0.0.0.0.1-MAIN-Gb-1";
    string public constant ATTEMPT = "Gb";
    string public constant REPOSITORY =
        "https://github.com/dikanevn/infinity-verse";

    // ========================================================================
    // ИЕРАРХИЯ ПОКОЛЕНИЙ И СИСТЕМА ДОСТУПА
    // ========================================================================
    address public immutable prevMain;
    address public nextMain;
    // Верховный администратор (в перспективе передается в смарт-контракт под управлением DAO)
    address public superAdmin;

    // Временной замок (48-Hour Timelock) для защиты передачи полномочий SuperAdmin
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    address public pendingSuperAdmin;
    uint256 public superAdminChangeUnlockTime;

    // Таймстамп последней активности верховного администратора (Dead Man's Switch)
    uint256 public lastSuperAdminActiveAt;

    // Резервный SuperAdmin и задержка неактивности для перехвата управления (7 дней)
    address public backupSuperAdmin;
    uint256 public constant BACKUP_CLAIM_DELAY = 7 days;

    // Задержка археологического открытия забытого мира (365 дней абсолютной неактивности)
    uint256 public constant ARCHAEOLOGICAL_CLAIM_DELAY = 365 days;

    // ========================================================================
    // === СИСТЕМА ПРЯМОЙ АДРЕСАЦИИ СЛОТОВ И ГРАНИЦЫ БЕЗОПАСНОСТИ 2^180     ===
    // ========================================================================

    // Защищаем первые 2^180 слотов с запасом в 1 048 576 раз выше 160-битных адресов
    uint256 public constant RESERVED_SLOTS = 1 << 180;
    uint256 private constant ADMIN_SLOT_PREFIX = 1 << 160;
    uint256 private constant ADMIN_LIST_PREFIX = 2 << 160;
    uint256 private constant GENERATIONS_PREFIX = 3 << 160;
    uint256 private constant PLAYER_LIST_PREFIX = 4 << 160;
    uint256 private constant PLAYER_ID_PREFIX = 5 << 160;

    // --- Префиксы бесконечных вложенных порталов Мультивселенной ---
    uint256 private constant PORTAL_LIST_PREFIX   = 6 << 160; // ID -> targetContract (адрес вложенного мира)
    uint256 private constant PORTAL_ID_PREFIX     = 7 << 160; // targetContract -> ID
    uint256 private constant PORTAL_FOUNDER_PREFIX = 8 << 160; // ID -> имя основателя (bytes32 founderName)
    uint256 private constant PORTAL_WORLD_PREFIX   = 9 << 160; // ID -> название мира (bytes32 worldName)
    uint256 private constant PORTAL_OWNER_PREFIX  = 10 << 160; // ID -> адрес создателя (founder)
    uint256 private constant PORTAL_PARENT_PREFIX = 11 << 160; // ID -> контракт-источник (parentContract)
    uint256 private constant PORTAL_TIME_PREFIX   = 12 << 160; // ID -> время открытия (createdAt)
    uint256 private constant PORTAL_FOUNDER_PORTAL_PREFIX = 13 << 160; // founderAddress -> portalId (1 портал на человека)

    // 64-битная маска для распаковки индексов и очистки слотов
    uint256 private constant MASK_64 = 0xFFFFFFFFFFFFFFFF;

    // Битовые маски прав доступа (младшие 8 бит слота администратора)
    uint8 public constant CLEARANCE_NONE = 0; // 00000000: Нет допуска
    uint8 public constant CLEARANCE_1 = 1 << 0; // 00000001 (1): Допуск Уровня 1: Raw Disk (Блок 1)
    uint8 public constant CLEARANCE_2 = 1 << 1; // 00000010 (2): Допуск Уровня 2: Low-Level Yul Slots (Блок 2)
    uint8 public constant CLEARANCE_MOD = 1 << 2; // 00000100 (4): Роль модератора / оператора
    uint8 public constant PERM_A = 1 << 3; // 00001000 (8): Модульное право A (резерв под внешние модули)
    uint8 public constant PERM_B = 1 << 4; // 00010000 (16): Модульное право B (резерв под внешние модули)
    uint8 public constant PERM_C = 1 << 5; // 00100000 (32): Модульное право C (резерв под внешние модули)
    uint8 public constant PERM_D = 1 << 6; // 01000000 (64): Модульное право D (резерв под внешние модули)
    uint8 public constant PERM_E = 1 << 7; // 10000000 (128): Модульное право E (резерв под внешние модули)

    /**
     * @notice Структура распакованных данных администратора для вывода (View, RPC, UI)
     */
    struct AdminInfo {
        bool isActive; // Активен ли прямо сейчас с учетом времени и прав
        uint8 permissions; // Битовая маска прав (CLEARANCE_1, CLEARANCE_2, CLEARANCE_MOD и др.)
        uint8 role; // Роль / ранг (0..255)
        uint56 validFrom; // Таймстамп старта действия прав (до 2.28 млрд лет)
        uint56 validUntil; // Таймстамп истечения прав (0 = бессрочно, до 2.28 млрд лет)
        uint64 listIndex; // Индекс в массиве allowedAdminsList
        uint8 paramA; // Пользовательский модульный параметр A
        uint8 paramB; // Пользовательский модульный параметр B
        uint16 paramC; // Пользовательский модульный параметр C
        uint32 paramD; // Пользовательский модульный параметр D
    }

    /**
     * @notice Структура описания Врат/Портала во вложенную вселенную
     */
    struct PortalInfo {
        uint256 id;              // Порядковый номер портала
        address parentContract;  // Контракт-источник, из которого ведут врата (мир 0-го уровня или текущий мир)
        address targetContract;  // Адрес вложенного контракта-вселенной
        address founder;         // Кошелек основателя (msg.sender)
        bytes32 founderName;     // Имя основателя
        bytes32 worldName;       // Название вложенного мира
        uint256 createdAt;       // Таймстамп открытия портала
    }

    // Количество администраторов в реестре (сами адреса лежат в защищенной зоне ADMIN_LIST_PREFIX + i)
    uint256 public allowedAdminsCount;

    // Хроника поколений Мультивселенной: общее количество зарегистрированных поколений
    // Сами адреса контрактов поколений навечно запечатаны в защищенной зоне GENERATIONS_PREFIX + generationNumber
    uint256 public totalGenerations;

    // Общее количество зарегистрированных игроков (жителей Вселенной)
    // Сами адреса лежат в защищенной зоне PLAYER_LIST_PREFIX + id, а ID игрока в PLAYER_ID_PREFIX | uint160(account)
    uint256 public totalPlayers;

    // Общее количество открытых врат-порталов во вложенные миры
    uint256 public totalPortals;

    // 4-байтные ошибки (Custom Errors) для экономии газа и размера байткода
    error Unauthorized();
    error RightsNotActive();
    error RightsExpired();
    error InvalidSlot();
    error LengthMismatch();
    error SliceOutOfBounds();
    error ZeroAddress();
    error SuperAdminConflict();
    error EmptyPermissions();
    error InvalidTimeRange();
    error AdminNotFound();
    error MigrationLocked();
    error TimelockActive();
    error NoPendingSuperAdmin();
    error TransferFailed();
    error InactivityPeriodNotElapsed();
    error ReentrancyDetected();
    error InvalidNextMain();
    error PortalAlreadyExists();
    error InvalidPortalAddress();
    error EmptyFounderName();
    error EmptyWorldName();
    error PortalNotFound();
    error FounderAlreadyHasPortal();

    // Событие открытия новых Врат Мультивселенной
    event PortalCreated(
        uint256 indexed portalId,
        address indexed parentContract,
        address indexed targetContract,
        address founder,
        bytes32 founderName,
        bytes32 worldName,
        uint256 createdAt
    );

    event AdminAllowed(address indexed adminAddress, uint8 perms, uint8 role);
    event AdminDisallowed(address indexed adminAddress);
    event SuperAdminChanged(
        address indexed oldSuperAdmin,
        address indexed newSuperAdmin
    );
    event SuperAdminActive(address indexed admin, uint256 timestamp);
    event SuperAdminChangeRequested(
        address indexed currentSuperAdmin,
        address indexed pendingSuperAdmin,
        uint256 unlockTime
    );
    event SuperAdminChangeCanceled(
        address indexed superAdmin,
        address indexed canceledPendingAdmin
    );
    event BackupSuperAdminSet(address indexed backupAdmin);
    event BackupSuperAdminActivated(
        address indexed oldSuperAdmin,
        address indexed newSuperAdmin
    );
    event AncientEraRevived(
        address indexed previousAdmin,
        address indexed archaeologist,
        address newBackupAdmin
    );
    event NextMainSet(address indexed nextMainAddress);
    event GenerationRegistered(
        uint256 indexed generationNumber,
        address indexed contractAddress
    );
    event PlayerRegistered(address indexed account, uint256 indexed playerId);
    event TokensRescued(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event ETHRescued(address indexed to, uint256 amount);

    // Флаг защиты от повторного входа (1 = разблокировано, 2 = заблокировано)
    uint256 private _reentrancyStatus;

    modifier nonReentrant() {
        if (_reentrancyStatus == 2) revert ReentrancyDetected();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    modifier onlySuperAdmin() {
        if (msg.sender != superAdmin) revert Unauthorized();
        lastSuperAdminActiveAt = block.timestamp;
        _;
    }

    /**
     * @dev Изолированное низкоуровневое чтение персонального слота администратора.
     */
    function _readAdminSlot(
        address _account
    ) internal view returns (uint256 packed) {
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(_account);
        assembly {
            packed := sload(slot)
        }
    }

    /**
     * @dev Единая внутренняя проверка прав доступа.
     * superAdmin всегда обладает абсолютным доступом.
     * Для остальных проверяются битовая маска прав и временные рамки действия.
     */
    function _checkAdmin(address _caller, uint8 requiredPerm) internal view {
        if (_caller == superAdmin) return;
        uint256 packed = _readAdminSlot(_caller);
        if ((uint8(packed) & requiredPerm) != requiredPerm)
            revert Unauthorized();
        if (block.timestamp < uint56(packed >> 16)) revert RightsNotActive();
        uint56 until = uint56(packed >> 72);
        if (until != 0 && block.timestamp > until) revert RightsExpired();
    }

    /**
     * @notice Базовый модификатор для обычных администраторов и логических модулей.
     * @dev Требует допуск Уровня 1: CLEARANCE_1 (Блок 1 Raw Disk).
     */
    modifier onlyAdmins() {
        _checkAdmin(msg.sender, CLEARANCE_1);
        _;
    }

    /**
     * @notice Модификатор для администраторов с доступом к физическим слотам памяти EVM.
     * @dev Требует допуск Уровня 2: CLEARANCE_2 (Блок 2 Low-Level Yul Slots).
     */
    modifier onlySlotAdmins() {
        _checkAdmin(msg.sender, CLEARANCE_2);
        _;
    }

    /**
     * @notice Возвращает полную информацию об администраторе в распакованном виде.
     * @param _account Адрес администратора или модуля
     */
    function getAdminInfo(
        address _account
    ) public view returns (AdminInfo memory info) {
        uint256 packed = _readAdminSlot(_account);
        uint8 perms = uint8(packed);
        uint56 validFrom = uint56(packed >> 16);
        uint56 validUntil = uint56(packed >> 72);
        uint64 idxPlusOne = uint64(packed >> 128);

        bool active = (perms != 0) &&
            (block.timestamp >= validFrom) &&
            (validUntil == 0 || block.timestamp <= validUntil);

        info.isActive = (_account == superAdmin) ? true : active;
        info.permissions = (_account == superAdmin)
            ? (CLEARANCE_1 | CLEARANCE_2)
            : perms;
        info.role = (_account == superAdmin) ? 0 : uint8(packed >> 8);
        info.validFrom = validFrom;
        info.validUntil = validUntil;
        info.listIndex = idxPlusOne > 0 ? idxPlusOne - 1 : 0;
        info.paramA = uint8(packed >> 192);
        info.paramB = uint8(packed >> 200);
        info.paramC = uint16(packed >> 208);
        info.paramD = uint32(packed >> 224);
    }

    /**
     * @notice Прямое ультра-дешевое чтение упакованного 256-битного слота администратора без распаковки.
     * @dev Идеально для внешних смарт-контрактов, считывающих paramA, paramB, paramC, paramD с минимальным газом.
     * @param _account Адрес администратора или модуля
     * @return packed Сырое упакованное 256-битное значение слота
     */
    function getRawAdminSlot(
        address _account
    ) external view returns (uint256 packed) {
        return _readAdminSlot(_account);
    }

    /**
     * @notice Быстрая проверка активности администратора прямо сейчас
     * @param _account Адрес для проверки
     */
    function isAdmin(address _account) public view returns (bool) {
        return getAdminInfo(_account).isActive;
    }

    /**
     * @dev Внутренняя проверка для сохранения совместимости внутренних вызовов
     */
    function _isAdmin(address _account) internal view returns (bool) {
        return isAdmin(_account);
    }

    /**
     * @notice Конструктор нового поколения InfinityVerse.
     * @dev АРХИТЕКТУРНОЕ РЕШЕНИЕ «КУРИЦЫ И ЯЙЦА» (CHICKEN-AND-EGG RESOLUTION BY DESIGN ЧЕРЕЗ CREATE2):
     * Аудиторы часто спрашивают: как деплоить новое поколение (Gen N+1), если в constructor
     * проверяется, что старое поколение (Gen N) уже установило nextMain == newContract?
     * В EVM адрес нового контракта детерминирован и рассчитывается ДО развертывания через CREATE2:
     *   predictedAddress = address(keccak256(0xff ++ factoryAddress ++ salt ++ keccak256(initCode)))
     * где salt = keccak256(abi.encodePacked(superAdmin, targetGeneration)).
     *
     * Это полностью исключает риск зависания нонса:
     * 1. Владелец заранее рассчитывает predictedAddress нового контракта через CREATE2 солью своего адреса.
     * 2. В старом поколении (Gen N) вызывает setNextMain(predictedAddress).
     * 3. В старом поколении отзывает всех внешних админов/модулей (disallowAdmin).
     * 4. Запускает 48-часовой таймлок на сжигание: requestSuperAdminChange(0xdEaD).
     * 5. По истечении 48 часов сжигает старое поколение: executeSuperAdminBurn().
     *    Теперь в Gen N: superAdmin == 0xdEaD, allowedAdminsCount == 0, nextMain == predictedAddress.
     * 6. Развертывает Gen N+1 через стандартный CREATE2 прокси-деплоер. Адрес совпадает строго с
     *    predictedAddress, проверки в constructor сходятся, а священная летопись (1 .. N) переносится!
     * 7. Никакого тупика или риска зависания транзакции нет: адрес не зависит от nonce кошелька!
     */
    constructor(
        address _superAdmin,
        address _prevMain,
        address _backupSuperAdmin
    ) {
        if (
            _superAdmin == address(0) ||
            _superAdmin == 0x000000000000000000000000000000000000dEaD
        ) {
            revert ZeroAddress();
        }
        if (
            _backupSuperAdmin == address(0) ||
            _backupSuperAdmin == 0x000000000000000000000000000000000000dEaD
        ) {
            revert ZeroAddress();
        }
        if (_backupSuperAdmin == _superAdmin) {
            revert SuperAdminConflict();
        }

        uint256 currentGen = 1;
        if (
            _prevMain != address(0) &&
            _prevMain != 0x000000000000000000000000000000000000dEaD
        ) {
            // Проверка запечатывания предыдущего поколения:
            // 1. Главный админ старого контракта должен быть сожжен на Dead-адрес
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).superAdmin();
            if (prevAdmin != 0x000000000000000000000000000000000000dEaD)
                revert MigrationLocked();

            // 2. Все модули и администраторы старого контракта должны быть отключены
            if (IInfinityVerse_PrevMain(_prevMain).allowedAdminsCount() != 0)
                revert MigrationLocked();

            // 3. Старый контракт обязан явно указать этот новый контракт своим наследником
            if (IInfinityVerse_PrevMain(_prevMain).nextMain() != address(this))
                revert MigrationLocked();

            // Непрерывное копирование священной Хроники Поколений (Lineage)
            uint256 prevGenerations = IInfinityVerse_PrevMain(_prevMain)
                .totalGenerations();
            for (uint256 i = 1; i <= prevGenerations; ) {
                address historicalGen = IInfinityVerse_PrevMain(_prevMain)
                    .getGeneration(i);
                _setSlot(
                    bytes32(GENERATIONS_PREFIX + i),
                    bytes32(uint256(uint160(historicalGen)))
                );
                unchecked {
                    ++i;
                }
            }
            currentGen = prevGenerations + 1;

            // Наследование общего количества зарегистрированных жителей Мультивселенной
            totalPlayers = IInfinityVerse_PrevMain(_prevMain).totalPlayers();

            // Наследование общего количества открытых порталов Мультивселенной
            totalPortals = IInfinityVerse_PrevMain(_prevMain).totalPortals();
        }

        superAdmin = _superAdmin;
        backupSuperAdmin = _backupSuperAdmin;
        emit BackupSuperAdminSet(_backupSuperAdmin);
        lastSuperAdminActiveAt = block.timestamp;
        prevMain = _prevMain;

        // Предоставляем супер-администратору прямые права в персональный слот с рождения хранилища
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(_superAdmin);
        // Добавляем superAdmin как первого элемента списка по прямому адресу ADMIN_LIST_PREFIX + 0
        _setSlot(
            bytes32(ADMIN_LIST_PREFIX),
            bytes32(uint256(uint160(_superAdmin)))
        );
        allowedAdminsCount = 1;

        // Упаковываем: CLEARANCE_1 | CLEARANCE_2, role: 0, indexPlusOne: 1
        uint256 packed = uint256(CLEARANCE_1 | CLEARANCE_2) |
            (uint256(1) << 128);
        assembly {
            sstore(slot, packed)
        }
        emit AdminAllowed(_superAdmin, CLEARANCE_1 | CLEARANCE_2, 0);

        // Навечно запечатываем текущий контракт в священной Хронике Мультивселенной
        _setSlot(
            bytes32(GENERATIONS_PREFIX + currentGen),
            bytes32(uint256(uint160(address(this))))
        );
        totalGenerations = currentGen;
        emit GenerationRegistered(currentGen, address(this));

        // Инициализируем статус ReentrancyGuard (1 = NOT_ENTERED)
        _reentrancyStatus = 1;
    }

    // ========================================================================
    // ========================================================================
    // === БЛОК 1: RAW DISK (СЫРЫЕ 32-БАЙТНЫЕ СЕКТОРЫ) - РАЗРЕЖЕННАЯ ПАМЯТЬ ===
    // ========================================================================
    // ========================================================================
    // Концепция PurplePaper: наша Вселенная работает в точности как разреженная память (sparse storage)
    // и «ленивые вычисления» (lazy evaluation). Клетки, где рядом не было наблюдателя, пребывают
    // в суперпозиции / квантовом хаосе и материализуются на внешнем диске ровно в момент записи.

    // 1.1. Хранилище секторов (Сектор => 32 байта данных)
    mapping(bytes32 => bytes32) private disk;

    // 1.2. Методы чтения и записи диска
    // Примечание по пакетным операциям (Batch):
    // Размеры входных массивов намеренно не ограничиваются жесткими лимитами в смарт-контракте.
    // Это исключает лишний расход газа на проверки и оставляет пространство для расширения
    // при росте Block Gas Limit сети. Контроль разбиения на порции возложен на вызывающие модули.
    /**
     * @notice Чтение одного 32-байтного сектора по ключу (наблюдение сектора мира)
     * @param sector 32-байтный хеш-адрес сектора
     * @return 32 байта данных сектора
     */
    function readSector(bytes32 sector) external view returns (bytes32) {
        return disk[sector];
    }

    /**
     * @notice Пакетное чтение массива секторов за один вызов (для клиентов и модулей)
     * @param sectors Массив 32-байтных адресов секторов
     * @return Массив 32-байтных значений данных
     */
    function readSectorBatch(
        bytes32[] calldata sectors
    ) external view returns (bytes32[] memory) {
        uint256 len = sectors.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; ) {
            result[i] = disk[sectors[i]];
            unchecked {
                ++i;
            }
        }
        return result;
    }

    /**
     * @notice Запись одного 32-байтного сектора
     * @param sector 32-байтный адрес сектора
     * @param data 32 байта записываемых данных
     */
    function writeSector(bytes32 sector, bytes32 data) external onlyAdmins {
        disk[sector] = data;
    }

    /**
     * @notice Пакетная запись массива секторов (для разведки пачек клеток и обновления состояния)
     * @param sectors Массив адресов секторов
     * @param data Массив 32-байтных значений
     */
    function writeSectorBatch(
        bytes32[] calldata sectors,
        bytes32[] calldata data
    ) external onlyAdmins {
        if (sectors.length != data.length) revert LengthMismatch();
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; ) {
            disk[sectors[i]] = data[i];
            unchecked {
                ++i;
            }
        }
    }
    /**
     * @dev Внутренний хелпер извлечения среза байт из 32-байтного слова без мусора в хвосте
     */
    function _sliceBytes32(
        bytes32 val,
        uint256 offset,
        uint256 length
    ) internal pure returns (bytes memory slice) {
        if (offset + length > 32) revert SliceOutOfBounds();
        slice = new bytes(length);
        if (length == 0) return slice;
        assembly {
            let shifted := shl(mul(offset, 8), val)
            let tailBits := mul(sub(32, length), 8)
            let cleanVal := shl(tailBits, shr(tailBits, shifted))
            mstore(add(slice, 32), cleanVal)
        }
    }

    /**
     * @notice Чтение среза байт из 32-байтного сектора (Offset / Length Sub-slice в стиле MUD Store)
     * @dev Позволяет извлечь компактное поле (например, 2 байта hp или 4 байта таймстампа) без загрузки всего сектора в память
     * @param sector 32-байтный адрес сектора
     * @param offset Смещение от 0 до 31 байта внутри сектора
     * @param length Длина среза в байтах (offset + length <= 32)
     * @return slice Срез данных заданной длины
     */
    function readSectorSlice(
        bytes32 sector,
        uint256 offset,
        uint256 length
    ) external view returns (bytes memory slice) {
        return _sliceBytes32(disk[sector], offset, length);
    }

    /**
     * @notice Последовательное непрерывное чтение дорожки секторов (Chunk Read)
     * @param baseSector Начальный сектор
     * @param count Количество непрерывных секторов для чтения подряд
     * @return result Массив считанных 32-байтных секторов
     */
    function readSequential(
        bytes32 baseSector,
        uint256 count
    ) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](count);
        uint256 base = uint256(baseSector);
        for (uint256 i = 0; i < count; ) {
            result[i] = disk[bytes32(base + i)];
            unchecked {
                ++i;
            }
        }
        return result;
    }

    /**
     * @notice Последовательная непрерывная запись дорожки секторов (Chunk Stream Write, экономия 50% calldata)
     * @param baseSector Начальный сектор
     * @param data Массив 32-байтных данных, записываемых подряд в baseSector + i
     */
    function writeSequential(
        bytes32 baseSector,
        bytes32[] calldata data
    ) external onlyAdmins {
        uint256 len = data.length;
        uint256 base = uint256(baseSector);
        for (uint256 i = 0; i < len; ) {
            disk[bytes32(base + i)] = data[i];
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Очистка сектора (TRIM / delete) с возвратом газа EVM (Gas Refund)
     * @param sector 32-байтный адрес очищаемого сектора
     */
    function trimSector(bytes32 sector) external onlyAdmins {
        delete disk[sector];
    }

    /**
     * @notice Пакетная очистка массива секторов (TRIM Batch) с возвратом газа
     * @param sectors Массив адресов очищаемых секторов
     */
    function trimSectorBatch(bytes32[] calldata sectors) external onlyAdmins {
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; ) {
            delete disk[sectors[i]];
            unchecked {
                ++i;
            }
        }
    }

    // ========================================================================
    // ========================================================================
    // ========================================================================
    // === БЛОК 2: LOW-LEVEL SLOTS (ВЛОЖЕННЫЕ ВСЕЛЕННЫЕ И ASSEMBLY YUL)     ===
    // ========================================================================
    // ========================================================================
    // Архитектурное примечание по памяти и безопасности (PurplePaper):
    // 1. Вложенные миры: хранилище уровня 0 способно хранить ссылки на вложенные адреса смарт-контрактов
    //    уровня 1. Память одного контракта EVM (3 * 10^79 бит) умножается на 2^160 возможных адресов,
    //    создавая внутреннюю бесконечность размером 4.38 * 10^47 раз больше физической Вселенной.
    // 2. Диапазон RESERVED_SLOTS (первые 2^180 слотов) гарантированно защищает:
    //    - Системные переменные ядра, таймлоки и адреса поколений.
    //    - Персональные сейфы прав доступа администраторов (1 << 160).
    //    - Реестр участников и постоянные ID жителей (4 << 160 и 5 << 160).
    // Прямой доступ к физической памяти (sload/sstore) за пределами 2^180 доступен только
    // superAdmin и доверенным модулям с допуском CLEARANCE_2.

    // 3.0. Низкоуровневые микро-хелперы для физической памяти EVM
    function _getSlot(bytes32 slot) internal view returns (bytes32 val) {
        assembly {
            val := sload(slot)
        }
    }

    function _setSlot(bytes32 slot, bytes32 val) internal {
        assembly {
            sstore(slot, val)
        }
    }

    // 3.1. Методы прямого чтения и записи в слоты EVM
    // Примечание: размеры массивов в пакетных операциях со слотами также намеренно не лимитируются
    // ради максимальной экономии газа и свободы расширения модулей.
    /**
     * @notice Прямое чтение физического слота памяти EVM
     * @param slot 32-байтный номер слота storage
     * @return val Значение, хранящееся в слоте
     */
    function readSlot(bytes32 slot) external view returns (bytes32 val) {
        return _getSlot(slot);
    }

    /**
     * @notice Прямая запись в физический слот памяти EVM через Yul
     * @param slot 32-байтный номер слота storage (должен быть >= RESERVED_SLOTS)
     * @param val Записываемое 32-байтное значение
     */
    function writeSlot(bytes32 slot, bytes32 val) external onlySlotAdmins {
        if (uint256(slot) < RESERVED_SLOTS) revert InvalidSlot();
        _setSlot(slot, val);
    }

    /**
     * @notice Пакетное чтение произвольных физических слотов EVM через Yul
     * @param slots Массив номеров слотов
     * @return result Массив считанных 32-байтных значений
     */
    function readSlotBatch(
        bytes32[] calldata slots
    ) external view returns (bytes32[] memory) {
        uint256 len = slots.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; ) {
            result[i] = _getSlot(slots[i]);
            unchecked {
                ++i;
            }
        }
        return result;
    }

    /**
     * @notice Пакетная запись в произвольные физические слоты EVM через Yul
     * @param slots Массив номеров слотов (каждый должен быть >= RESERVED_SLOTS)
     * @param vals Массив 32-байтных значений
     */
    function writeSlotBatch(
        bytes32[] calldata slots,
        bytes32[] calldata vals
    ) external onlySlotAdmins {
        if (slots.length != vals.length) revert LengthMismatch();
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; ) {
            bytes32 slot = slots[i];
            if (uint256(slot) < RESERVED_SLOTS) revert InvalidSlot();
            _setSlot(slot, vals[i]);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Чтение среза байт из физического слота EVM (Offset / Length Sub-slice через Yul sload)
     * @dev Позволяет извлечь упакованное поле из физического слота памяти без передачи всех 32 байт
     * @param slot Физический слот памяти EVM
     * @param offset Смещение от 0 до 31 байта внутри слота
     * @param length Длина среза в байтах (offset + length <= 32)
     * @return slice Срез данных заданной длины
     */
    function readSlotSlice(
        bytes32 slot,
        uint256 offset,
        uint256 length
    ) external view returns (bytes memory slice) {
        return _sliceBytes32(_getSlot(slot), offset, length);
    }

    /**
     * @notice Последовательное чтение непрерывных физических слотов EVM через Yul
     * @param baseSlot Начальный физический слот памяти
     * @param count Количество слотов подряд
     */
    function readSlotSequential(
        bytes32 baseSlot,
        uint256 count
    ) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](count);
        uint256 base = uint256(baseSlot);
        unchecked {
            if (base + count < base) revert InvalidSlot();
        }
        for (uint256 i = 0; i < count; ) {
            unchecked {
                result[i] = _getSlot(bytes32(base + i));
                ++i;
            }
        }
        return result;
    }

    /**
     * @notice Последовательная потоковая запись в непрерывные физические слоты памяти EVM через Yul
     * @param baseSlot Начальный физический слот (должен быть >= RESERVED_SLOTS)
     * @param vals Массив значений для записи подряд
     */
    function writeSlotSequential(
        bytes32 baseSlot,
        bytes32[] calldata vals
    ) external onlySlotAdmins {
        uint256 base = uint256(baseSlot);
        if (base < RESERVED_SLOTS) revert InvalidSlot();
        uint256 len = vals.length;
        unchecked {
            if (base + len < base) revert InvalidSlot();
        }
        for (uint256 i = 0; i < len; ) {
            unchecked {
                _setSlot(bytes32(base + i), vals[i]);
                ++i;
            }
        }
    }

    /**
     * @notice Очистка физического слота EVM (TRIM / sstore zero) с возвратом газа
     * @param slot Физический слот памяти (должен быть >= RESERVED_SLOTS)
     */
    function trimSlot(bytes32 slot) external onlySlotAdmins {
        if (uint256(slot) < RESERVED_SLOTS) revert InvalidSlot();
        _setSlot(slot, 0);
    }

    /**
     * @notice Пакетная очистка массива физических слотов (TRIM Slot Batch) с возвратом газа
     * @param slots Массив физических слотов памяти (каждый должен быть >= RESERVED_SLOTS)
     */
    function trimSlotBatch(bytes32[] calldata slots) external onlySlotAdmins {
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; ) {
            bytes32 slot = slots[i];
            if (uint256(slot) < RESERVED_SLOTS) revert InvalidSlot();
            _setSlot(slot, 0);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Калькулятор слотов стандарта ERC-7201: вычисляет базовый слот изолированного пространства имен
     * @dev Формула: keccak256(uint256(keccak256(namespaceId)) - 1) & ~0xff
     * Гарантирует выделение безопасного диапазона слотов для внешних исполняемых контрактов (AAA, BBB, CCC)!
     * @param namespaceId Текстовый идентификатор модуля/пространства (например, "infinity.module.movement")
     * @return rootSlot Уникальный базовый слот физической памяти EVM, гарантированно свободный от коллизий
     */
    function getNamespaceSlot(
        string calldata namespaceId
    ) external pure returns (bytes32 rootSlot) {
        return
            keccak256(abi.encode(uint256(keccak256(bytes(namespaceId))) - 1)) &
            ~bytes32(uint256(0xff));
    }

    // ========================================================================
    // ========================================================================
    // === БЛОК 4: АДМИНИСТРИРОВАНИЕ И ПРАВИЛА НАСЛЕДОВАНИЯ                 ===
    // ========================================================================
    // ========================================================================

    /**
     * @notice Назначение или обновление прав администратора с полным набором модульных параметров.
     * @dev Упаковывает все поля ровно в 1 физический слот EVM: (1 << 160) | uint160(admin).
     */
    function allowAdmin(
        address adminAddress,
        uint8 perms,
        uint8 role,
        uint56 validFrom,
        uint56 validUntil,
        uint8 paramA,
        uint8 paramB,
        uint16 paramC,
        uint32 paramD
    ) external onlySuperAdmin {
        if (adminAddress == address(0)) revert ZeroAddress();
        if (adminAddress == superAdmin) revert SuperAdminConflict();
        if (perms == 0) revert EmptyPermissions();
        if (validUntil != 0 && validUntil < validFrom)
            revert InvalidTimeRange();

        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 idxPlusOne;
        assembly {
            idxPlusOne := and(shr(128, sload(slot)), MASK_64)
        }

        if (idxPlusOne == 0) {
            uint256 count = allowedAdminsCount;
            _setSlot(
                bytes32(ADMIN_LIST_PREFIX + count),
                bytes32(uint256(uint160(adminAddress)))
            );
            allowedAdminsCount = count + 1;
            idxPlusOne = count + 1;
        }

        uint256 packed;
        assembly {
            packed := or(
                or(
                    or(perms, shl(8, role)),
                    or(shl(16, validFrom), shl(72, validUntil))
                ),
                or(
                    or(shl(128, idxPlusOne), shl(192, paramA)),
                    or(shl(200, paramB), or(shl(208, paramC), shl(224, paramD)))
                )
            )
            sstore(slot, packed)
        }

        emit AdminAllowed(adminAddress, perms, role);
    }

    /**
     * @notice Отзыв авторизации у администратора за O(1) со Swap & Pop и очисткой памяти.
     * @dev sstore(slot, 0) освобождает 32 байта и возвращает газ (Gas Refund).
     */
    function disallowAdmin(address adminAddress) external onlySuperAdmin {
        if (adminAddress == superAdmin) revert SuperAdminConflict();
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 packed;
        assembly {
            packed := sload(slot)
        }

        uint64 idxPlusOne = uint64(packed >> 128);
        if (idxPlusOne == 0) revert AdminNotFound();

        uint256 index = idxPlusOne - 1;
        uint256 lastIndex = allowedAdminsCount - 1;

        // Мгновенное удаление методом Swap & Pop за O(1) внутри защищенной зоны ADMIN_LIST_PREFIX
        if (index != lastIndex) {
            bytes32 lastAdminVal = _getSlot(
                bytes32(ADMIN_LIST_PREFIX + lastIndex)
            );
            address lastAdmin = address(uint160(uint256(lastAdminVal)));
            _setSlot(bytes32(ADMIN_LIST_PREFIX + index), lastAdminVal);

            // Обновляем indexPlusOne у перенесённого админа в его личном слоте
            uint256 lastPacked = _readAdminSlot(lastAdmin);
            lastPacked =
                (lastPacked & ~(MASK_64 << 128)) |
                (uint256(idxPlusOne) << 128);
            _setSlot(
                bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)),
                bytes32(lastPacked)
            );
        }

        _setSlot(bytes32(ADMIN_LIST_PREFIX + lastIndex), 0);
        allowedAdminsCount = lastIndex;

        // Полная очистка ячейки памяти с возвратом газа (Gas Refund)
        assembly {
            sstore(slot, 0)
        }

        emit AdminDisallowed(adminAddress);
    }

    /**
     * @notice Получение полного списка всех авторизованных администраторов / модулей
     */
    function getAllowedAdmins() public view returns (address[] memory) {
        uint256 count = allowedAdminsCount;
        address[] memory list = new address[](count);
        for (uint256 i = 0; i < count; ) {
            list[i] = address(
                uint160(uint256(_getSlot(bytes32(ADMIN_LIST_PREFIX + i))))
            );
            unchecked {
                ++i;
            }
        }
        return list;
    }

    /**
     * @notice Последовательное чтение списка администраторов пачками (защита от Out of Gas)
     * @param offset Начальный индекс смещения
     * @param count Количество возвращаемых адресов
     * @return list Массив адресов запрошенной порции
     */
    function getAllowedAdminsSequential(
        uint256 offset,
        uint256 count
    ) external view returns (address[] memory list) {
        uint256 total = allowedAdminsCount;
        if (offset >= total || count == 0) {
            return new address[](0);
        }

        uint256 end = offset + count;
        if (end > total) {
            end = total;
        }

        uint256 resultLen = end - offset;
        list = new address[](resultLen);
        for (uint256 i = 0; i < resultLen; ) {
            list[i] = address(
                uint160(
                    uint256(_getSlot(bytes32(ADMIN_LIST_PREFIX + offset + i)))
                )
            );
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Установка адреса следующего поколения Main (наследника)
     * @dev Может обновляться действующим superAdmin до момента сжигания superAdmin на 0x...dEaD.
     * Заблокировано, если запущен таймлок на смену/сжигание superAdmin (pendingSuperAdmin != 0).
     * После сжигания superAdmin вызов становится недостижим навсегда.
     * @param _nextMain Адрес контракта-наследника Main
     */
    function setNextMain(address _nextMain) external onlySuperAdmin {
        if (pendingSuperAdmin != address(0)) revert TimelockActive();
        if (
            _nextMain == address(0) ||
            _nextMain == 0x000000000000000000000000000000000000dEaD ||
            _nextMain == address(this)
        ) {
            revert InvalidNextMain();
        }
        nextMain = _nextMain;
        emit NextMainSet(_nextMain);
    }

    /**
     * @notice Получение адреса любого поколения из неизменяемой Хроники Мультивселенной за O(1).
     * @param genNumber Номер поколения (1, 2, 3...)
     * @return genAddress Адрес контракта поколения (или address(0), если еще не зарегистрировано)
     */
    function getGeneration(
        uint256 genNumber
    ) external view returns (address genAddress) {
        if (genNumber == 0 || genNumber > totalGenerations) {
            return address(0);
        }
        return
            address(
                uint160(
                    uint256(_getSlot(bytes32(GENERATIONS_PREFIX + genNumber)))
                )
            );
    }

    /**
     * @notice Получение полного списка всех поколений мультивселенной (от Gen 1 до текущего).
     * @dev Позволяет внешним модулям, скриптам миграции и админам в 1 вызов получить все адреса
     * контрактов истории для быстрого поиска игроков, секторов и данных в прошлых поколениях.
     * @return allGens Массив адресов контрактов всех зарегистрированных поколений
     */
    function getAllGenerations()
        external
        view
        returns (address[] memory allGens)
    {
        uint256 count = totalGenerations;
        allGens = new address[](count);
        for (uint256 i = 0; i < count; ) {
            allGens[i] = address(
                uint160(
                    uint256(_getSlot(bytes32(GENERATIONS_PREFIX + (i + 1))))
                )
            );
            unchecked {
                ++i;
            }
        }
    }

    // ========================================================================
    // ========================================================================
    // === РЕЕСТР УЧАСТНИКОВ (PLAYER IDS & REGISTRY)                        ===
    // ========================================================================
    // ========================================================================

    /**
     * @notice Регистрация нового участника мультивселенной и выдача вечного порядкового ID.
     * @dev Вызывается авторизованными модулями (только с CLEARANCE_1 / onlyAdmins, например при рождении в спавне).
     * Обладает встроенной защитой от дубликатов: если игрок уже зарегистрирован, возвращает существующий ID.
     * @param account Адрес кошелька игрока
     * @return playerId Присвоенный или уже существующий порядковый номер игрока (1, 2, 3...)
     */
    function registerPlayer(
        address account
    ) external onlyAdmins returns (uint256 playerId) {
        if (account == address(0)) revert ZeroAddress();

        uint256 idSlot = PLAYER_ID_PREFIX | uint160(account);
        playerId = uint256(_getSlot(bytes32(idSlot)));

        // Если игрок уже зарегистрирован в текущем поколении — возвращаем его постоянный ID
        if (playerId != 0) {
            return playerId;
        }

        // Если контракт является наследником, проверяем: не был ли игрок рожден в предыдущих мирах
        if (prevMain != address(0)) {
            uint256 ancestorId = IInfinityVerse_PrevMain(prevMain).getPlayerId(account);
            if (ancestorId != 0) {
                // Сохраняем древний ID в локальном реестре для мгновенного O(1) доступа
                _setSlot(bytes32(idSlot), bytes32(ancestorId));
                _setSlot(
                    bytes32(PLAYER_LIST_PREFIX + ancestorId),
                    bytes32(uint256(uint160(account)))
                );
                return ancestorId;
            }
        }

        uint256 newId = totalPlayers + 1;
        totalPlayers = newId;

        // Связываем двунаправленно: ID -> Address и Address -> ID
        _setSlot(
            bytes32(PLAYER_LIST_PREFIX + newId),
            bytes32(uint256(uint160(account)))
        );
        _setSlot(bytes32(idSlot), bytes32(newId));

        emit PlayerRegistered(account, newId);
        return newId;
    }

    /**
     * @notice Получение адреса игрока по его порядковому ID за O(1) со сквозным поиском в предках.
     * @param id Порядковый номер участника (1 .. totalPlayers)
     * @return account Адрес кошелька игрока (или address(0), если не зарегистрирован)
     */
    function getPlayerAddress(
        uint256 id
    ) external view returns (address account) {
        if (id == 0 || id > totalPlayers) {
            return address(0);
        }
        account = address(
            uint160(uint256(_getSlot(bytes32(PLAYER_LIST_PREFIX + id))))
        );
        if (account == address(0) && prevMain != address(0)) {
            return IInfinityVerse_PrevMain(prevMain).getPlayerAddress(id);
        }
    }

    /**
     * @notice Получение постоянного ID игрока по его адресу кошелька за O(1) со сквозным поиском в предках.
     * @param account Адрес кошелька игрока
     * @return id Порядковый номер участника (0, если игрок еще ни разу не регистрировался)
     */
    function getPlayerId(address account) external view returns (uint256 id) {
        id = uint256(_getSlot(bytes32(PLAYER_ID_PREFIX | uint160(account))));
        if (id == 0 && prevMain != address(0)) {
            return IInfinityVerse_PrevMain(prevMain).getPlayerId(account);
        }
    }

    /**
     * @notice Синхронизация и ончейн-материализация пачки игроков из предыдущих эпох Мультивселенной
     * @param startId Начальный порядковый номер игрока (1 .. totalPlayers)
     * @param count Количество игроков для синхронизации подряд
     * @return syncedCount Количество фактически перенесенных в текущий мир игроков
     */
    function syncPlayersFromAllGenerations(
        uint256 startId,
        uint256 count
    ) external onlyAdmins returns (uint256 syncedCount) {
        if (startId == 0 || prevMain == address(0)) {
            return 0;
        }

        uint256 total = totalPlayers;
        if (startId > total) return 0;
        uint256 end = startId + count;
        if (end > total + 1) {
            end = total + 1;
        }

        for (uint256 id = startId; id < end; ) {
            bytes32 listSlot = bytes32(PLAYER_LIST_PREFIX + id);
            address localAddr = address(uint160(uint256(_getSlot(listSlot))));
            if (localAddr == address(0)) {
                address ancestorAddr = IInfinityVerse_PrevMain(prevMain).getPlayerAddress(id);
                if (ancestorAddr != address(0)) {
                    _setSlot(
                        listSlot,
                        bytes32(uint256(uint160(ancestorAddr)))
                    );
                    _setSlot(
                        bytes32(PLAYER_ID_PREFIX | uint160(ancestorAddr)),
                        bytes32(id)
                    );
                    unchecked {
                        ++syncedCount;
                    }
                }
            }
            unchecked {
                ++id;
            }
        }
    }

    /**
     * @notice Последовательное чтение списка участников Мультивселенной пачками.
     * @param offset Начальный индекс (0-indexed смещение: 0 соответствует ID=1)
     * @param count Количество возвращаемых адресов игроков
     * @return list Массив адресов участников запрошенной порции
     */
    function getPlayersSequential(
        uint256 offset,
        uint256 count
    ) external view returns (address[] memory list) {
        uint256 total = totalPlayers;
        if (offset >= total || count == 0) {
            return new address[](0);
        }

        uint256 end = offset + count;
        if (end > total) {
            end = total;
        }

        uint256 resultLen = end - offset;
        list = new address[](resultLen);
        for (uint256 i = 0; i < resultLen; ) {
            list[i] = address(
                uint160(
                    uint256(
                        _getSlot(bytes32(PLAYER_LIST_PREFIX + (offset + i + 1)))
                    )
                )
            );
            unchecked {
                ++i;
            }
        }
    }

    // ========================================================================
    // === БЕСКОНЕЧНЫЕ ВЛОЖЕННЫЕ ПОРТАЛЫ МУЛЬТИВСЕЛЕННОЙ (ФРАКТАЛЬНЫЕ МИРЫ)  ===
    // ========================================================================

    /**
     * @notice Открытие новых Врат во вложенную вселенную (создание портала).
     * @dev Правило: строго 1 портал на создателя!
     * Записывает адрес родительского мира address(this), целевой контракт, создателя и имена.
     * Все данные фиксируются в защищенной зоне памяти за O(1).
     * @param targetContract Адрес смарт-контракта вложенного мира
     * @param founderName Имя основателя (до 32 байт UTF-8)
     * @param worldName Название вложенного мира (до 32 байт UTF-8)
     * @return portalId Уникальный сквозной номер созданного портала
     */
    function createPortal(
        address targetContract,
        bytes32 founderName,
        bytes32 worldName
    ) external returns (uint256 portalId) {
        if (targetContract == address(0) || targetContract == address(this)) {
            revert InvalidPortalAddress();
        }
        if (founderName == bytes32(0)) revert EmptyFounderName();
        if (worldName == bytes32(0)) revert EmptyWorldName();

        // Проверка: один портал на одного человека
        uint256 founderSlot = PORTAL_FOUNDER_PORTAL_PREFIX | uint160(msg.sender);
        if (uint256(_getSlot(bytes32(founderSlot))) != 0) {
            revert FounderAlreadyHasPortal();
        }

        uint256 idSlot = PORTAL_ID_PREFIX | uint160(targetContract);
        if (uint256(_getSlot(bytes32(idSlot))) != 0) {
            revert PortalAlreadyExists();
        }

        portalId = ++totalPortals;

        // Фиксация в защищенных слотах памяти O(1):
        _setSlot(bytes32(PORTAL_LIST_PREFIX + portalId), bytes32(uint256(uint160(targetContract))));
        _setSlot(bytes32(idSlot), bytes32(portalId));
        _setSlot(bytes32(founderSlot), bytes32(portalId));
        _setSlot(bytes32(PORTAL_FOUNDER_PREFIX + portalId), founderName);
        _setSlot(bytes32(PORTAL_WORLD_PREFIX + portalId), worldName);
        _setSlot(bytes32(PORTAL_OWNER_PREFIX + portalId), bytes32(uint256(uint160(msg.sender))));
        _setSlot(bytes32(PORTAL_PARENT_PREFIX + portalId), bytes32(uint256(uint160(address(this)))));
        _setSlot(bytes32(PORTAL_TIME_PREFIX + portalId), bytes32(block.timestamp));

        emit PortalCreated(
            portalId,
            address(this),
            targetContract,
            msg.sender,
            founderName,
            worldName,
            block.timestamp
        );
    }

    /**
     * @notice Получение полной информации о портале по его ID за O(1)
     * @param id Порядковый номер портала (1 .. totalPortals)
     */
    function getPortal(uint256 id) external view returns (PortalInfo memory info) {
        if (id == 0 || id > totalPortals) {
            return info;
        }

        address target = address(uint160(uint256(_getSlot(bytes32(PORTAL_LIST_PREFIX + id)))));
        if (target == address(0)) {
            return info;
        }

        info.id = id;
        info.targetContract = target;
        info.parentContract = address(uint160(uint256(_getSlot(bytes32(PORTAL_PARENT_PREFIX + id)))));
        info.founder = address(uint160(uint256(_getSlot(bytes32(PORTAL_OWNER_PREFIX + id)))));
        info.founderName = _getSlot(bytes32(PORTAL_FOUNDER_PREFIX + id));
        info.worldName = _getSlot(bytes32(PORTAL_WORLD_PREFIX + id));
        info.createdAt = uint256(_getSlot(bytes32(PORTAL_TIME_PREFIX + id)));
    }

    /**
     * @notice Получение ID портала по адресу вложенного смарт-контракта за O(1) со сквозным поиском в предках.
     * @param targetContract Адрес смарт-контракта вложенного мира
     * @return id Порядковый номер портала (0, если не существует)
     */
    function getPortalId(address targetContract) external view returns (uint256 id) {
        id = uint256(_getSlot(bytes32(PORTAL_ID_PREFIX | uint160(targetContract))));
        if (id == 0 && prevMain != address(0)) {
            return IInfinityVerse_PrevMain(prevMain).getPortalId(targetContract);
        }
    }

    /**
     * @notice Получение ID портала, созданного указанным основателем (1 портал на создателя) со сквозным поиском в предках.
     * @param founder Адрес кошелька создателя
     * @return portalId ID созданного портала (или 0, если еще не открывал портал)
     */
    function getPortalByFounder(address founder) external view returns (uint256 portalId) {
        portalId = uint256(_getSlot(bytes32(PORTAL_FOUNDER_PORTAL_PREFIX | uint160(founder))));
        if (portalId == 0 && prevMain != address(0)) {
            return IInfinityVerse_PrevMain(prevMain).getPortalByFounder(founder);
        }
    }

    /**
     * @notice Последовательное чтение списка порталов пачками для фронтенда и навигации.
     * @param offset Начальный индекс (0-indexed смещение: 0 соответствует id=1)
     * @param count Количество возвращаемых порталов
     * @return list Массив структур PortalInfo
     */
    function getPortalsSequential(
        uint256 offset,
        uint256 count
    ) external view returns (PortalInfo[] memory list) {
        uint256 total = totalPortals;
        if (offset >= total || count == 0) {
            return new PortalInfo[](0);
        }

        uint256 end = offset + count;
        if (end > total) {
            end = total;
        }

        uint256 resultLen = end - offset;
        list = new PortalInfo[](resultLen);

        for (uint256 i = 0; i < resultLen; ) {
            uint256 id = offset + i + 1;
            list[i].id = id;
            list[i].targetContract = address(uint160(uint256(_getSlot(bytes32(PORTAL_LIST_PREFIX + id)))));
            list[i].parentContract = address(uint160(uint256(_getSlot(bytes32(PORTAL_PARENT_PREFIX + id)))));
            list[i].founder = address(uint160(uint256(_getSlot(bytes32(PORTAL_OWNER_PREFIX + id)))));
            list[i].founderName = _getSlot(bytes32(PORTAL_FOUNDER_PREFIX + id));
            list[i].worldName = _getSlot(bytes32(PORTAL_WORLD_PREFIX + id));
            list[i].createdAt = uint256(_getSlot(bytes32(PORTAL_TIME_PREFIX + id)));
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Внутренняя низкоуровневая передача полномочий SuperAdmin (общая логика).
     */
    function _applySuperAdminTransfer(address newSuperAdmin) internal {
        address oldSuperAdmin = superAdmin;

        // ====================================================================
        // СЦЕНАРИЙ А: Сожжение поколения на Dead-адрес (Миграция)
        // ====================================================================
        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            if (nextMain == address(0)) revert MigrationLocked();

            // Отзываем права у текущего superAdmin
            uint256 prevPacked = _readAdminSlot(oldSuperAdmin);
            if (prevPacked != 0) {
                uint64 prevIdxPlusOne = uint64(prevPacked >> 128);
                if (prevIdxPlusOne != 0) {
                    uint256 prevIdx = prevIdxPlusOne - 1;
                    uint256 lastIdx = allowedAdminsCount - 1;
                    if (prevIdx != lastIdx) {
                        bytes32 lastAdminVal = _getSlot(
                            bytes32(ADMIN_LIST_PREFIX + lastIdx)
                        );
                        address lastAdmin = address(
                            uint160(uint256(lastAdminVal))
                        );
                        _setSlot(
                            bytes32(ADMIN_LIST_PREFIX + prevIdx),
                            lastAdminVal
                        );
                        uint256 lastPacked = _readAdminSlot(lastAdmin);
                        lastPacked =
                            (lastPacked & ~(MASK_64 << 128)) |
                            (uint256(prevIdxPlusOne) << 128);
                        _setSlot(
                            bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)),
                            bytes32(lastPacked)
                        );
                    }
                    _setSlot(bytes32(ADMIN_LIST_PREFIX + lastIdx), 0);
                    allowedAdminsCount = lastIdx;
                }
                _setSlot(
                    bytes32(ADMIN_SLOT_PREFIX | uint160(oldSuperAdmin)),
                    0
                );
                emit AdminDisallowed(oldSuperAdmin);
            }

            // Жесткая проверка: после удаления суперадмина список ДОЛЖЕН быть абсолютно пуст (0 модулей)
            if (allowedAdminsCount != 0) revert MigrationLocked();
            backupSuperAdmin = address(0);
        } else {
            // ====================================================================
            // СЦЕНАРИЙ Б: Передача живому новому SuperAdmin
            // ====================================================================
            // Читаем статус нового владельца ДО любых мутаций списка
            uint256 existingPacked = _readAdminSlot(newSuperAdmin);
            uint64 targetIdxPlusOne = uint64(existingPacked >> 128);

            // 1. Отзываем права у старого superAdmin
            uint256 prevPacked = _readAdminSlot(oldSuperAdmin);
            if (prevPacked != 0) {
                uint64 prevIdxPlusOne = uint64(prevPacked >> 128);
                if (prevIdxPlusOne != 0) {
                    uint256 prevIdx = prevIdxPlusOne - 1;
                    uint256 lastIdx = allowedAdminsCount - 1;

                    // Если новый суперадмин был на позиции lastIdx, его индекс станет prevIdx!
                    if (prevIdx != lastIdx) {
                        bytes32 lastAdminVal = _getSlot(
                            bytes32(ADMIN_LIST_PREFIX + lastIdx)
                        );
                        address lastAdmin = address(
                            uint160(uint256(lastAdminVal))
                        );
                        _setSlot(
                            bytes32(ADMIN_LIST_PREFIX + prevIdx),
                            lastAdminVal
                        );
                        uint256 lastPacked = _readAdminSlot(lastAdmin);
                        lastPacked =
                            (lastPacked & ~(MASK_64 << 128)) |
                            (uint256(prevIdxPlusOne) << 128);
                        _setSlot(
                            bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)),
                            bytes32(lastPacked)
                        );

                        // Если перемещенный lastAdmin как раз и есть newSuperAdmin, обновляем его целевой индекс
                        if (lastAdmin == newSuperAdmin) {
                            targetIdxPlusOne = prevIdxPlusOne;
                        }
                    }
                    _setSlot(bytes32(ADMIN_LIST_PREFIX + lastIdx), 0);
                    allowedAdminsCount = lastIdx;
                }
                _setSlot(
                    bytes32(ADMIN_SLOT_PREFIX | uint160(oldSuperAdmin)),
                    0
                );
                emit AdminDisallowed(oldSuperAdmin);
            }

            // 2. Если нового админа не было в реестре (targetIdxPlusOne == 0) — добавляем в конец
            if (targetIdxPlusOne == 0) {
                uint256 count = allowedAdminsCount;
                _setSlot(
                    bytes32(ADMIN_LIST_PREFIX + count),
                    bytes32(uint256(uint160(newSuperAdmin)))
                );
                allowedAdminsCount = count + 1;
                targetIdxPlusOne = uint64(count + 1);
            }

            // 3. Наделяем нового SuperAdmin высшими правами с корректным targetIdxPlusOne
            uint256 newSlot = ADMIN_SLOT_PREFIX | uint160(newSuperAdmin);
            uint256 packed = uint256(CLEARANCE_1 | CLEARANCE_2) |
                (uint256(targetIdxPlusOne) << 128);
            _setSlot(bytes32(newSlot), bytes32(packed));
            emit AdminAllowed(newSuperAdmin, CLEARANCE_1 | CLEARANCE_2, 0);
        }

        emit SuperAdminChanged(oldSuperAdmin, newSuperAdmin);
        superAdmin = newSuperAdmin;
        lastSuperAdminActiveAt = block.timestamp;

        // Обязательный сброс активного таймлока и отложенной передачи прав при любой смене superAdmin
        if (pendingSuperAdmin != address(0)) {
            address canceledPending = pendingSuperAdmin;
            pendingSuperAdmin = address(0);
            superAdminChangeUnlockTime = 0;
            if (canceledPending != newSuperAdmin) {
                emit SuperAdminChangeCanceled(oldSuperAdmin, canceledPending);
            }
        }
    }

    /**
     * @notice Сигнал присутствия верховного администратора («Я на месте»).
     * @dev Обновляет метку времени lastSuperAdminActiveAt через модификатор onlySuperAdmin.
     * Предотвращает перехват управления резервным админом при долгом отсутствии других транзакций.
     */
    function iAmHere() external onlySuperAdmin {
        emit SuperAdminActive(msg.sender, block.timestamp);
    }

    /**
     * @notice Смена адреса резервного SuperAdmin.
     * @param newBackupAdmin Новый адрес резервного админа (не может быть нулевым, dead или действующим superAdmin)
     */
    function setBackupSuperAdmin(
        address newBackupAdmin
    ) external onlySuperAdmin {
        if (pendingSuperAdmin != address(0)) revert TimelockActive();
        if (
            newBackupAdmin == address(0) ||
            newBackupAdmin == 0x000000000000000000000000000000000000dEaD
        ) {
            revert ZeroAddress();
        }
        if (newBackupAdmin == superAdmin) revert SuperAdminConflict();

        backupSuperAdmin = newBackupAdmin;
        emit BackupSuperAdminSet(newBackupAdmin);
    }

    /**
     * @notice Активация резервного SuperAdmin при неактивности основного более 7 дней (Dead Man's Switch).
     * @dev Вызывается СТРОГО действующим backupSuperAdmin.
     * Обязывает сразу указать nextCycleBackupAdmin, чтобы контракт ни на 1 секунду не оставался без резерва!
     * @param nextCycleBackupAdmin Новый адрес резервного админа для следующего цикла защиты
     */
    function activateBackupSuperAdmin(address nextCycleBackupAdmin) external {
        if (superAdmin == 0x000000000000000000000000000000000000dEaD) {
            revert MigrationLocked();
        }
        if (msg.sender != backupSuperAdmin) revert Unauthorized();
        if (block.timestamp < lastSuperAdminActiveAt + BACKUP_CLAIM_DELAY) {
            revert InactivityPeriodNotElapsed();
        }
        if (
            nextCycleBackupAdmin == address(0) ||
            nextCycleBackupAdmin == 0x000000000000000000000000000000000000dEaD
        ) {
            revert ZeroAddress();
        }
        if (nextCycleBackupAdmin == msg.sender) revert SuperAdminConflict();

        address previousInactiveAdmin = superAdmin;

        // 1. Назначаем новый резерв для следующего цикла защиты
        backupSuperAdmin = nextCycleBackupAdmin;
        emit BackupSuperAdminSet(nextCycleBackupAdmin);

        // 2. Передаем права: вызывающий резервный админ (msg.sender) становится полноправным SuperAdmin
        _applySuperAdminTransfer(msg.sender);

        emit BackupSuperAdminActivated(previousInactiveAdmin, msg.sender);
    }

    /**
     * @notice Археологическое открытие: если Вселенная заброшена более 365 дней (тишина от superAdmin и резерва),
     * любой исследователь-археолог может заново открыть древний мир, вдохнуть в него жизнь и стать новым SuperAdmin!
     * @dev Защищено от сожженных миров: если контракт уже мигрировал и финализирован (superAdmin == 0xdEaD), вызов запрещен.
     * Обязывает сразу указать nextCycleBackupAdmin, чтобы возрожденный мир был защищен резервом с первой секунды.
     * @param nextCycleBackupAdmin Новый адрес резервного админа для следующего жизненного цикла Вселенной
     */
    function discoverAncientWorld(address nextCycleBackupAdmin) external {
        if (superAdmin == 0x000000000000000000000000000000000000dEaD) {
            revert MigrationLocked();
        }
        if (
            block.timestamp <
            lastSuperAdminActiveAt + ARCHAEOLOGICAL_CLAIM_DELAY
        ) {
            revert InactivityPeriodNotElapsed();
        }
        if (
            nextCycleBackupAdmin == address(0) ||
            nextCycleBackupAdmin == 0x000000000000000000000000000000000000dEaD
        ) {
            revert ZeroAddress();
        }
        if (nextCycleBackupAdmin == msg.sender) revert SuperAdminConflict();
        if (msg.sender == superAdmin) revert SuperAdminConflict();

        address previousAdmin = superAdmin;

        // 1. Назначаем новый резерв для возрожденной эпохи
        backupSuperAdmin = nextCycleBackupAdmin;
        emit BackupSuperAdminSet(nextCycleBackupAdmin);

        // 2. Передаем полноправное верховное руководство археологу-первооткрывателю (msg.sender)
        _applySuperAdminTransfer(msg.sender);

        emit AncientEraRevived(previousAdmin, msg.sender, nextCycleBackupAdmin);
    }

    /**
     * @notice Запрос на смену SuperAdmin с 48-часовой задержкой (Timelock).
     * @dev Фиксирует целевой адрес newSuperAdmin (включая 0x...dEaD при миграции).
     * Через 48 часов смену можно применить СТРОГО на этот заранее объявленный адрес.
     * @param newSuperAdmin Адрес кандидата в новые SuperAdmin (или 0x...dEaD)
     */
    function requestSuperAdminChange(
        address newSuperAdmin
    ) external onlySuperAdmin {
        if (newSuperAdmin == address(0)) revert ZeroAddress();
        if (newSuperAdmin == superAdmin) revert SuperAdminConflict();
        if (newSuperAdmin == backupSuperAdmin) revert SuperAdminConflict();

        // Если уже был активен запрос на другого кандидата, логируем его отмену
        if (pendingSuperAdmin != address(0)) {
            emit SuperAdminChangeCanceled(superAdmin, pendingSuperAdmin);
        }

        // Если планируется сжигание на dEaD — проверяем предварительные условия финализации:
        // 1. nextMain обязан быть уже выставлен
        // 2. Все сторонние модули/админы обязаны быть отключены (в списке может оставаться только сам superAdmin)
        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            if (nextMain == address(0)) revert MigrationLocked();
            if (allowedAdminsCount != 1) revert MigrationLocked();
        }

        uint256 unlockTime = block.timestamp + TIMELOCK_DURATION;
        pendingSuperAdmin = newSuperAdmin;
        superAdminChangeUnlockTime = unlockTime;

        emit SuperAdminChangeRequested(superAdmin, newSuperAdmin, unlockTime);
    }

    /**
     * @notice Отмена текущего запроса на смену SuperAdmin
     */
    function cancelSuperAdminChange() external onlySuperAdmin {
        if (pendingSuperAdmin == address(0)) revert NoPendingSuperAdmin();
        address canceledAdmin = pendingSuperAdmin;
        pendingSuperAdmin = address(0);
        superAdminChangeUnlockTime = 0;

        emit SuperAdminChangeCanceled(superAdmin, canceledAdmin);
    }

    /**
     * @notice Принятие прав SuperAdmin новым владельцем (2-Step Verification).
     * @dev Защищает контракт от потери управления из-за опечатки в адресе:
     * вызывается строго самим кандидатом (msg.sender == pendingSuperAdmin) по истечении 48 часов.
     */
    function acceptSuperAdmin() external {
        if (msg.sender != pendingSuperAdmin) revert Unauthorized();
        if (block.timestamp < superAdminChangeUnlockTime)
            revert TimelockActive();

        address newAdmin = pendingSuperAdmin;
        pendingSuperAdmin = address(0);
        superAdminChangeUnlockTime = 0;

        _applySuperAdminTransfer(newAdmin);
    }

    /**
     * @notice Финализация сжигания прав SuperAdmin на 0x...dEaD по истечении 48 часов.
     * @dev У адреса 0xdEaD нет приватного ключа для вызова acceptSuperAdmin(), поэтому
     * сжигание финализирует действующий superAdmin strictly при pendingSuperAdmin == 0xdEaD.
     */
    function executeSuperAdminBurn() external onlySuperAdmin {
        if (pendingSuperAdmin != 0x000000000000000000000000000000000000dEaD)
            revert Unauthorized();
        if (block.timestamp < superAdminChangeUnlockTime)
            revert TimelockActive();

        pendingSuperAdmin = address(0);
        superAdminChangeUnlockTime = 0;

        _applySuperAdminTransfer(0x000000000000000000000000000000000000dEaD);
    }

    // ========================================================================
    // === СПАСАТЕЛЬНЫЙ ЛЮК (RESCUE TOKENS & ETH)                          ===
    // ========================================================================

    /**
     * @notice Спасение ошибочно отправленных на контракт ERC-20 токенов
     * @dev Доступно СТРОГО верховному администратору (SuperAdmin) с защитой от Reentrancy
     * @param token Адрес смарт-контракта ERC-20 токена
     * @param to Адрес законного получателя
     * @param amount Количество токенов для вывода
     * @dev функция сырая, желательно сначала отправить копеечку и проверить дошла ли.
     */
    function rescueERC20(
        address token,
        address to,
        uint256 amount
    ) external onlySuperAdmin nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        emit TokensRescued(token, to, amount);
        // Низкоуровневый вызов transfer(address,uint256) без внешних тяжелых зависимостей
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool))))
            revert TransferFailed();
    }

    /**
     * @notice Спасение принудительно попавшего на контракт нативного MON/ETH
     * @dev Доступно СТРОГО верховному администратору (SuperAdmin) с защитой от Reentrancy
     * @param to Адрес законного получателя
     * @param amount Количество нативных монет (0 = вывести весь баланс контракта)
     */
    function rescueETH(
        address payable to,
        uint256 amount
    ) external onlySuperAdmin nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = address(this).balance;
        uint256 toRescue = amount == 0 ? balance : amount;
        if (toRescue > balance) revert TransferFailed();

        emit ETHRescued(to, toRescue);
        (bool success, ) = to.call{value: toRescue}("");
        if (!success) revert TransferFailed();
    }
}

// 2
// 4
