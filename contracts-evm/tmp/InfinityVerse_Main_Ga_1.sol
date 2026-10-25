pragma solidity 0.8.20;
interface IInfinityVerse_PrevMain {
    function admin() external view returns (address);
    function nextMain() external view returns (address);
    function getAllowedContracts() external view returns (address[] memory);
}
contract InfinityVerse_Main_Ga_1 {
    string public constant VERSION = "0.0.0.0.1-MAIN-Ga-1";
    string public constant EPOCH = "Ga";
    uint256 public constant GENERATION = 1;
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";
    address public immutable prevMain;
    address public nextMain;
    address public superAdmin;
    uint256 public constant RESERVED_SLOTS = 1 << 180;
    uint256 private constant ADMIN_SLOT_PREFIX = 1 << 160;
    uint8 public constant PERM_NONE          = 0;
    uint8 public constant PERM_ADMIN_STORAGE = 1 << 0;
    uint8 public constant PERM_ADMIN_SLOTS   = 1 << 1;
    uint8 public constant PERM_MOD           = 1 << 2;
    uint8 public constant PERM_A             = 1 << 3;
    uint8 public constant PERM_B             = 1 << 4;
    uint8 public constant PERM_C             = 1 << 5;
    uint8 public constant PERM_D             = 1 << 6;
    uint8 public constant PERM_EXT           = 1 << 7;
    uint8 public constant PERM_ALL           = 255;
    struct AdminInfo {
        bool isActive;
        uint8 permissions;
        uint8 role;
        uint48 validFrom;
        uint64 validUntil;
        uint64 listIndex;
        uint8 paramA;
        uint8 paramB;
        uint16 paramC;
        uint32 paramD;
    }
    address[] public allowedAdminsList;
    event AdminAllowed(address indexed adminAddress, uint8 perms, uint8 role);
    event AdminDisallowed(address indexed adminAddress);
    event SuperAdminChanged(address indexed oldSuperAdmin, address indexed newSuperAdmin);
    event NextMainSet(address indexed nextMainAddress);
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "error");
        _;
    }
    function _readAdminSlot(address _account) internal view returns (uint256 packed) {
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(_account);
        assembly {
            packed := sload(slot)
        }
    }
    function _checkAdmin(address _caller, uint8 requiredPerm) internal view {
        if (_caller == superAdmin) return;
        uint256 packed = _readAdminSlot(_caller);
        require((uint8(packed) & requiredPerm) == requiredPerm, "error");
        require(block.timestamp >= uint48(packed >> 16), "error");
        uint64 until = uint64(packed >> 64);
        require(until == 0 || block.timestamp <= until, "error");
    }
    modifier onlyAdmins() {
        _checkAdmin(msg.sender, PERM_ADMIN_STORAGE);
        _;
    }
    modifier onlySlotAdmins() {
        _checkAdmin(msg.sender, PERM_ADMIN_SLOTS);
        _;
    }
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
    function isAdmin(address _account) public view returns (bool) {
        return getAdminInfo(_account).isActive;
    }
    function _isAdmin(address _account) internal view returns (bool) {
        return isAdmin(_account);
    }
    constructor(address _prevMain) {
        if (_prevMain != address(0) && _prevMain != 0x000000000000000000000000000000000000dEaD) {
            address prevAdmin = IInfinityVerse_PrevMain(_prevMain).admin();
            require(
                prevAdmin == 0x000000000000000000000000000000000000dEaD, "error");
            require(
                IInfinityVerse_PrevMain(_prevMain).getAllowedContracts().length == 0, "error");
            require(
                IInfinityVerse_PrevMain(_prevMain).nextMain() == address(this), "error");
        }
        superAdmin = msg.sender;
        prevMain = _prevMain;
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(superAdmin);
        allowedAdminsList.push(superAdmin);
        uint256 packed = uint256(PERM_ALL) | (uint256(255) << 8) | (uint256(1) << 128);
        assembly {
            sstore(slot, packed)
        }
        emit AdminAllowed(superAdmin, PERM_ALL, 255);
    }
    mapping(bytes32 => bytes32) private disk;
    function readSector(bytes32 sector) external view returns (bytes32) {
        return disk[sector];
    }
    function readSectorBatch(bytes32[] calldata sectors) external view returns (bytes32[] memory) {
        uint256 len = sectors.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = disk[sectors[i]];
        }
        return result;
    }
    function writeSector(bytes32 sector, bytes32 data) external onlyAdmins {
        disk[sector] = data;
    }
    function writeSectorBatch(bytes32[] calldata sectors, bytes32[] calldata data) external onlyAdmins {
        require(sectors.length == data.length, "error");
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; i++) {
            disk[sectors[i]] = data[i];
        }
    }
    function readSectorSlice(bytes32 sector, uint256 offset, uint256 length) external view returns (bytes memory slice) {
        require(offset + length <= 32, "error");
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
    function writeSequential(bytes32 baseSector, bytes32[] calldata data) external onlyAdmins {
        uint256 len = data.length;
        uint256 base = uint256(baseSector);
        for (uint256 i = 0; i < len; i++) {
            disk[bytes32(base + i)] = data[i];
        }
    }
    function trimSector(bytes32 sector) external onlyAdmins {
        delete disk[sector];
    }
    function trimSectorBatch(bytes32[] calldata sectors) external onlyAdmins {
        uint256 len = sectors.length;
        for (uint256 i = 0; i < len; i++) {
            delete disk[sectors[i]];
        }
    }
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
    function getBool(bytes32 key) external view returns (bool) { return bools[key]; }
    function setBool(bytes32 key, bool val) external onlyAdmins { bools[key] = val; }
    function trimBool(bytes32 key) external onlyAdmins { delete bools[key]; }
    function getAddress(bytes32 key) external view returns (address) { return addrs[key]; }
    function setAddress(bytes32 key, address val) external onlyAdmins { addrs[key] = val; }
    function trimAddress(bytes32 key) external onlyAdmins { delete addrs[key]; }
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
    function getString(bytes32 key) external view returns (string memory) { return strings[key]; }
    function setString(bytes32 key, string calldata val) external onlyAdmins { strings[key] = val; }
    function trimString(bytes32 key) external onlyAdmins { delete strings[key]; }
    function getBlob(bytes32 key) external view returns (bytes memory) { return blobs[key]; }
    function setBlob(bytes32 key, bytes calldata val) external onlyAdmins { blobs[key] = val; }
    function trimBlob(bytes32 key) external onlyAdmins { delete blobs[key]; }
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
    function readSlot(bytes32 slot) external view returns (bytes32 val) {
        return _getSlot(slot);
    }
    function writeSlot(bytes32 slot, bytes32 val) external onlySlotAdmins {
        require(uint256(slot) >= RESERVED_SLOTS, "error");
        _setSlot(slot, val);
    }
    function readSlotBatch(bytes32[] calldata slots) external view returns (bytes32[] memory) {
        uint256 len = slots.length;
        bytes32[] memory result = new bytes32[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = _getSlot(slots[i]);
        }
        return result;
    }
    function writeSlotBatch(bytes32[] calldata slots, bytes32[] calldata vals) external onlySlotAdmins {
        require(slots.length == vals.length, "error");
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            require(uint256(slot) >= RESERVED_SLOTS, "error");
            _setSlot(slot, vals[i]);
        }
    }
    function readSlotSlice(bytes32 slot, uint256 offset, uint256 length) external view returns (bytes memory slice) {
        require(offset + length <= 32, "error");
        bytes32 val = _getSlot(slot);
        slice = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            slice[i] = val[offset + i];
        }
    }
    function readSlotSequential(bytes32 baseSlot, uint256 count) external view returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](count);
        uint256 base = uint256(baseSlot);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _getSlot(bytes32(base + i));
        }
        return result;
    }
    function writeSlotSequential(bytes32 baseSlot, bytes32[] calldata vals) external onlySlotAdmins {
        require(uint256(baseSlot) >= RESERVED_SLOTS, "error");
        uint256 len = vals.length;
        uint256 base = uint256(baseSlot);
        for (uint256 i = 0; i < len; i++) {
            _setSlot(bytes32(base + i), vals[i]);
        }
    }
    function trimSlot(bytes32 slot) external onlySlotAdmins {
        require(uint256(slot) >= RESERVED_SLOTS, "error");
        _setSlot(slot, 0);
    }
    function trimSlotBatch(bytes32[] calldata slots) external onlySlotAdmins {
        uint256 len = slots.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 slot = slots[i];
            require(uint256(slot) >= RESERVED_SLOTS, "error");
            _setSlot(slot, 0);
        }
    }
    function getNamespaceSlot(string calldata namespaceId) external pure returns (bytes32 rootSlot) {
        return keccak256(abi.encode(uint256(keccak256(bytes(namespaceId))) - 1)) & ~bytes32(uint256(0xff));
    }
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
        require(adminAddress != address(0), "error");
        require(perms != 0, "error");
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 idxPlusOne;
        assembly {
            idxPlusOne := shr(128, sload(slot))
        }
        if (idxPlusOne == 0) {
            allowedAdminsList.push(adminAddress);
            idxPlusOne = allowedAdminsList.length;
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
    function disallowAdmin(address adminAddress) external onlySuperAdmin {
        require(adminAddress != superAdmin, "error");
        uint256 slot = ADMIN_SLOT_PREFIX | uint160(adminAddress);
        uint256 packed;
        assembly {
            packed := sload(slot)
        }
        uint64 idxPlusOne = uint64(packed >> 128);
        require(idxPlusOne != 0, "error");
        uint256 index = idxPlusOne - 1;
        uint256 lastIndex = allowedAdminsList.length - 1;
        if (index != lastIndex) {
            address lastAdmin = allowedAdminsList[lastIndex];
            allowedAdminsList[index] = lastAdmin;
            uint256 lastSlot = ADMIN_SLOT_PREFIX | uint160(lastAdmin);
            uint256 lastPacked;
            assembly {
                lastPacked := sload(lastSlot)
            }
            lastPacked = (lastPacked & ~(uint256(0xFFFFFFFFFFFFFFFF) << 128)) | (uint256(idxPlusOne) << 128);
            assembly {
                sstore(lastSlot, lastPacked)
            }
        }
        allowedAdminsList.pop();
        assembly {
            sstore(slot, 0)
        }
        emit AdminDisallowed(adminAddress);
    }
    function getAllowedAdmins() external view returns (address[] memory) {
        return allowedAdminsList;
    }
    function getAllowedContracts() external view returns (address[] memory) {
        return allowedAdminsList;
    }
    function setNextMain(address _nextMain) external onlySuperAdmin {
        require(_nextMain != address(0), "error");
        nextMain = _nextMain;
        emit NextMainSet(_nextMain);
    }
    function changeSuperAdmin(address newSuperAdmin) external onlySuperAdmin {
        require(newSuperAdmin != address(0), "error");
        require(newSuperAdmin != superAdmin, "error");
        if (_isAdmin(superAdmin)) {
            uint256 prevPacked = _readAdminSlot(superAdmin);
            uint64 prevIdxPlusOne = uint64(prevPacked >> 128);
            if (prevIdxPlusOne != 0) {
                uint256 prevIdx = prevIdxPlusOne - 1;
                uint256 lastIdx = allowedAdminsList.length - 1;
                if (prevIdx != lastIdx) {
                    address lastAdmin = allowedAdminsList[lastIdx];
                    allowedAdminsList[prevIdx] = lastAdmin;
                    uint256 lastPacked = _readAdminSlot(lastAdmin);
                    lastPacked = (lastPacked & ~(uint256(0xFFFFFFFFFFFFFFFF) << 128)) | (uint256(prevIdxPlusOne) << 128);
                    _setSlot(bytes32(ADMIN_SLOT_PREFIX | uint160(lastAdmin)), bytes32(lastPacked));
                }
                allowedAdminsList.pop();
            }
            _setSlot(bytes32(ADMIN_SLOT_PREFIX | uint160(superAdmin)), 0);
            emit AdminDisallowed(superAdmin);
        }
        if (newSuperAdmin == 0x000000000000000000000000000000000000dEaD) {
            require(nextMain != address(0), "error");
            require(
                allowedAdminsList.length == 0, "error");
        } else {
            if (!_isAdmin(newSuperAdmin)) {
                uint256 newSlot = ADMIN_SLOT_PREFIX | uint160(newSuperAdmin);
                allowedAdminsList.push(newSuperAdmin);
                uint64 idxPlusOne = uint64(allowedAdminsList.length);
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
    function admin() external view returns (address) {
        return superAdmin;
    }
}