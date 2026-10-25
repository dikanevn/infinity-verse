// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInfinityVerse_PrevMain {
    function admin() external view returns (address);
    function nextMain() external view returns (address);
    function getAllowedContracts() external view returns (address[] memory);
}

/**
 * @title InfinityVerse_Main_Ga_1
 * @notice Р’РµС‡РЅС‹Р№ СѓРЅРёРІРµСЂСЃР°Р»СЊРЅС‹Р№ РѕРЅС‡РµР№РЅ-РЅР°РєРѕРїРёС‚РµР»СЊ РґР°РЅРЅС‹С… (Universal Onchain Storage) - Р­РїРѕС…Р° Ga, РџРѕРєРѕР»РµРЅРёРµ 1.
 * РџРѕР»РЅРѕСЃС‚СЊСЋ Р»РёС€РµРЅ Р¶РµСЃС‚РєРёС… РёРіСЂРѕРІС‹С… СЃС‚СЂСѓРєС‚СѓСЂ (РєРѕРѕСЂРґРёРЅР°С‚, РєР»РµС‚РѕРє, РёРіСЂРѕРєРѕРІ).
 * РђСЂС…РёС‚РµРєС‚СѓСЂР° СЃС‚СЂРѕРіРѕ СЂР°Р·РґРµР»РµРЅР° РЅР° 3 РЅРµР·Р°РІРёСЃРёРјС‹С… Р±Р»РѕРєР° С…СЂР°РЅРµРЅРёСЏ + Р±Р»РѕРє СѓРїСЂР°РІР»РµРЅРёСЏ:
 * 1. Р‘Р›РћРљ 1: RAW DISK (РЎС‹СЂС‹Рµ 32-Р±Р°Р№С‚РЅС‹Рµ СЃРµРєС‚РѕСЂС‹ bytes32 => bytes32).
 * 2. Р‘Р›РћРљ 2: ETERNAL STORAGE (РЈРЅРёРІРµСЂСЃР°Р»СЊРЅРѕРµ С‚РёРїРёР·РёСЂРѕРІР°РЅРЅРѕРµ С…СЂР°РЅРёР»РёС‰Рµ Рё BLOB'С‹).
 * 3. Р‘Р›РћРљ 3: LOW-LEVEL SLOTS (РџСЂСЏРјРѕР№ РґРѕСЃС‚СѓРї Рє СЃР»РѕС‚Р°Рј РїР°РјСЏС‚Рё EVM С‡РµСЂРµР· Р°СЃСЃРµРјР±Р»РµСЂ Yul).
 * 4. Р‘Р›РћРљ 4: РђР”РњРРќРРЎРўР РР РћР’РђРќРР• Р РќРђРЎР›Р•Р”РћР’РђРќРР• (РЎРёСЃС‚РµРјР° SuperAdmin/allowAdmin Рё Р—РѕР»РѕС‚РѕР№ РљР°РЅРѕРЅ).
 *
 * РџРѕР»РЅС‹Р№ СЂРµРіР»Р°РјРµРЅС‚ СЌРІРѕР»СЋС†РёРё Рё РїСЂР°РІРёР»Р° РЅР°СЃР»РµРґРѕРІР°РЅРёСЏ РѕРїРёСЃР°РЅС‹ РІ:
 * contracts-evm/РїСЂР°РІРёР»Р° РЅР°СЃР»РµРґРѕРІР°РЅРёСЏ.md
 */
contract InfinityVerse_Main_Ga_1 {
    string public constant VERSION = "0.0.0.0.1-MAIN-Ga-1";
    string public constant EPOCH = "Ga";
    uint256 public constant GENERATION = 1;
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // ========================================================================
    // РР•Р РђР РҐРРЇ РџРћРљРћР›Р•РќРР™ Р РЎРРЎРўР•РњРђ Р”РћРЎРўРЈРџРђ
    // ========================================================================
    address public immutable prevMain;
    address public nextMain;
    address public superAdmin;

    // Р РµРµСЃС‚СЂ Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹С… Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ / РјРѕРґСѓР»РµР№ Р»РѕРіРёРєРё (AAA, BBB, CCC, СЃСѓР±-Р°РґРјРёРЅС‹)
    mapping(address => bool) public allowedAdmins;
    address[] public allowedAdminsList;

    event AdminAllowed(address indexed adminAddress);
    event AdminDisallowed(address indexed adminAddress);
    event SuperAdminChanged(address indexed oldSuperAdmin, address indexed newSuperAdmin);
    event NextMainSet(address indexed nextMainAddress);

    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "Main: caller is not superAdmin");
        _;
    }

    modifier onlyAdmins() {
        require(
            allowedAdmins[msg.sender] || msg.sender == superAdmin,
            "Main: caller is not an allowed admin or superAdmin"
        );
        _;
    }

    constructor(address _prevMain) {
        if (_prevMain != address(0) && _prevMain != 0x000000000000000000000000000000000000dEaD) {
            // РџСЂРѕРІРµСЂРєР° Р·Р°РїРµС‡Р°С‚С‹РІР°РЅРёСЏ РїСЂРµРґС‹РґСѓС‰РµРіРѕ РїРѕРєРѕР»РµРЅРёСЏ:
            // 1. Р“Р»Р°РІРЅС‹Р№ Р°РґРјРёРЅ СЃС‚Р°СЂРѕРіРѕ РєРѕРЅС‚СЂР°РєС‚Р° РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ СЃРѕР¶Р¶РµРЅ РЅР° Dead-Р°РґСЂРµСЃ
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).admin();
            require(
                prevAdmin == 0x000000000000000000000000000000000000dEaD,
                "Main: previous admin is not burned (not dead)"
            );

            // 2. Р’СЃРµ РјРѕРґСѓР»Рё Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂС‹ СЃС‚Р°СЂРѕРіРѕ РєРѕРЅС‚СЂР°РєС‚Р° РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ РѕС‚РєР»СЋС‡РµРЅС‹
            require(
                IInfinityVerse_PrevMain(_prevMain).getAllowedContracts().length == 0,
                "Main: previous generation allowed admins list is not empty"
            );

            // 3. РЎС‚Р°СЂС‹Р№ РєРѕРЅС‚СЂР°РєС‚ РѕР±СЏР·Р°РЅ СЏРІРЅРѕ СѓРєР°Р·Р°С‚СЊ СЌС‚РѕС‚ РЅРѕРІС‹Р№ РєРѕРЅС‚СЂР°РєС‚ СЃРІРѕРёРј РЅР°СЃР»РµРґРЅРёРєРѕРј
            require(
                IInfinityVerse_PrevMain(_prevMain).nextMain() == address(this),
                "Main: this contract is not registered as nextMain in previous generation"
            );
        }

        superAdmin = msg.sender;
        prevMain = _prevMain;

        // РџСЂРµРґРѕСЃС‚Р°РІР»СЏРµРј СЃСѓРїРµСЂ-Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂСѓ РїСЂСЏРјС‹Рµ РїСЂР°РІР° РІ allowedAdmins СЃ СЂРѕР¶РґРµРЅРёСЏ С…СЂР°РЅРёР»РёС‰Р°
        allowedAdmins[superAdmin] = true;
        allowedAdminsList.push(superAdmin);
        emit AdminAllowed(superAdmin);
    }

    // ========================================================================
    // ========================================================================
    // === Р‘Р›РћРљ 1: RAW DISK (РЎР«Р Р«Р• 32-Р‘РђР™РўРќР«Р• РЎР•РљРўРћР Р«) - РћРЎРќРћР’РќРћР™ Р Р•Р–РРњ   ===
    // ========================================================================
    // ========================================================================

    // 1.1. РҐСЂР°РЅРёР»РёС‰Рµ СЃРµРєС‚РѕСЂРѕРІ (РЎРµРєС‚РѕСЂ => 32 Р±Р°Р№С‚Р° РґР°РЅРЅС‹С…)
    mapping(bytes32 => bytes32) private disk;

    // 1.2. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё РґРёСЃРєР°
    /**
     * @notice Р§С‚РµРЅРёРµ РѕРґРЅРѕРіРѕ 32-Р±Р°Р№С‚РЅРѕРіРѕ СЃРµРєС‚РѕСЂР° РїРѕ РєР»СЋС‡Сѓ
     * @param sector 32-Р±Р°Р№С‚РЅС‹Р№ С…РµС€-Р°РґСЂРµСЃ СЃРµРєС‚РѕСЂР°
     * @return 32 Р±Р°Р№С‚Р° РґР°РЅРЅС‹С… СЃРµРєС‚РѕСЂР°
     */
    function readSector(bytes32 sector) external view returns (bytes32) {
        return disk[sector];
    }

    /**
     * @notice РџР°РєРµС‚РЅРѕРµ С‡С‚РµРЅРёРµ РјР°СЃСЃРёРІР° СЃРµРєС‚РѕСЂРѕРІ Р·Р° РѕРґРёРЅ РІС‹Р·РѕРІ (РґР»СЏ РєР»РёРµРЅС‚РѕРІ Рё РјРѕРґСѓР»РµР№)
     * @param sectors РњР°СЃСЃРёРІ 32-Р±Р°Р№С‚РЅС‹С… Р°РґСЂРµСЃРѕРІ СЃРµРєС‚РѕСЂРѕРІ
     * @return РњР°СЃСЃРёРІ 32-Р±Р°Р№С‚РЅС‹С… Р·РЅР°С‡РµРЅРёР№ РґР°РЅРЅС‹С…
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
     * @notice Р—Р°РїРёСЃСЊ РѕРґРЅРѕРіРѕ 32-Р±Р°Р№С‚РЅРѕРіРѕ СЃРµРєС‚РѕСЂР°
     * @param sector 32-Р±Р°Р№С‚РЅС‹Р№ Р°РґСЂРµСЃ СЃРµРєС‚РѕСЂР°
     * @param data 32 Р±Р°Р№С‚Р° Р·Р°РїРёСЃС‹РІР°РµРјС‹С… РґР°РЅРЅС‹С…
     */
    function writeSector(bytes32 sector, bytes32 data) external onlyAdmins {
        disk[sector] = data;
    }

    /**
     * @notice РџР°РєРµС‚РЅР°СЏ Р·Р°РїРёСЃСЊ РјР°СЃСЃРёРІР° СЃРµРєС‚РѕСЂРѕРІ (РґР»СЏ СЂР°Р·РІРµРґРєРё РїР°С‡РµРє РєР»РµС‚РѕРє Рё РѕР±РЅРѕРІР»РµРЅРёСЏ СЃРѕСЃС‚РѕСЏРЅРёСЏ)
     * @param sectors РњР°СЃСЃРёРІ Р°РґСЂРµСЃРѕРІ СЃРµРєС‚РѕСЂРѕРІ
     * @param data РњР°СЃСЃРёРІ 32-Р±Р°Р№С‚РЅС‹С… Р·РЅР°С‡РµРЅРёР№
     */
    function writeSectorBatch(bytes32[] calldata sectors, bytes32[] calldata data) external onlyAdmins {
        require(sectors.length == data.length, "Main: sectors and data length mismatch");
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; i++) {
            disk[sectors[i]] = data[i];
        }
    }
    /**
     * @notice Последовательное непрерывное чтение дорожки секторов (Chunk Read)
     * @param baseSector Начальный сектор
     * @param count Количество непрерывных секторов для чтения подряд
     * @return result Массив считанных 32-байтных секторов
     */
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
    // === Р‘Р›РћРљ 2: ETERNAL STORAGE (РЈРќРР’Р•Р РЎРђР›Р¬РќР«Р• РўРРџР« Р BLOB'Р«)           ===
    // ========================================================================
    // ========================================================================

    // 2.1. РњР°РїРїРёРЅРіРё С‚РёРїРѕРІ РґР°РЅРЅС‹С…
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

    
    // 2.3. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё: Р‘РµР·Р·РЅР°РєРѕРІС‹Рµ С†РµР»С‹Рµ (uint8 ... uint256)
    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 8-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     * @param key 32-Р±Р°Р№С‚РЅС‹Р№ С…РµС€-РєР»СЋС‡ РїРµСЂРµРјРµРЅРЅРѕР№
     * @return Р—РЅР°С‡РµРЅРёРµ uint8 (0..255)
     */
    function getUint8(bytes32 key) external view returns (uint8) { return u8s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 8-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     * @param key 32-Р±Р°Р№С‚РЅС‹Р№ С…РµС€-РєР»СЋС‡
     * @param val Р—РЅР°С‡РµРЅРёРµ uint8
     */
    function setUint8(bytes32 key, uint8 val) external onlyAdmins { u8s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 16-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getUint16(bytes32 key) external view returns (uint16) { return u16s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 16-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setUint16(bytes32 key, uint16 val) external onlyAdmins { u16s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 32-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getUint32(bytes32 key) external view returns (uint32) { return u32s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 32-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setUint32(bytes32 key, uint32 val) external onlyAdmins { u32s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 64-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ (С‚Р°Р№РјСЃС‚Р°РјРїС‹, Р±Р»РѕРєРё)
     */
    function getUint64(bytes32 key) external view returns (uint64) { return u64s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 64-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setUint64(bytes32 key, uint64 val) external onlyAdmins { u64s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 128-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getUint128(bytes32 key) external view returns (uint128) { return u128s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 128-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setUint128(bytes32 key, uint128 val) external onlyAdmins { u128s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ СЃС‚Р°РЅРґР°СЂС‚РЅРѕРіРѕ 256-Р±РёС‚РЅРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ (Р±Р°Р»Р°РЅСЃС‹, СЃС‡РµС‚С‡РёРєРё)
     */
    function getUint256(bytes32 key) external view returns (uint256) { return u256s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 256-Р±РёС‚РЅРѕРіРѕ Р±РµР·Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setUint256(bytes32 key, uint256 val) external onlyAdmins { u256s[key] = val; }

    // 2.4. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё: Р—РЅР°РєРѕРІС‹Рµ С†РµР»С‹Рµ (int8 ... int256)
    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 8-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getInt8(bytes32 key) external view returns (int8) { return i8s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 8-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt8(bytes32 key, int8 val) external onlyAdmins { i8s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 16-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getInt16(bytes32 key) external view returns (int16) { return i16s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 16-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt16(bytes32 key, int16 val) external onlyAdmins { i16s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 32-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ (РєРѕРѕСЂРґРёРЅР°С‚С‹ X, Y)
     */
    function getInt32(bytes32 key) external view returns (int32) { return i32s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 32-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt32(bytes32 key, int32 val) external onlyAdmins { i32s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 64-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getInt64(bytes32 key) external view returns (int64) { return i64s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 64-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt64(bytes32 key, int64 val) external onlyAdmins { i64s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 128-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getInt128(bytes32 key) external view returns (int128) { return i128s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 128-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt128(bytes32 key, int128 val) external onlyAdmins { i128s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 256-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getInt256(bytes32 key) external view returns (int256) { return i256s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 256-Р±РёС‚РЅРѕРіРѕ Р·РЅР°РєРѕРІРѕРіРѕ С‡РёСЃР»Р°
     */
    function setInt256(bytes32 key, int256 val) external onlyAdmins { i256s[key] = val; }

    // 2.5. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё: Р‘СѓР»РµРІС‹ Р·РЅР°С‡РµРЅРёСЏ Рё Р°РґСЂРµСЃР°
    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ Р»РѕРіРёС‡РµСЃРєРѕРіРѕ С„Р»Р°РіР° (bool) РїРѕ РєР»СЋС‡Сѓ
     */
    function getBool(bytes32 key) external view returns (bool) { return bools[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ Р»РѕРіРёС‡РµСЃРєРѕРіРѕ С„Р»Р°РіР° (bool)
     */
    function setBool(bytes32 key, bool val) external onlyAdmins { bools[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ Р°РґСЂРµСЃР° РєРѕС€РµР»СЊРєР° РёР»Рё РєРѕРЅС‚СЂР°РєС‚Р° РїРѕ РєР»СЋС‡Сѓ
     */
    function getAddress(bytes32 key) external view returns (address) { return addrs[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ Р°РґСЂРµСЃР° РєРѕС€РµР»СЊРєР° РёР»Рё РєРѕРЅС‚СЂР°РєС‚Р°
     */
    function setAddress(bytes32 key, address val) external onlyAdmins { addrs[key] = val; }

    // 2.6. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё: Р¤РёРєСЃРёСЂРѕРІР°РЅРЅС‹Рµ Р±Р°Р№С‚С‹
    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 1-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ РїРѕ РєР»СЋС‡Сѓ
     */
    function getBytes1(bytes32 key) external view returns (bytes1) { return b1s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 1-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ
     */
    function setBytes1(bytes32 key, bytes1 val) external onlyAdmins { b1s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 4-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ РїРѕ РєР»СЋС‡Сѓ (С…РµС€ СЃРµР»РµРєС‚РѕСЂР° С„СѓРЅРєС†РёРё)
     */
    function getBytes4(bytes32 key) external view returns (bytes4) { return b4s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 4-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ
     */
    function setBytes4(bytes32 key, bytes4 val) external onlyAdmins { b4s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 8-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ РїРѕ РєР»СЋС‡Сѓ
     */
    function getBytes8(bytes32 key) external view returns (bytes8) { return b8s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 8-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ
     */
    function setBytes8(bytes32 key, bytes8 val) external onlyAdmins { b8s[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ 16-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ РїРѕ РєР»СЋС‡Сѓ (UUID)
     */
    function getBytes16(bytes32 key) external view returns (bytes16) { return b16s[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ 16-Р±Р°Р№С‚РѕРІРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ
     */
    function setBytes16(bytes32 key, bytes16 val) external onlyAdmins { b16s[key] = val; }

    // 2.7. РњРµС‚РѕРґС‹ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё: Р”РёРЅР°РјРёС‡РµСЃРєРёРµ СЃС‚СЂРѕРєРё Рё РїСЂРѕРёР·РІРѕР»СЊРЅС‹Рµ Р±Р°Р№С‚С‹ (BLOBs)
    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ С‚РµРєСЃС‚РѕРІРѕР№ СЃС‚СЂРѕРєРё РїРѕ РєР»СЋС‡Сѓ (РёРјРµРЅР° РёРіСЂРѕРєРѕРІ, РѕРїРёСЃР°РЅРёСЏ, JSON)
     */
    function getString(bytes32 key) external view returns (string memory) { return strings[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ С‚РµРєСЃС‚РѕРІРѕР№ СЃС‚СЂРѕРєРё
     */
    function setString(bytes32 key, string calldata val) external onlyAdmins { strings[key] = val; }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ РґРёРЅР°РјРёС‡РµСЃРєРѕРіРѕ РјР°СЃСЃРёРІР° Р±Р°Р№С‚ (BLOB) РїСЂРѕРёР·РІРѕР»СЊРЅРѕРіРѕ СЂР°Р·РјРµСЂР°
     */
    function getBlob(bytes32 key) external view returns (bytes memory) { return blobs[key]; }

    /**
     * @notice Р—Р°РїРёСЃСЊ РґРёРЅР°РјРёС‡РµСЃРєРѕРіРѕ РјР°СЃСЃРёРІР° Р±Р°Р№С‚ (BLOB) РїСЂРѕРёР·РІРѕР»СЊРЅРѕРіРѕ СЂР°Р·РјРµСЂР°
     */
    function setBlob(bytes32 key, bytes calldata val) external onlyAdmins { blobs[key] = val; }

    // ========================================================================
    // ========================================================================
    // === Р‘Р›РћРљ 3: LOW-LEVEL SLOTS (DIAMOND / ASSEMBLY SLOAD & SSTORE)     ===
    // ========================================================================
    // ========================================================================

    // 3.1. РЎРѕР±С‹С‚РёСЏ РїСЂСЏРјС‹С… СЃР»РѕС‚РѕРІ
    event SlotWritten(bytes32 indexed slot, bytes32 value);

    // 3.2. РњРµС‚РѕРґС‹ РїСЂСЏРјРѕРіРѕ С‡С‚РµРЅРёСЏ Рё Р·Р°РїРёСЃРё РІ СЃР»РѕС‚С‹ EVM
    /**
     * @notice РџСЂСЏРјРѕРµ С‡С‚РµРЅРёРµ С„РёР·РёС‡РµСЃРєРѕРіРѕ СЃР»РѕС‚Р° РїР°РјСЏС‚Рё EVM
     * @param slot 32-Р±Р°Р№С‚РЅС‹Р№ РЅРѕРјРµСЂ СЃР»РѕС‚Р° storage
     * @return val Р—РЅР°С‡РµРЅРёРµ, С…СЂР°РЅСЏС‰РµРµСЃСЏ РІ СЃР»РѕС‚Рµ
     */
    function readSlot(bytes32 slot) external view returns (bytes32 val) {
        assembly {
            val := sload(slot)
        }
    }

    /**
     * @notice РџСЂСЏРјР°СЏ Р·Р°РїРёСЃСЊ РІ С„РёР·РёС‡РµСЃРєРёР№ СЃР»РѕС‚ РїР°РјСЏС‚Рё EVM С‡РµСЂРµР· Yul
     * @param slot 32-Р±Р°Р№С‚РЅС‹Р№ РЅРѕРјРµСЂ СЃР»РѕС‚Р° storage
     * @param val Р—Р°РїРёСЃС‹РІР°РµРјРѕРµ 32-Р±Р°Р№С‚РЅРѕРµ Р·РЅР°С‡РµРЅРёРµ
     */
    function writeSlot(bytes32 slot, bytes32 val) external onlyAdmins {
        assembly {
            sstore(slot, val)
        }
        emit SlotWritten(slot, val);
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
            bytes32 slot = slots[i];
            bytes32 val;
            assembly {
                val := sload(slot)
            }
            result[i] = val;
        }
        return result;
    }

    /**
     * @notice Пакетная запись в произвольные физические слоты EVM через Yul
     * @param slots Массив номеров слотов
     * @param vals Массив 32-байтных значений
     */
    function writeSlotBatch(bytes32[] calldata slots, bytes32[] calldata vals) external onlyAdmins {
        require(slots.length == vals.length, "Main: slots and vals length mismatch");
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            bytes32 val = vals[i];
            assembly {
                sstore(slot, val)
            }
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
            bytes32 slot = bytes32(base + i);
            bytes32 val;
            assembly {
                val := sload(slot)
            }
            result[i] = val;
        }
        return result;
    }

    /**
     * @notice Последовательная потоковая запись в непрерывные физические слоты памяти EVM через Yul
     * @param baseSlot Начальный физический слот
     * @param vals Массив значений для записи подряд
     */
    function writeSlotSequential(bytes32 baseSlot, bytes32[] calldata vals) external onlyAdmins {
        uint256 len = vals.length;
        uint256 base = uint256(baseSlot);
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = bytes32(base + i);
            bytes32 val = vals[i];
            assembly {
                sstore(slot, val)
            }
        }
    }
    /**
     * @notice Официальный хелпер стандарта ERC-7201: вычисление корня изолированного пространства имен
     * @dev Формула: keccak256(uint256(keccak256(namespaceId)) - 1) & ~0xff
     * Полностью отвязывает логические данные мира от сменных физических адресов контрактов (AAA, BBB, CCC)!
     * @param namespaceId Текстовый идентификатор модуля/пространства (например, "infinity.module.movement")
     * @return rootSlot Уникальный базовый слот физической памяти EVM, гарантированно свободный от коллизий
     */
    /**
     * @notice Очистка физического слота EVM (TRIM / sstore zero) с возвратом газа
     * @param slot Физический слот памяти
     */
    function trimSlot(bytes32 slot) external onlyAdmins {
        assembly {
            sstore(slot, 0)
        }
    }

    /**
     * @notice Пакетная очистка массива физических слотов (TRIM Slot Batch) с возвратом газа
     * @param slots Массив физических слотов памяти
     */
    function trimSlotBatch(bytes32[] calldata slots) external onlyAdmins {
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            assembly {
                sstore(slot, 0)
            }
        }
    }

        function getNamespaceSlot(string calldata namespaceId) external pure returns (bytes32 rootSlot) {
        return keccak256(abi.encode(uint256(keccak256(bytes(namespaceId))) - 1)) & ~bytes32(uint256(0xff));
    }



    // ========================================================================
    // ========================================================================
    // === Р‘Р›РћРљ 4: РђР”РњРРќРРЎРўР РР РћР’РђРќРР• Р РџР РђР’РР›Рђ РќРђРЎР›Р•Р”РћР’РђРќРРЇ                 ===
    // ========================================================================
    // ========================================================================

    /**
     * @notice РђРІС‚РѕСЂРёР·Р°С†РёСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР»Рё РјРѕРґСѓР»СЏ Р»РѕРіРёРєРё (AAA, BBB, CCC Рё РґСЂ.)
     * @param adminAddress РђРґСЂРµСЃ Р°РІС‚РѕСЂРёР·СѓРµРјРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР»Рё РєРѕРЅС‚СЂР°РєС‚Р°
     */
    function allowAdmin(address adminAddress) external onlySuperAdmin {
        require(adminAddress != address(0), "Main: admin address cannot be zero");
        require(!allowedAdmins[adminAddress], "Main: admin already authorized");
        allowedAdmins[adminAddress] = true;
        allowedAdminsList.push(adminAddress);
        emit AdminAllowed(adminAddress);
    }

    /**
     * @notice РћС‚Р·С‹РІ Р°РІС‚РѕСЂРёР·Р°С†РёРё Сѓ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР»Рё РјРѕРґСѓР»СЏ Р»РѕРіРёРєРё
     * @param adminAddress РђРґСЂРµСЃ РѕС‚Р·С‹РІР°РµРјРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РёР»Рё РєРѕРЅС‚СЂР°РєС‚Р°
     */
    function disallowAdmin(address adminAddress) external onlySuperAdmin {
        require(allowedAdmins[adminAddress], "Main: admin is not authorized");
        allowedAdmins[adminAddress] = false;
        _removeAllowedAdmin(adminAddress);
        emit AdminDisallowed(adminAddress);
    }

    /**
     * @notice РџРѕР»СѓС‡РµРЅРёРµ РїРѕР»РЅРѕРіРѕ СЃРїРёСЃРєР° РІСЃРµС… Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹С… Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ / РјРѕРґСѓР»РµР№
     */
    function getAllowedAdmins() external view returns (address[] memory) {
        return allowedAdminsList;
    }

    // РЎРѕС…СЂР°РЅСЏРµРј РґР»СЏ РѕР±СЂР°С‚РЅРѕР№ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё СЃ РёРЅС‚РµСЂС„РµР№СЃРѕРј IInfinityVerse_PrevMain
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
     * @notice РЈСЃС‚Р°РЅРѕРІРєР° Р°РґСЂРµСЃР° СЃР»РµРґСѓСЋС‰РµРіРѕ РїРѕРєРѕР»РµРЅРёСЏ Main (РЅР°СЃР»РµРґРЅРёРєР°)
     * @param _nextMain РђРґСЂРµСЃ РєРѕРЅС‚СЂР°РєС‚Р°-РЅР°СЃР»РµРґРЅРёРєР° Main
     */
    function setNextMain(address _nextMain) external onlySuperAdmin {
        require(_nextMain != address(0), "Main: invalid nextMain address");
        require(nextMain == address(0), "Main: nextMain is already locked");
        nextMain = _nextMain;
       
    }

    /**
     * @notice РџРµСЂРµРґР°С‡Р° РїСЂР°РІ РіР»Р°РІРЅРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° (SuperAdmin) РЅР° РЅРѕРІС‹Р№ Р°РґСЂРµСЃ
     * @dev РџСЂРё С„РёРЅР°Р»РёР·Р°С†РёРё РјРёРіСЂР°С†РёРё РїРµСЂРµРґР°РµС‚СЃСЏ РЅР° 0x...dEaD.
     * Р—Р°С‰РёС‚Р° Р·Р°РїСЂРµС‰Р°РµС‚ СЃР¶РµС‡СЊ Р°РґРјРёРЅР°, РµСЃР»Рё СЃРїРёСЃРѕРє Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ РЅРµ РїСѓСЃС‚ РёР»Рё nextMain РЅРµ Р·Р°РґР°РЅ!
     * @param newSuperAdmin РђРґСЂРµСЃ РЅРѕРІРѕРіРѕ РіР»Р°РІРЅРѕРіРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°
     */
    function changeSuperAdmin(address newSuperAdmin) external onlySuperAdmin {
        require(newSuperAdmin != address(0), "Main: new superAdmin cannot be zero");
        require(newSuperAdmin != superAdmin, "Main: address is already superAdmin");

        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            require(nextMain != address(0), "Main: lock nextMain before burning admin");
            require(
                allowedAdminsList.length == 0,
                "Main: revoke all admins before burning superAdmin"
            );
        }

        emit SuperAdminChanged(superAdmin, newSuperAdmin);
        superAdmin = newSuperAdmin;
    }

    // РћР±СЂР°С‚РЅР°СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚СЊ РґР»СЏ СЃС‡РёС‚С‹РІР°РЅРёСЏ Р°РґРјРёРЅР° РїСЂРµРґС‹РґСѓС‰РёРјРё РїРѕРєРѕР»РµРЅРёСЏРјРё
    function admin() external view returns (address) {
        return superAdmin;
    }

    // =========================================================================
    // БЛОК 5: СТАНДАРТ ОБНАРУЖЕНИЯ ИНТЕРФЕЙСОВ (ERC-165)
    // =========================================================================

    /**
     * @notice Проверка поддерживаемых стандартов и интерфейсов (ERC-165)
     * @dev Позволяет внешним контрактам, индексаторам и dApp мгновенно проверять возможности Main:
     *      - 0x01ffc9a7: ERC-165 (supportsInterface)
     *      - 0x93309a63: Raw Disk SSD Interface (чтение/запись секторов и батчей)
     *      - 0x72017201: Метка поддержки ERC-7201 (Namespaced Storage Layout)
     * @param interfaceId 4-байтный идентификатор запрашиваемого интерфейса
     * @return true если интерфейс поддерживается контрактом
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC-165
            || interfaceId == 0x93309a63 // Raw Disk SSD Interface
            || interfaceId == 0x72017201; // ERC-7201 Namespaced Storage marker
    }
}


