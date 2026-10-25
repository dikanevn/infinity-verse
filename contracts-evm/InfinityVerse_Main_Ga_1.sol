// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInfinityVerse_PrevMain {
    function admin() external view returns (address);
    function contractAAA() external view returns (address);
    function nextMain() external view returns (address);
    function getAllowedContracts() external view returns (address[] memory);
}

/**
 * @title InfinityVerse_Main_Ga_1
 * @notice Вечный универсальный ончейн-накопитель данных (Universal Onchain Storage) - Эпоха Ga, Поколение 1.
 * Полностью лишен жестких игровых структур (координат, клеток, игроков).
 * Архитектура строго разделена на 3 независимых блока хранения + блок управления:
 * 1. БЛОК 1: RAW DISK (Сырые 32-байтные секторы bytes32 => bytes32).
 * 2. БЛОК 2: ETERNAL STORAGE (Универсальное типизированное хранилище и BLOB'ы).
 * 3. БЛОК 3: LOW-LEVEL SLOTS (Прямой доступ к слотам памяти EVM через ассемблер Yul).
 * 4. БЛОК 4: АДМИНИСТРИРОВАНИЕ И НАСЛЕДОВАНИЕ (Система SuperAdmin/allowAdmin и Золотой Канон).
 *
 * Полный регламент эволюции и правила наследования описаны в:
 * contracts-evm/правила наследования.md
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
    address public superAdmin;

    // Реестр авторизованных администраторов / модулей логики (AAA, BBB, CCC, суб-админы)
    mapping(address => bool) public allowedAdmins;
    address[] public allowedAdminsList;

    event AdminAllowed(address indexed adminAddress);
    event AdminDisallowed(address indexed adminAddress);
    event SuperAdminChanged(address indexed oldSuperAdmin, address indexed newSuperAdmin);
    event NextMainSet(address indexed nextMainAddress);

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, unicode"Main: Вызов разрешен только главному администратору");
        _;
    }

    modifier onlyAllowed() {
        require(
            allowedAdmins[msg.sender] || msg.sender == superAdmin,
            unicode"Main: Вызов разрешен только авторизованному администратору или модулю"
        );
        _;
    }

    constructor(address _prevMain) {
        if (_prevMain != address(0) && _prevMain != 0x000000000000000000000000000000000000dEaD) {
            // Проверка запечатывания предыдущего поколения:
            // 1. Главный админ старого контракта должен быть сожжен на Dead-адрес
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).admin();
            require(
                prevAdmin == 0x000000000000000000000000000000000000dEaD,
                unicode"Main: Админ предыдущего поколения еще не сожжен (не dead)"
            );

            // 2. Все модули и администраторы старого контракта должны быть отключены
            try IInfinityVerse_PrevMain(_prevMain).getAllowedContracts() returns (address[] memory prevList) {
                require(
                    prevList.length == 0,
                    unicode"Main: Список администраторов предыдущего поколения не пуст"
                );
            } catch {
                require(
                    IInfinityVerse_PrevMain(_prevMain).contractAAA() == address(0),
                    unicode"Main: Логика предыдущего поколения еще не отключена"
                );
            }

            // 3. Старый контракт обязан явно указать этот новый контракт своим наследником
            require(
                IInfinityVerse_PrevMain(_prevMain).nextMain() == address(this),
                unicode"Main: Этот контракт не зарегистрирован как nextMain в предыдущем поколении"
            );
        }

        superAdmin = msg.sender;
        prevMain = _prevMain;

        // Предоставляем супер-администратору прямые права в allowedAdmins с рождения хранилища
        allowedAdmins[superAdmin] = true;
        allowedAdminsList.push(superAdmin);
        emit AdminAllowed(superAdmin);
    }

    // ========================================================================
    // ========================================================================
    // === БЛОК 1: RAW DISK (СЫРЫЕ 32-БАЙТНЫЕ СЕКТОРЫ) - ОСНОВНОЙ РЕЖИМ   ===
    // ========================================================================
    // ========================================================================

    // 1.1. Хранилище секторов (Сектор => 32 байта данных)
    mapping(bytes32 => bytes32) private disk;

    // 1.2. События диска
    event SectorWritten(bytes32 indexed sector, bytes32 data);

    // 1.3. Методы чтения и записи диска
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
    function writeSector(bytes32 sector, bytes32 data) external onlyAllowed {
        disk[sector] = data;
        emit SectorWritten(sector, data);
    }

    /**
     * @notice Пакетная запись массива секторов (для разведки пачек клеток и обновления состояния)
     * @param sectors Массив адресов секторов
     * @param data Массив 32-байтных значений
     */
    function writeSectorBatch(bytes32[] calldata sectors, bytes32[] calldata data) external onlyAllowed {
        require(sectors.length == data.length, unicode"Main: Несовпадение длины массивов секторов и данных");
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; i++) {
            disk[sectors[i]] = data[i];
            emit SectorWritten(sectors[i], data[i]);
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

    // 2.2. События Eternal Storage
    event UintSet(bytes32 indexed key, uint256 value);
    event IntSet(bytes32 indexed key, int256 value);
    event BoolSet(bytes32 indexed key, bool value);
    event AddressSet(bytes32 indexed key, address value);
    event BytesSet(bytes32 indexed key);
    event StringSet(bytes32 indexed key);
    event BlobSet(bytes32 indexed key, uint256 length);

    // 2.3. Методы чтения и записи: Беззнаковые целые (uint8 ... uint256)
    /**
     * @notice Получение 8-битного беззнакового числа по ключу
     * @param key 32-байтный хеш-ключ переменной
     * @return Значение uint8 (0..255)
     */
    function getUint8(bytes32 key) external view returns (uint8) { return u8s[key]; }

    /**
     * @notice Запись 8-битного беззнакового числа
     * @param key 32-байтный хеш-ключ
     * @param val Значение uint8
     */
    function setUint8(bytes32 key, uint8 val) external onlyAllowed { u8s[key] = val; emit UintSet(key, val); }

    /**
     * @notice Получение 16-битного беззнакового числа по ключу
     */
    function getUint16(bytes32 key) external view returns (uint16) { return u16s[key]; }

    /**
     * @notice Запись 16-битного беззнакового числа
     */
    function setUint16(bytes32 key, uint16 val) external onlyAllowed { u16s[key] = val; emit UintSet(key, val); }

    /**
     * @notice Получение 32-битного беззнакового числа по ключу
     */
    function getUint32(bytes32 key) external view returns (uint32) { return u32s[key]; }

    /**
     * @notice Запись 32-битного беззнакового числа
     */
    function setUint32(bytes32 key, uint32 val) external onlyAllowed { u32s[key] = val; emit UintSet(key, val); }

    /**
     * @notice Получение 64-битного беззнакового числа по ключу (таймстампы, блоки)
     */
    function getUint64(bytes32 key) external view returns (uint64) { return u64s[key]; }

    /**
     * @notice Запись 64-битного беззнакового числа
     */
    function setUint64(bytes32 key, uint64 val) external onlyAllowed { u64s[key] = val; emit UintSet(key, val); }

    /**
     * @notice Получение 128-битного беззнакового числа по ключу
     */
    function getUint128(bytes32 key) external view returns (uint128) { return u128s[key]; }

    /**
     * @notice Запись 128-битного беззнакового числа
     */
    function setUint128(bytes32 key, uint128 val) external onlyAllowed { u128s[key] = val; emit UintSet(key, val); }

    /**
     * @notice Получение стандартного 256-битного числа по ключу (балансы, счетчики)
     */
    function getUint256(bytes32 key) external view returns (uint256) { return u256s[key]; }

    /**
     * @notice Запись 256-битного беззнакового числа
     */
    function setUint256(bytes32 key, uint256 val) external onlyAllowed { u256s[key] = val; emit UintSet(key, val); }

    // 2.4. Методы чтения и записи: Знаковые целые (int8 ... int256)
    /**
     * @notice Получение 8-битного знакового числа по ключу
     */
    function getInt8(bytes32 key) external view returns (int8) { return i8s[key]; }

    /**
     * @notice Запись 8-битного знакового числа
     */
    function setInt8(bytes32 key, int8 val) external onlyAllowed { i8s[key] = val; emit IntSet(key, val); }

    /**
     * @notice Получение 16-битного знакового числа по ключу
     */
    function getInt16(bytes32 key) external view returns (int16) { return i16s[key]; }

    /**
     * @notice Запись 16-битного знакового числа
     */
    function setInt16(bytes32 key, int16 val) external onlyAllowed { i16s[key] = val; emit IntSet(key, val); }

    /**
     * @notice Получение 32-битного знакового числа по ключу (координаты X, Y)
     */
    function getInt32(bytes32 key) external view returns (int32) { return i32s[key]; }

    /**
     * @notice Запись 32-битного знакового числа
     */
    function setInt32(bytes32 key, int32 val) external onlyAllowed { i32s[key] = val; emit IntSet(key, val); }

    /**
     * @notice Получение 64-битного знакового числа по ключу
     */
    function getInt64(bytes32 key) external view returns (int64) { return i64s[key]; }

    /**
     * @notice Запись 64-битного знакового числа
     */
    function setInt64(bytes32 key, int64 val) external onlyAllowed { i64s[key] = val; emit IntSet(key, val); }

    /**
     * @notice Получение 128-битного знакового числа по ключу
     */
    function getInt128(bytes32 key) external view returns (int128) { return i128s[key]; }

    /**
     * @notice Запись 128-битного знакового числа
     */
    function setInt128(bytes32 key, int128 val) external onlyAllowed { i128s[key] = val; emit IntSet(key, val); }

    /**
     * @notice Получение 256-битного знакового числа по ключу
     */
    function getInt256(bytes32 key) external view returns (int256) { return i256s[key]; }

    /**
     * @notice Запись 256-битного знакового числа
     */
    function setInt256(bytes32 key, int256 val) external onlyAllowed { i256s[key] = val; emit IntSet(key, val); }

    // 2.5. Методы чтения и записи: Булевы значения и адреса
    /**
     * @notice Получение логического флага (bool) по ключу
     */
    function getBool(bytes32 key) external view returns (bool) { return bools[key]; }

    /**
     * @notice Запись логического флага (bool)
     */
    function setBool(bytes32 key, bool val) external onlyAllowed { bools[key] = val; emit BoolSet(key, val); }

    /**
     * @notice Получение адреса кошелька или контракта по ключу
     */
    function getAddress(bytes32 key) external view returns (address) { return addrs[key]; }

    /**
     * @notice Запись адреса кошелька или контракта
     */
    function setAddress(bytes32 key, address val) external onlyAllowed { addrs[key] = val; emit AddressSet(key, val); }

    // 2.6. Методы чтения и записи: Фиксированные байты
    /**
     * @notice Получение 1-байтового значения по ключу
     */
    function getBytes1(bytes32 key) external view returns (bytes1) { return b1s[key]; }

    /**
     * @notice Запись 1-байтового значения
     */
    function setBytes1(bytes32 key, bytes1 val) external onlyAllowed { b1s[key] = val; emit BytesSet(key); }

    /**
     * @notice Получение 4-байтового значения по ключу (хеш селектора функции)
     */
    function getBytes4(bytes32 key) external view returns (bytes4) { return b4s[key]; }

    /**
     * @notice Запись 4-байтового значения
     */
    function setBytes4(bytes32 key, bytes4 val) external onlyAllowed { b4s[key] = val; emit BytesSet(key); }

    /**
     * @notice Получение 8-байтового значения по ключу
     */
    function getBytes8(bytes32 key) external view returns (bytes8) { return b8s[key]; }

    /**
     * @notice Запись 8-байтового значения
     */
    function setBytes8(bytes32 key, bytes8 val) external onlyAllowed { b8s[key] = val; emit BytesSet(key); }

    /**
     * @notice Получение 16-байтового значения по ключу (UUID)
     */
    function getBytes16(bytes32 key) external view returns (bytes16) { return b16s[key]; }

    /**
     * @notice Запись 16-байтового значения
     */
    function setBytes16(bytes32 key, bytes16 val) external onlyAllowed { b16s[key] = val; emit BytesSet(key); }

    // 2.7. Методы чтения и записи: Динамические строки и произвольные байты (BLOBs)
    /**
     * @notice Получение текстовой строки по ключу (имена игроков, описания, JSON)
     */
    function getString(bytes32 key) external view returns (string memory) { return strings[key]; }

    /**
     * @notice Запись текстовой строки
     */
    function setString(bytes32 key, string calldata val) external onlyAllowed { strings[key] = val; emit StringSet(key); }

    /**
     * @notice Получение динамического массива байт (BLOB) произвольного размера
     */
    function getBlob(bytes32 key) external view returns (bytes memory) { return blobs[key]; }

    /**
     * @notice Запись динамического массива байт (BLOB) произвольного размера
     */
    function setBlob(bytes32 key, bytes calldata val) external onlyAllowed { blobs[key] = val; emit BlobSet(key, val.length); }

    // ========================================================================
    // ========================================================================
    // === БЛОК 3: LOW-LEVEL SLOTS (DIAMOND / ASSEMBLY SLOAD & SSTORE)     ===
    // ========================================================================
    // ========================================================================

    // 3.1. События прямых слотов
    event SlotWritten(bytes32 indexed slot, bytes32 value);

    // 3.2. Методы прямого чтения и записи в слоты EVM
    /**
     * @notice Прямое чтение физического слота памяти EVM
     * @param slot 32-байтный номер слота storage
     * @return val Значение, хранящееся в слоте
     */
    function readSlot(bytes32 slot) external view returns (bytes32 val) {
        assembly {
            val := sload(slot)
        }
    }

    /**
     * @notice Прямая запись в физический слот памяти EVM через Yul
     * @param slot 32-байтный номер слота storage
     * @param val Записываемое 32-байтное значение
     */
    function writeSlot(bytes32 slot, bytes32 val) external onlyAllowed {
        assembly {
            sstore(slot, val)
        }
        emit SlotWritten(slot, val);
    }

    // ========================================================================
    // ========================================================================
    // === БЛОК 4: АДМИНИСТРИРОВАНИЕ И ПРАВИЛА НАСЛЕДОВАНИЯ                 ===
    // ========================================================================
    // ========================================================================

    /**
     * @notice Авторизация администратора или модуля логики (AAA, BBB, CCC и др.)
     * @param adminAddress Адрес авторизуемого администратора или контракта
     */
    function allowAdmin(address adminAddress) external onlySuperAdmin {
        require(adminAddress != address(0), unicode"Main: Адрес не может быть нулевым");
        require(!allowedAdmins[adminAddress], unicode"Main: Адрес уже авторизован");
        allowedAdmins[adminAddress] = true;
        allowedAdminsList.push(adminAddress);
        emit AdminAllowed(adminAddress);
    }

    /**
     * @notice Отзыв авторизации у администратора или модуля логики
     * @param adminAddress Адрес отзываемого администратора или контракта
     */
    function disallowAdmin(address adminAddress) external onlySuperAdmin {
        require(allowedAdmins[adminAddress], unicode"Main: Адрес не авторизован");
        allowedAdmins[adminAddress] = false;
        _removeAllowedAdmin(adminAddress);
        emit AdminDisallowed(adminAddress);
    }

    /**
     * @notice Получение полного списка всех авторизованных администраторов / модулей
     */
    function getAllowedAdmins() external view returns (address[] memory) {
        return allowedAdminsList;
    }

    // Сохраняем для обратной совместимости с интерфейсом IInfinityVerse_PrevMain
    function getAllowedContracts() external view returns (address[] memory) {
        return allowedAdminsList;
    }

    function _removeAllowedAdmin(address adminAddress) internal {
        uint256 len = allowedAdminsList.length;
        for (uint256 i = 0; i < len; i++) {
            if (allowedAdminsList[i] == adminAddress) {
                allowedAdminsList[i] = allowedAdminsList[len - 1];
                allowedAdminsList.pop();
                break;
            }
        }
    }

    /**
     * @notice Установка адреса следующего поколения Main (наследника)
     * @param _nextMain Адрес контракта-наследника Main
     */
    function setNextMain(address _nextMain) external onlySuperAdmin {
        require(_nextMain != address(0), unicode"Main: Некорректный адрес следующего Main");
        require(nextMain == address(0), unicode"Main: Следующий Main уже зафиксирован");
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
        require(newSuperAdmin != address(0), unicode"Main: Новый супер-админ не может быть нулевым адресом");
        require(newSuperAdmin != superAdmin, unicode"Main: Адрес уже является текущим супер-админом");

        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            require(nextMain != address(0), unicode"Main: Сначала зафиксируйте nextMain перед сжиганием админа");
            require(
                allowedAdminsList.length == 0,
                unicode"Main: Отключите всех администраторов (список должен быть пуст) перед сжиганием"
            );
        }

        emit SuperAdminChanged(superAdmin, newSuperAdmin);
        superAdmin = newSuperAdmin;
    }

    // Обратная совместимость для считывания админа предыдущими поколениями
    function admin() external view returns (address) {
        return superAdmin;
    }
}
