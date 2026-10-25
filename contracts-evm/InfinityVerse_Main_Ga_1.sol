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
 * Предоставляет 3 универсальных уровня абстракции хранения:
 * 1. Raw Disk: прямое блочное чтение/запись 32-байтных секторов (основной скоростной режим).
 * 2. Eternal Storage: типизированное хранилище (uint256, address, bytes-blobs).
 * 3. Low-Level Slots: прямой доступ к слотам памяти EVM через ассемблер (Diamond-style Yul).
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
    // ИЕРАРХИЯ ПОКОЛЕНИЙ И АДМИНИСТРИРОВАНИЕ
    // ========================================================================
    uint256 public immutable generation;
    uint64 public immutable deployedAt;
    address public immutable prevMain;

    address public nextMain;
    address public admin;

    // Для обратной совместимости с логическими модулями ранних версий
    address public contractAAA;

    // Реестр авторизованных исполнителей логики (AAA, BBB, CCC...)
    mapping(address => bool) public allowedContracts;
    address[] public allowedContractsList;

    // ========================================================================
    // 1. RAW DISK (Основной режим: 32-байтные секторы bytes32 => bytes32)
    // ========================================================================
    mapping(bytes32 => bytes32) private disk;

    // ========================================================================
    // 2. ETERNAL STORAGE (Резерв: типизированные данные и динамические BLOB'ы)
    // ========================================================================
    mapping(bytes32 => uint256) private uints;
    mapping(bytes32 => address) private addrs;
    mapping(bytes32 => bytes) private blobs;

    // ========================================================================
    // СОБЫТИЯ
    // ========================================================================
    event SectorWritten(bytes32 indexed sector, bytes32 data);
    event UintSet(bytes32 indexed key, uint256 value);
    event AddressSet(bytes32 indexed key, address value);
    event BlobSet(bytes32 indexed key, uint256 length);
    event SlotWritten(bytes32 indexed slot, bytes32 value);

    event ContractAAASet(address indexed newContractAAA);
    event ContractAllowed(address indexed contractAddress);
    event ContractDisallowed(address indexed contractAddress);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event NextMainSet(address indexed nextMainAddress);

    // ========================================================================
    // МОДИФИКАТОРЫ
    // ========================================================================
    modifier onlyAdmin() {
        require(msg.sender == admin, unicode"Main: Вызов разрешен только администратору");
        _;
    }

    modifier onlyAllowed() {
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
            require(
                IInfinityVerse_PrevMain(_prevMain).admin() == 0x000000000000000000000000000000000000dEaD,
                unicode"Main: Админ предыдущего поколения еще не сожжен (не dead)"
            );

            // 2. Все контракты логики старого контракта должны быть отключены
            try IInfinityVerse_PrevMain(_prevMain).getAllowedContracts() returns (address[] memory prevList) {
                require(
                    prevList.length == 0,
                    unicode"Main: Список логических контрактов предыдущего поколения не пуст"
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

        admin = msg.sender;
        generation = _generation;
        prevMain = _prevMain;
        deployedAt = uint64(block.timestamp);

        // Предоставляем администратору прямые права в allowedContracts с рождения хранилища
        allowedContracts[admin] = true;
        allowedContractsList.push(admin);
        emit ContractAllowed(admin);
    }

    // ========================================================================
    // МЕТОД 1: RAW DISK (СЫРЫЕ 32-БАЙТНЫЕ СЕКТОРЫ) - ОСНОВНОЙ РЕЖИМ
    // ========================================================================

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
    // МЕТОД 2: ETERNAL STORAGE (УНИВЕРСАЛЬНЫЕ ТИПЫ И ДИНАМИЧЕСКИЕ БЛОБЫ)
    // ========================================================================

    function getUint(bytes32 key) external view returns (uint256) {
        return uints[key];
    }

    function setUint(bytes32 key, uint256 val) external onlyAllowed {
        uints[key] = val;
        emit UintSet(key, val);
    }

    function getAddress(bytes32 key) external view returns (address) {
        return addrs[key];
    }

    function setAddress(bytes32 key, address val) external onlyAllowed {
        addrs[key] = val;
        emit AddressSet(key, val);
    }

    function getBlob(bytes32 key) external view returns (bytes memory) {
        return blobs[key];
    }

    function setBlob(bytes32 key, bytes calldata val) external onlyAllowed {
        blobs[key] = val;
        emit BlobSet(key, val.length);
    }

    // ========================================================================
    // МЕТОД 3: LOW-LEVEL SLOTS (DIAMOND / ASSEMBLY SLOAD & SSTORE)
    // ========================================================================

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
    // АДМИНИСТРИРОВАНИЕ И ПРАВИЛА НАСЛЕДОВАНИЯ
    // ========================================================================

    /**
     * @notice Установка адреса контракта логики AAA (или авто-регистрация вызовом из самого AAA)
     * @param _contractAAA Адрес нового развернутого контракта логики AAA
     */
    function setContractAAA(address _contractAAA) external {
        require(
            msg.sender == admin || (tx.origin == admin && msg.sender == _contractAAA),
            unicode"Main: Вызов разрешен только администратору"
        );

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
     * @dev При финализации миграции передается на 0x...dEaD.
     * Защита запрещает сжечь админа, если логика не отключена или nextMain не задан!
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
}
