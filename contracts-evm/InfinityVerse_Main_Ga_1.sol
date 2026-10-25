// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IInfinityVerse_PrevMain {
    function superAdmin() external view returns (address);
    function nextMain() external view returns (address);
    function getAllowedAdmins() external view returns (address[] memory);
}

/**
 * @title InfinityVerse_Main_Ga_1
 * @notice Это главный контракт и постоянная память мультивселенной на миллион лет.
 * Вечный универсальный ончейн-накопитель данных (Universal Onchain Storage) - Эпоха Ga, Поколение 1.
 * Полностью лишен жестких игровых структур (координат, клеток, игроков).
 * Архитектура строго разделена на 3 независимых блока хранения + блок управления:
 * 1. БЛОК 1: RAW DISK (Сырые 32-байтные секторы bytes32 => bytes32).
 * 2. БЛОК 2: ETERNAL STORAGE (Универсальное типизированное хранилище и BLOB'ы).
 * 3. БЛОК 3: LOW-LEVEL SLOTS (Прямой доступ к слотам памяти EVM через ассемблер Yul).
 * 4. БЛОК 4: АДМИНИСТРИРОВАНИЕ И НАСЛЕДОВАНИЕ (Система SuperAdmin/allowAdmin и Золотой Канон).
 *    Верховный администратор (superAdmin) в перспективе будет передан в смарт-контракт,
 *    управляемый децентрализованным сообществом (DAO / Timelock).
 *
 * Полный регламент эволюции и правила наследования описаны в:
 * contracts-evm/правила наследования.md
 *
 * ПРАВИЛО КОМПИЛЯЦИИ И ОПТИМИЗАЦИИ (MAX RUNS):
 * - Compiler: solc 0.8.20
 * - Optimizer: enabled = true, runs = 4294967295 (максимум uint32)
 * - Обоснование: максимальное число runs обеспечивает предельно дешевый газ для вызовов функций
 *   в течение всей жизни контракта.
 *   Если в будущем при добавлении нового кода контракт перестанет влезать в лимит 24 576 байт,
 *   значение runs необходимо ступенчато снижать (например: 50000 -> 10000 -> 200).
 */
contract InfinityVerse_Main_Ga_1 {
    string public constant VERSION = "0.0.0.0.1-MAIN-Ga-1";
    string public constant EPOCH = "Ga";
    uint256 public constant GENERATION = 1;
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // ========================================================================
    // ИЕРАРХИЯ ПОКОЛЕНИЙ И СИСТЕМА ДОСТУПА
    // ========================================================================
    address public immutable prevMain;
    address public nextMain;
    // Верховный администратор (в перспективе передается в смарт-контракт под управлением DAO)
    address public superAdmin;

    // ========================================================================
    // === СИСТЕМА ПРЯМОЙ АДРЕСАЦИИ СЛОТОВ И ГРАНИЦЫ БЕЗОПАСНОСТИ 2^180     ===
    // ========================================================================

    // Защищаем первые 2^180 слотов с запасом в 1 048 576 раз выше 160-битных адресов
    uint256 public constant RESERVED_SLOTS = 1 << 180;
    uint256 private constant ADMIN_SLOT_PREFIX = 1 << 160;
    uint256 private constant ADMIN_LIST_PREFIX = 2 << 160;

    // Битовые маски прав доступа (младшие 8 бит слота администратора)
    uint8 public constant PERM_NONE          = 0;        // 00000000: Нет прав
    uint8 public constant PERM_ADMIN_STORAGE = 1 << 0;   // 00000001 (1): Запись в Raw Disk (Блок 1) и Eternal Storage (Блок 2)
    uint8 public constant PERM_ADMIN_SLOTS   = 1 << 1;   // 00000010 (2): Запись в Low-Level Yul Slots (Блок 3)
    uint8 public constant PERM_MOD           = 1 << 2;   // 00000100 (4): Роль модератора / оператора
    uint8 public constant PERM_A             = 1 << 3;   // 00001000 (8): Модульное право A (резерв под внешние модули)
    uint8 public constant PERM_B             = 1 << 4;   // 00010000 (16): Модульное право B (резерв под внешние модули)
    uint8 public constant PERM_C             = 1 << 5;   // 00100000 (32): Модульное право C (резерв под внешние модули)
    uint8 public constant PERM_D             = 1 << 6;   // 01000000 (64): Модульное право D (резерв под внешние модули)
    uint8 public constant PERM_EXT           = 1 << 7;   // 10000000 (128): Расширенное право (резерв под будущие стандарты)
    uint8 public constant PERM_ALL           = 255;      // 11111111: Полный доступ ко всем битам (включая будущие)

    /**
     * @notice Структура распакованных данных администратора для вывода (View, RPC, UI)
     */
    struct AdminInfo {
        bool isActive;       // Активен ли прямо сейчас с учетом времени и прав
        uint8 permissions;   // Битовая маска прав (PERM_ADMIN_STORAGE, PERM_ADMIN_SLOTS, PERM_MOD и др.)
        uint8 role;          // Роль / ранг (0..255)
        uint48 validFrom;    // Таймстамп старта действия прав
        uint64 validUntil;   // Таймстамп истечения прав (0 = бессрочно)
        uint64 listIndex;    // Индекс в массиве allowedAdminsList
        uint8 paramA;        // Пользовательский модульный параметр A
        uint8 paramB;        // Пользовательский модульный параметр B
        uint16 paramC;       // Пользовательский модульный параметр C
        uint32 paramD;       // Пользовательский модульный параметр D
    }

    // Количество администраторов в реестре (сами адреса лежат в защищенной зоне ADMIN_LIST_PREFIX + i)
    uint256 public allowedAdminsCount;

    event AdminAllowed(address indexed adminAddress, uint8 perms, uint8 role);
    event AdminDisallowed(address indexed adminAddress);
    event SuperAdminChanged(address indexed oldSuperAdmin, address indexed newSuperAdmin);
    event NextMainSet(address indexed nextMainAddress);

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Main: caller is not superAdmin");
        _;
    }

    /**
     * @dev Изолированное низкоуровневое чтение персонального слота администратора.
     */
    function _readAdminSlot(address _account) internal view returns (uint256 packed) {
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
        require((uint8(packed) & requiredPerm) == requiredPerm, "Main: insufficient permissions");
        require(block.timestamp >= uint48(packed >> 16), "Main: rights not active yet");
        uint64 until = uint64(packed >> 64);
        require(until == 0 || block.timestamp <= until, "Main: rights expired");
    }

    /**
     * @notice Базовый модификатор для обычных администраторов и логических модулей.
     * @dev Требует права PERM_ADMIN_STORAGE (Блок 1 Raw Disk и Блок 2 Eternal Storage).
     */
    modifier onlyAdmins() {
        _checkAdmin(msg.sender, PERM_ADMIN_STORAGE);
        _;
    }

    /**
     * @notice Модификатор для администраторов с доступом к физическим слотам памяти EVM.
     * @dev Требует права PERM_ADMIN_SLOTS (Блок 3 Low-Level Yul Slots).
     */
    modifier onlySlotAdmins() {
        _checkAdmin(msg.sender, PERM_ADMIN_SLOTS);
        _;
    }

    /**
     * @notice Возвращает полную информацию об администраторе в распакованном виде.
     * @param _account Адрес администратора или модуля
     */
    function getAdminInfo(address _account) public view returns (AdminInfo memory info) {
        if (_account == superAdmin) {
            info.isActive = true;
            info.permissions = PERM_ALL;
            info.role = 255;
            return info;
        }

        uint256 packed = _readAdminSlot(_account);
        uint8 perms = uint8(packed);
        uint48 validFrom = uint48(packed >> 16);
        uint64 validUntil = uint64(packed >> 64);
        uint64 idxPlusOne = uint64(packed >> 128);

        bool active = (perms != 0)
            && (block.timestamp >= validFrom)
            && (validUntil == 0 || block.timestamp <= validUntil);

        info.isActive = active;
        info.permissions = perms;
        info.role = uint8(packed >> 8);
        info.validFrom = validFrom;
        info.validUntil = validUntil;
        info.listIndex = idxPlusOne > 0 ? idxPlusOne - 1 : 0;
        info.paramA = uint8(packed >> 192);
        info.paramB = uint8(packed >> 200);
        info.paramC = uint16(packed >> 208);
        info.paramD = uint32(packed >> 224);
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

    constructor(address _prevMain) {
        if (_prevMain != address(0) && _prevMain != 0x000000000000000000000000000000000000dEaD) {
            // Проверка запечатывания предыдущего поколения:
            // 1. Главный админ старого контракта должен быть сожжен на Dead-адрес
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).superAdmin();
            require(
                prevAdmin == 0x000000000000000000000000000000000000dEaD,
                "Main: previous admin is not burned (not dead)"
            );

            // 2. Все модули и администраторы старого контракта должны быть отключены
            require(
                IInfinityVerse_PrevMain(_prevMain).getAllowedAdmins().length == 0,
                "Main: previous generation allowed admins list is not empty"
            );

            // 3. Старый контракт обязан явно указать этот новый контракт своим наследником
            require(
                IInfinityVerse_PrevMain(_prevMain).nextMain() == address(this),
                "Main: this contract is not registered as nextMain in previous generation"
            );
        }

        superAdmin = msg.sender;
        prevMain = _prevMain;

        // Предоставляем супер-администратору прямые права в персональный слот с рождения хранилища
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(superAdmin);
        // Добавляем superAdmin как первого элемента списка по прямому адресу ADMIN_LIST_PREFIX + 0
        _setSlot(bytes32(ADMIN_LIST_PREFIX), bytes32(uint256(uint160(superAdmin))));
        allowedAdminsCount = 1;

        // Упаковываем: PERM_ALL (255), role: 255, indexPlusOne: 1
        uint256 packed = uint256(PERM_ALL) | (uint256(255) << 8) | (uint256(1) << 128);
        assembly {
            sstore(slot, packed)
        }
        emit AdminAllowed(superAdmin, PERM_ALL, 255);
    }

    // ========================================================================
    // ========================================================================
    // === БЛОК 1: RAW DISK (СЫРЫЕ 32-БАЙТНЫЕ СЕКТОРЫ) - ОСНОВНОЙ РЕЖИМ   ===
    // ========================================================================
    // ========================================================================

    // 1.1. Хранилище секторов (Сектор => 32 байта данных)
    mapping(bytes32 => bytes32) private disk;

    // 1.2. Методы чтения и записи диска
    // Примечание по пакетным операциям (Batch):
    // Размеры входных массивов намеренно не ограничиваются жесткими лимитами в смарт-контракте.
    // Это исключает лишний расход газа на проверки и оставляет пространство для расширения
    // при росте Block Gas Limit сети. Контроль разбиения на порции возложен на вызывающие модули.
    /**
     * @notice Чтение одного 32-байтного сектора по ключу
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
    function readSectorBatch(bytes32[] calldata sectors) external view returns (bytes32[] memory) {
        uint256 len = sectors.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = disk[sectors[i]];
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
    function writeSectorBatch(bytes32[] calldata sectors, bytes32[] calldata data) external onlyAdmins {
        require(sectors.length == data.length, "Main: sectors and data length mismatch");
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; i++) {
            disk[sectors[i]] = data[i];
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
    function readSectorSlice(bytes32 sector, uint256 offset, uint256 length) external view returns (bytes memory slice) {
        require(offset + length <= 32, "Main: slice out of sector bounds");
        bytes32 val = disk[sector];
        slice = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            slice[i] = val[offset + i];
        }
    }

    /**
     * @notice Последовательное непрерывное чтение дорожки секторов (Chunk Read)
     * @param baseSector Начальный сектор
     * @param count Количество непрерывных секторов для чтения подряд
     * @return result Массив считанных 32-байтных секторов
     */
    function readSequential(bytes32 baseSector, uint256 count) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](count);
        uint256 base = uint256(baseSector);
        for (uint256 i = 0; i < count; i++) {
            result[i] = disk[bytes32(base + i)];
        }
        return result;
    }

    /**
     * @notice Последовательная непрерывная запись дорожки секторов (Chunk Stream Write, экономия 50% calldata)
     * @param baseSector Начальный сектор
     * @param data Массив 32-байтных данных, записываемых подряд в baseSector + i
     */
    function writeSequential(bytes32 baseSector, bytes32[] calldata data) external onlyAdmins {
        uint256 len = data.length;
        uint256 base = uint256(baseSector);
        for (uint256 i = 0; i < len; i++) {
            disk[bytes32(base + i)] = data[i];
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
        for (uint256 i = 0; i < len; i++) {
            delete disk[sectors[i]];
        }
    }



    // ========================================================================
    // ========================================================================
    // === БЛОК 2: ETERNAL STORAGE (УНИВЕРСАЛЬНЫЕ ТИПЫ И BLOB'Ы)           ===
    // ========================================================================
    // ========================================================================

    // 2.1. Маппинги типов данных
    mapping(bytes32 => uint8)   private u8s;
    mapping(bytes32 => uint16)  private u16s;
    mapping(bytes32 => uint32)  private u32s;
    mapping(bytes32 => uint64)  private u64s;
    mapping(bytes32 => uint128) private u128s;
    mapping(bytes32 => uint256) private u256s;

    mapping(bytes32 => int8)    private i8s;
    mapping(bytes32 => int16)   private i16s;
    mapping(bytes32 => int32)   private i32s;
    mapping(bytes32 => int64)   private i64s;
    mapping(bytes32 => int128)  private i128s;
    mapping(bytes32 => int256)  private i256s;

    mapping(bytes32 => bool)    private bools;
    mapping(bytes32 => address) private addrs;
    mapping(bytes32 => bytes1)  private b1s;
    mapping(bytes32 => bytes4)  private b4s;
    mapping(bytes32 => bytes8)  private b8s;
    mapping(bytes32 => bytes16) private b16s;

    mapping(bytes32 => string)  private strings;
    mapping(bytes32 => bytes)   private blobs;

    
    // 2.3. Методы чтения, записи и очистки: Беззнаковые целые (uint8 ... uint256)
    function getUint8(bytes32 key) external view returns (uint8) { return u8s[key]; }
    function setUint8(bytes32 key, uint8 val) external onlyAdmins { u8s[key] = val; }
    function trimUint8(bytes32 key) external onlyAdmins { delete u8s[key]; }

    function getUint16(bytes32 key) external view returns (uint16) { return u16s[key]; }
    function setUint16(bytes32 key, uint16 val) external onlyAdmins { u16s[key] = val; }
    function trimUint16(bytes32 key) external onlyAdmins { delete u16s[key]; }

    function getUint32(bytes32 key) external view returns (uint32) { return u32s[key]; }
    function setUint32(bytes32 key, uint32 val) external onlyAdmins { u32s[key] = val; }
    function trimUint32(bytes32 key) external onlyAdmins { delete u32s[key]; }

    function getUint64(bytes32 key) external view returns (uint64) { return u64s[key]; }
    function setUint64(bytes32 key, uint64 val) external onlyAdmins { u64s[key] = val; }
    function trimUint64(bytes32 key) external onlyAdmins { delete u64s[key]; }

    function getUint128(bytes32 key) external view returns (uint128) { return u128s[key]; }
    function setUint128(bytes32 key, uint128 val) external onlyAdmins { u128s[key] = val; }
    function trimUint128(bytes32 key) external onlyAdmins { delete u128s[key]; }

    function getUint256(bytes32 key) external view returns (uint256) { return u256s[key]; }
    function setUint256(bytes32 key, uint256 val) external onlyAdmins { u256s[key] = val; }
    function trimUint256(bytes32 key) external onlyAdmins { delete u256s[key]; }

    // 2.4. Методы чтения, записи и очистки: Знаковые целые (int8 ... int256)
    function getInt8(bytes32 key) external view returns (int8) { return i8s[key]; }
    function setInt8(bytes32 key, int8 val) external onlyAdmins { i8s[key] = val; }
    function trimInt8(bytes32 key) external onlyAdmins { delete i8s[key]; }

    function getInt16(bytes32 key) external view returns (int16) { return i16s[key]; }
    function setInt16(bytes32 key, int16 val) external onlyAdmins { i16s[key] = val; }
    function trimInt16(bytes32 key) external onlyAdmins { delete i16s[key]; }

    function getInt32(bytes32 key) external view returns (int32) { return i32s[key]; }
    function setInt32(bytes32 key, int32 val) external onlyAdmins { i32s[key] = val; }
    function trimInt32(bytes32 key) external onlyAdmins { delete i32s[key]; }

    function getInt64(bytes32 key) external view returns (int64) { return i64s[key]; }
    function setInt64(bytes32 key, int64 val) external onlyAdmins { i64s[key] = val; }
    function trimInt64(bytes32 key) external onlyAdmins { delete i64s[key]; }

    function getInt128(bytes32 key) external view returns (int128) { return i128s[key]; }
    function setInt128(bytes32 key, int128 val) external onlyAdmins { i128s[key] = val; }
    function trimInt128(bytes32 key) external onlyAdmins { delete i128s[key]; }

    function getInt256(bytes32 key) external view returns (int256) { return i256s[key]; }
    function setInt256(bytes32 key, int256 val) external onlyAdmins { i256s[key] = val; }
    function trimInt256(bytes32 key) external onlyAdmins { delete i256s[key]; }

    // 2.5. Методы чтения, записи и очистки: Булевы значения и адреса
    function getBool(bytes32 key) external view returns (bool) { return bools[key]; }
    function setBool(bytes32 key, bool val) external onlyAdmins { bools[key] = val; }
    function trimBool(bytes32 key) external onlyAdmins { delete bools[key]; }

    function getAddress(bytes32 key) external view returns (address) { return addrs[key]; }
    function setAddress(bytes32 key, address val) external onlyAdmins { addrs[key] = val; }
    function trimAddress(bytes32 key) external onlyAdmins { delete addrs[key]; }

    // 2.6. Методы чтения, записи и очистки: Фиксированные байты
    function getBytes1(bytes32 key) external view returns (bytes1) { return b1s[key]; }
    function setBytes1(bytes32 key, bytes1 val) external onlyAdmins { b1s[key] = val; }
    function trimBytes1(bytes32 key) external onlyAdmins { delete b1s[key]; }

    function getBytes4(bytes32 key) external view returns (bytes4) { return b4s[key]; }
    function setBytes4(bytes32 key, bytes4 val) external onlyAdmins { b4s[key] = val; }
    function trimBytes4(bytes32 key) external onlyAdmins { delete b4s[key]; }

    function getBytes8(bytes32 key) external view returns (bytes8) { return b8s[key]; }
    function setBytes8(bytes32 key, bytes8 val) external onlyAdmins { b8s[key] = val; }
    function trimBytes8(bytes32 key) external onlyAdmins { delete b8s[key]; }

    function getBytes16(bytes32 key) external view returns (bytes16) { return b16s[key]; }
    function setBytes16(bytes32 key, bytes16 val) external onlyAdmins { b16s[key] = val; }
    function trimBytes16(bytes32 key) external onlyAdmins { delete b16s[key]; }

    // 2.7. Методы чтения, записи и очистки: Динамические строки и произвольные байты (BLOBs)
    function getString(bytes32 key) external view returns (string memory) { return strings[key]; }
    function setString(bytes32 key, string calldata val) external onlyAdmins { strings[key] = val; }
    function trimString(bytes32 key) external onlyAdmins { delete strings[key]; }

    function getBlob(bytes32 key) external view returns (bytes memory) { return blobs[key]; }
    function setBlob(bytes32 key, bytes calldata val) external onlyAdmins { blobs[key] = val; }
    function trimBlob(bytes32 key) external onlyAdmins { delete blobs[key]; }

    // ========================================================================
    // ========================================================================
    // === БЛОК 3: LOW-LEVEL SLOTS (DIAMOND / ASSEMBLY SLOAD & SSTORE)     ===
    // ========================================================================
    // ========================================================================
    // Архитектурное примечание по безопасности:
    // Диапазон RESERVED_SLOTS (первые 2^180 слотов) гарантированно защищает:
    // 1. Системные переменные: слот 0 (nextMain) и слот 1 (superAdmin).
    // 2. Персональные сейфы прав доступа администраторов: диапазон [2^160, 2^161 - 1].
    // Прямой доступ к физической памяти (sload/sstore) за пределами 2^180 доступен только
    // superAdmin и доверенным модулям с флагом PERM_ADMIN_SLOTS.

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
        require(uint256(slot) >= RESERVED_SLOTS, "Main: slot is in reserved range");
        _setSlot(slot, val);
    }

    /**
     * @notice Пакетное чтение произвольных физических слотов EVM через Yul
     * @param slots Массив номеров слотов
     * @return result Массив считанных 32-байтных значений
     */
    function readSlotBatch(bytes32[] calldata slots) external view returns (bytes32[] memory) {
        uint256 len = slots.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = _getSlot(slots[i]);
        }
        return result;
    }

    /**
     * @notice Пакетная запись в произвольные физические слоты EVM через Yul
     * @param slots Массив номеров слотов (каждый должен быть >= RESERVED_SLOTS)
     * @param vals Массив 32-байтных значений
     */
    function writeSlotBatch(bytes32[] calldata slots, bytes32[] calldata vals) external onlySlotAdmins {
        require(slots.length == vals.length, "Main: slots and vals length mismatch");
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            require(uint256(slot) >= RESERVED_SLOTS, "Main: slot is in reserved range");
            _setSlot(slot, vals[i]);
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
    function readSlotSlice(bytes32 slot, uint256 offset, uint256 length) external view returns (bytes memory slice) {
        require(offset + length <= 32, "Main: slice out of slot bounds");
        bytes32 val = _getSlot(slot);
        slice = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            slice[i] = val[offset + i];
        }
    }

    /**
     * @notice Последовательное чтение непрерывных физических слотов EVM через Yul
     * @param baseSlot Начальный физический слот памяти
     * @param count Количество слотов подряд
     */
    function readSlotSequential(bytes32 baseSlot, uint256 count) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](count);
        uint256 base = uint256(baseSlot);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _getSlot(bytes32(base + i));
        }
        return result;
    }

    /**
     * @notice Последовательная потоковая запись в непрерывные физические слоты памяти EVM через Yul
     * @param baseSlot Начальный физический слот (должен быть >= RESERVED_SLOTS)
     * @param vals Массив значений для записи подряд
     */
    function writeSlotSequential(bytes32 baseSlot, bytes32[] calldata vals) external onlySlotAdmins {
        require(uint256(baseSlot) >= RESERVED_SLOTS, "Main: baseSlot is in reserved range");
        uint256 len = vals.length;
        uint256 base = uint256(baseSlot);
        for (uint256 i = 0; i < len; i++) {
            _setSlot(bytes32(base + i), vals[i]);
        }
    }

    /**
     * @notice Очистка физического слота EVM (TRIM / sstore zero) с возвратом газа
     * @param slot Физический слот памяти (должен быть >= RESERVED_SLOTS)
     */
    function trimSlot(bytes32 slot) external onlySlotAdmins {
        require(uint256(slot) >= RESERVED_SLOTS, "Main: slot is in reserved range");
        _setSlot(slot, 0);
    }

    /**
     * @notice Пакетная очистка массива физических слотов (TRIM Slot Batch) с возвратом газа
     * @param slots Массив физических слотов памяти (каждый должен быть >= RESERVED_SLOTS)
     */
    function trimSlotBatch(bytes32[] calldata slots) external onlySlotAdmins {
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            require(uint256(slot) >= RESERVED_SLOTS, "Main: slot is in reserved range");
            _setSlot(slot, 0);
        }
    }

    /**
     * @notice Калькулятор слотов стандарта ERC-7201: вычисляет базовый слот изолированного пространства имен
     * @dev Формула: keccak256(uint256(keccak256(namespaceId)) - 1) & ~0xff
     * Гарантирует выделение безопасного диапазона слотов для внешних исполняемых контрактов (AAA, BBB, CCC)!
     * @param namespaceId Текстовый идентификатор модуля/пространства (например, "infinity.module.movement")
     * @return rootSlot Уникальный базовый слот физической памяти EVM, гарантированно свободный от коллизий
     */
    function getNamespaceSlot(string calldata namespaceId) external pure returns (bytes32 rootSlot) {
        return keccak256(abi.encode(uint256(keccak256(bytes(namespaceId))) - 1)) & ~bytes32(uint256(0xff));
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
        uint48 validFrom,
        uint64 validUntil,
        uint8 paramA,
        uint8 paramB,
        uint16 paramC,
        uint32 paramD
    ) external onlySuperAdmin {
        require(adminAddress != address(0), "Main: zero address");
        require(perms != 0, "Main: empty permissions");

        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 idxPlusOne;
        assembly {
            idxPlusOne := shr(128, sload(slot))
        }

        if (idxPlusOne == 0) {
            uint256 count = allowedAdminsCount;
            _setSlot(bytes32(ADMIN_LIST_PREFIX + count), bytes32(uint256(uint160(adminAddress))));
            allowedAdminsCount = count + 1;
            idxPlusOne = count + 1;
        }

        uint256 packed;
        assembly {
            packed := or(
                or(
                    or(perms, shl(8, role)),
                    or(shl(16, validFrom), shl(64, validUntil))
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
        require(adminAddress != superAdmin, "Main: cannot disallow current superAdmin directly");
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 packed;
        assembly {
            packed := sload(slot)
        }

        uint64 idxPlusOne = uint64(packed >> 128);
        require(idxPlusOne != 0, "Main: admin not found");

        uint256 index = idxPlusOne - 1;
        uint256 lastIndex = allowedAdminsCount - 1;

        // Мгновенное удаление методом Swap & Pop за O(1) внутри защищенной зоны ADMIN_LIST_PREFIX
        if (index != lastIndex) {
            bytes32 lastAdminVal = _getSlot(bytes32(ADMIN_LIST_PREFIX + lastIndex));
            address lastAdmin = address(uint160(uint256(lastAdminVal)));
            _setSlot(bytes32(ADMIN_LIST_PREFIX + index), lastAdminVal);

            // Обновляем indexPlusOne у перенесённого админа в его личном слоте
            uint256 lastPacked = _readAdminSlot(lastAdmin);
            lastPacked = (lastPacked & ~(uint256(0xFFFFFFFFFFFFFFFF) << 128)) | (uint256(idxPlusOne) << 128);
            _setSlot(bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)), bytes32(lastPacked));
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
        for (uint256 i = 0; i < count; i++) {
            list[i] = address(uint160(uint256(_getSlot(bytes32(ADMIN_LIST_PREFIX + i)))));
        }
        return list;
    }

    /**
     * @notice Установка адреса следующего поколения Main (наследника)
     * @dev Может обновляться действующим superAdmin до момента сжигания superAdmin на 0x...dEaD.
     * После сжигания superAdmin вызов становится недостижим навсегда.
     * @param _nextMain Адрес контракта-наследника Main
     */
    function setNextMain(address _nextMain) external onlySuperAdmin {
        require(_nextMain != address(0), "Main: invalid nextMain address");
        nextMain = _nextMain;
        emit NextMainSet(_nextMain);
    }

    /**
     * @notice Передача прав главного администратора (SuperAdmin) на новый адрес
     * @dev При финализации миграции передается на 0x...dEaD.
     * Защита запрещает сжечь админа, если список администраторов не пуст или nextMain не задан!
     * @param newSuperAdmin Адрес нового главного администратора
     */
    function changeSuperAdmin(address newSuperAdmin) external onlySuperAdmin {
        require(newSuperAdmin != address(0), "Main: new superAdmin cannot be zero");
        require(newSuperAdmin != superAdmin, "Main: address is already superAdmin");

        // 1. Автоматически отзываем права у предыдущего SuperAdmin за O(1)
        if (_isAdmin(superAdmin)) {
            uint256 prevPacked = _readAdminSlot(superAdmin);
            uint64 prevIdxPlusOne = uint64(prevPacked >> 128);
            if (prevIdxPlusOne != 0) {
                uint256 prevIdx = prevIdxPlusOne - 1;
                uint256 lastIdx = allowedAdminsCount - 1;
                if (prevIdx != lastIdx) {
                    bytes32 lastAdminVal = _getSlot(bytes32(ADMIN_LIST_PREFIX + lastIdx));
                    address lastAdmin = address(uint160(uint256(lastAdminVal)));
                    _setSlot(bytes32(ADMIN_LIST_PREFIX + prevIdx), lastAdminVal);
                    uint256 lastPacked = _readAdminSlot(lastAdmin);
                    lastPacked = (lastPacked & ~(uint256(0xFFFFFFFFFFFFFFFF) << 128)) | (uint256(prevIdxPlusOne) << 128);
                    _setSlot(bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)), bytes32(lastPacked));
                }
                _setSlot(bytes32(ADMIN_LIST_PREFIX + lastIdx), 0);
                allowedAdminsCount = lastIdx;
            }
            _setSlot(bytes32(ADMIN_SLOT_PREFIX | uint160(superAdmin)), 0);
            emit AdminDisallowed(superAdmin);
        }

        // 2. Если финализируем поколение и сжигаем на dEaD:
        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            require(nextMain != address(0), "Main: lock nextMain before burning admin");
            require(
                allowedAdminsCount == 0,
                "Main: revoke all admins before burning superAdmin"
            );
        } else {
            // 3. Если передаем новому SuperAdmin — вносим его в общий реестр админов
            if (!_isAdmin(newSuperAdmin)) {
                uint256 newSlot = ADMIN_SLOT_PREFIX | uint160(newSuperAdmin);
                uint256 count = allowedAdminsCount;
                _setSlot(bytes32(ADMIN_LIST_PREFIX + count), bytes32(uint256(uint160(newSuperAdmin))));
                allowedAdminsCount = count + 1;
                uint64 idxPlusOne = uint64(count + 1);
                uint256 packed = uint256(PERM_ALL) | (uint256(255) << 8) | (uint256(idxPlusOne) << 128);
                assembly {
                    sstore(newSlot, packed)
                }
                emit AdminAllowed(newSuperAdmin, PERM_ALL, 255);
            }
        }

        emit SuperAdminChanged(superAdmin, newSuperAdmin);
        superAdmin = newSuperAdmin;
    }
}
