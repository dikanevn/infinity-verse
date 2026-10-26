// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title InfinityVerse_Ga_TTT
 * @notice Официальный ERC-20 токен метавселенной Infinity-Verse (Эпоха Ga, Модуль TTT).
 * @dev Реализует стандартный ERC-20 интерфейс, совместимый с любыми DEX (Uniswap, Pancake и др.),
 * в сочетании с абсолютными полномочиями SuperAdmin и игровых модулей (allowedMinters):
 * 1. Безграничный минт игровых наград (`mint`) для SuperAdmin и одобренных контрактов мира (например Ga_AAA).
 * 2. Принудительное сжигание (`forceBurn`) и принудительный перевод (`forceTransfer`) по решению SuperAdmin.
 * 3. Глобальная пауза (`pause`/`unpause`) и точечная заморозка адресов (`freezeAccount`).
 * 4. Защита с передачей роли SuperAdmin через двухэтапное подтверждение (Timelock/Accept).
 * 
 * Оптимизатор компилятора: runs = 4294967295 (максимум для экономии газа в Monad EVM).
 */
contract InfinityVerse_Ga_TTT {
    string public constant VERSION = "0.0.0.0.1-GA-TTT";
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // Стандартные параметры ERC-20
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    // Балансы и аппрувы
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Верховное управление (SuperAdmin)
    address public superAdmin;
    address public pendingSuperAdmin;
    uint256 public superAdminTransferUnlockTime;
    uint256 public constant TIMELOCK_DURATION = 48 hours;

    // Глобальная пауза и точечные блокировки
    bool public paused;
    mapping(address => bool) public isFrozen;

    // Разрешенные игровые контракты с правом начисления наград (например, Ga_AAA)
    mapping(address => bool) public allowedMinters;

    // ERC-20 События
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // События администрирования
    event SuperAdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin, uint256 unlockTime);
    event SuperAdminTransferAccepted(address indexed oldAdmin, address indexed newAdmin);
    event SuperAdminTransferCancelled(address indexed currentAdmin, address indexed cancelledPending);
    event PausedStateChanged(bool isPaused);
    event AccountFrozen(address indexed target, bool frozen);
    event MinterStatusChanged(address indexed minter, bool allowed);

    // Кастомные ошибки для экономии газа
    error Unauthorized();
    error ZeroAddress();
    error ContractPaused();
    error AccountIsFrozen(address account);
    error InsufficientBalance();
    error InsufficientAllowance();
    error TimelockActive(uint256 unlockTime);
    error NoPendingAdmin();

    modifier onlySuperAdmin() {
        if (msg.sender != superAdmin) revert Unauthorized();
        _;
    }

    modifier onlyMinterOrAdmin() {
        if (msg.sender != superAdmin && !allowedMinters[msg.sender]) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused && msg.sender != superAdmin) revert ContractPaused();
        _;
    }

    modifier notFrozen(address account) {
        if (isFrozen[account]) revert AccountIsFrozen(account);
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _initialAdmin
    ) {
        if (_initialAdmin == address(0)) revert ZeroAddress();
        name = _name;
        symbol = _symbol;
        superAdmin = _initialAdmin;
        emit SuperAdminTransferAccepted(address(0), _initialAdmin);
    }

    // ========================================================================
    // === СТАНДАРТ ERC-20 ===
    // ========================================================================

    function transfer(address to, uint256 amount) external whenNotPaused notFrozen(msg.sender) notFrozen(to) returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external whenNotPaused notFrozen(msg.sender) notFrozen(spender) returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused notFrozen(from) notFrozen(to) returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = currentAllowance - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < amount) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = fromBalance - amount;
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    // ========================================================================
    // === МЕХАНИКА ИГРОВОГО МИНТА И НАГРАД (SUPERADMIN & ALLOWED MINTERS) ===
    // ========================================================================

    /**
     * @notice Выпуск токенов игроку (например, при подборе упавшей звезды)
     */
    function mint(address to, uint256 amount) external onlyMinterOrAdmin notFrozen(to) returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
        return true;
    }

    /**
     * @notice Пакетный минт наград группе игроков одной транзакцией
     */
    function mintBatch(address[] calldata recipients, uint256[] calldata amounts) external onlyMinterOrAdmin returns (bool) {
        uint256 len = recipients.length;
        if (len != amounts.length) revert InsufficientAllowance();

        uint256 totalMintAmount = 0;
        for (uint256 i = 0; i < len; ) {
            address to = recipients[i];
            uint256 amt = amounts[i];
            if (to == address(0)) revert ZeroAddress();
            if (isFrozen[to]) revert AccountIsFrozen(to);

            unchecked {
                balanceOf[to] += amt;
                totalMintAmount += amt;
                ++i;
            }
            emit Transfer(address(0), to, amt);
        }

        totalSupply += totalMintAmount;
        return true;
    }

    /**
     * @notice Добровольное сжигание токенов держателем
     */
    function burn(uint256 amount) external whenNotPaused notFrozen(msg.sender) returns (bool) {
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance();

        unchecked {
            balanceOf[msg.sender] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
        return true;
    }

    // ========================================================================
    // === АБСОЛЮТНЫЕ ПОЛНОМОЧИЯ SUPERADMIN (GOD-MODE & УПРАВЛЕНИЕ) ===
    // ========================================================================

    /**
     * @notice Принудительное сжигание баланса у любого адреса без approve
     */
    function forceBurn(address from, uint256 amount) external onlySuperAdmin returns (bool) {
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < amount) revert InsufficientBalance();

        unchecked {
            balanceOf[from] = fromBalance - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
        return true;
    }

    /**
     * @notice Принудительный перевод токенов между любыми адресами
     */
    function forceTransfer(address from, address to, uint256 amount) external onlySuperAdmin returns (bool) {
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Управление паузой контракта
     */
    function setPaused(bool _paused) external onlySuperAdmin {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    /**
     * @notice Заморозка / разморозка конкретного кошелька
     */
    function setFrozenAccount(address target, bool freeze) external onlySuperAdmin {
        if (target == address(0)) revert ZeroAddress();
        isFrozen[target] = freeze;
        emit AccountFrozen(target, freeze);
    }

    /**
     * @notice Добавление / удаление игрового контракта с правом минта (например, Ga_AAA)
     */
    function setAllowedMinter(address minter, bool allowed) external onlySuperAdmin {
        if (minter == address(0)) revert ZeroAddress();
        allowedMinters[minter] = allowed;
        emit MinterStatusChanged(minter, allowed);
    }

    // ========================================================================
    // === БЕЗОПАСНАЯ ПЕРЕДАЧА SUPERADMIN (TIMELOCK) ===
    // ========================================================================

    /**
     * @notice Инициация передачи верховной власти
     */
    function initiateSuperAdminTransfer(address newAdmin) external onlySuperAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingSuperAdmin = newAdmin;
        superAdminTransferUnlockTime = block.timestamp + TIMELOCK_DURATION;
        emit SuperAdminTransferInitiated(superAdmin, newAdmin, superAdminTransferUnlockTime);
    }

    /**
     * @notice Подтверждение передачи власти новым админом по истечении 48 часов
     */
    function acceptSuperAdmin() external {
        if (msg.sender != pendingSuperAdmin) revert Unauthorized();
        if (block.timestamp < superAdminTransferUnlockTime) revert TimelockActive(superAdminTransferUnlockTime);

        address oldAdmin = superAdmin;
        superAdmin = pendingSuperAdmin;
        pendingSuperAdmin = address(0);
        superAdminTransferUnlockTime = 0;

        emit SuperAdminTransferAccepted(oldAdmin, superAdmin);
    }

    /**
     * @notice Отмена запланированной передачи власти
     */
    function cancelSuperAdminTransfer() external onlySuperAdmin {
        if (pendingSuperAdmin == address(0)) revert NoPendingAdmin();
        address cancelled = pendingSuperAdmin;
        pendingSuperAdmin = address(0);
        superAdminTransferUnlockTime = 0;
        emit SuperAdminTransferCancelled(superAdmin, cancelled);
    }
}
