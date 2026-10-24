// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInfinityVerse_Main {
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
    }

    function nonces(address player) external view returns (uint256);
    function getPlayer(address player) external view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry);
    function getCell(int32 x, int32 y) external view returns (Cell memory);
    
    function setCell(int32 x, int32 y, Cell calldata cellData) external;
    function spawnPlayer(address player, int32 startX, int32 startY) external;
    function movePlayer(address player, int32 toX, int32 toY) external;
    function setPlayerSession(address player, address sessionKey, uint256 expiry) external;
    function revokePlayerSession(address player) external;
    function incrementNonce(address player) external returns (uint256);
}

/**
 * @title InfinityVerse_AAA
 * @notice Логический контракт версии AAA (первое поколение игровой логики).
 * Выполняет все проверки правил игры, проверку криптографических подписей (EIP-191),
 * сессионные ключи и передает проверенные команды в контракт-хранитель Main.
 */
contract InfinityVerse_AAA {
    string public constant VERSION = "0.0.0.0.8-AAA";

    IInfinityVerse_Main public immutable mainContract;
    address public relayer;

    event RelayerUpdated(address indexed newRelayer);

    constructor(address _mainContract, address _relayer) {
        require(_mainContract != address(0), unicode"AAA: Некорректный адрес Main контракта");
        mainContract = IInfinityVerse_Main(_mainContract);
        relayer = _relayer;
    }

    // ========================================================================
    // === АДМИНИСТРАЦИЯ И СЕТЬ ===
    // ========================================================================

    /**
     * @notice Обновление адреса официального релеера-спонсора газа
     * @dev Разрешено только текущему релееру
     * @param _relayer Новый адрес релеера
     */
    function setRelayer(address _relayer) external {
        // На текущем этапе без владельцев: разрешаем релееру обновлять адрес при необходимости
        require(msg.sender == relayer || relayer == address(0), unicode"AAA: Только релеер может вызвать");
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    // ========================================================================
    // === СЕССИОННЫЕ КЛЮЧИ И КРИПТОГРАФИЯ (EIP-191) ===
    // ========================================================================

    /**
     * @notice Проверка валидности сессионного ключа игрока
     * @param player Адрес игрока
     * @param sessionKey Проверяемый временный сессионный ключ
     * @return true если сессионный ключ совпадает с записанным в Main и срок еще не истек
     */
    function isSessionValid(address player, address sessionKey) public view returns (bool) {
        (, , bool exists, address activeKey, uint256 expiry) = mainContract.getPlayer(player);
        if (!exists && activeKey == address(0)) {
            // Разрешаем проверку сессии для нерожденного игрока (чтобы он мог заспавниться через сессию)
            return (sessionKey != address(0) && activeKey == sessionKey && block.timestamp < expiry);
        }
        return (sessionKey != address(0) && activeKey == sessionKey && block.timestamp < expiry);
    }

    /**
     * @notice Авторизация сессионного ключа по криптографической подписи владельца кошелька (EIP-191)
     * @dev Позволяет релееру отправить транзакцию регистрации сессии без газа от игрока
     * @param player Адрес владельца аккаунта
     * @param sessionKey Временный сессионный ключ (хранится в RAM браузера)
     * @param expiry Срок окончания сессии (unix timestamp)
     * @param sig Подпись EIP-191 личным кошельком игрока
     */
    function authorizeSessionWithSig(
        address player,
        address sessionKey,
        uint256 expiry,
        bytes calldata sig
    ) external {
        require(block.timestamp < expiry, unicode"AAA: Срок действия сессии уже истек");

        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("AuthorizeSession", player, sessionKey, expiry, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        require(signer == player, unicode"AAA: Неверная подпись сессии");

        mainContract.setPlayerSession(player, sessionKey, expiry);
    }

    /**
     * @notice Мгновенный прямой отзыв сессии (вызывается игроком со своего кошелька)
     */
    function revokeSessionDirect() external {
        mainContract.revokePlayerSession(msg.sender);
    }

    /**
     * @notice Газлесс-отзыв сессии через релеер по подписи владельца
     * @param player Адрес игрока
     * @param sig Подпись EIP-191 на команду RevokeSession
     */
    function revokeSessionWithSig(address player, bytes calldata sig) external {
        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("RevokeSession", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        require(signer == player, unicode"AAA: Неверная подпись отзыва сессии");

        mainContract.revokePlayerSession(player);
    }

    // ========================================================================
    // === ИГРОВЫЕ ДЕЙСТВИЯ: СПАВН И ХОДЫ ===
    // ========================================================================

    /**
     * @notice Прямой спавн со своего адреса (требует личную транзакцию игрока)
     * @return (x, y) Начальные координаты появления (1, 0)
     */
    function spawnDirect() external returns (int32, int32) {
        mainContract.spawnPlayer(msg.sender, 1, 0);
        return (1, 0);
    }

    /**
     * @notice Газлесс-спавн через релеер ТОЛЬКО при наличии подтвержденной сессии игрока
     * @param player Адрес кошелька игрока
     * @return (x, y) Начальные координаты появления (1, 0)
     */
    function spawn(address player) external returns (int32, int32) {
        (, , , address activeSessionKey, ) = mainContract.getPlayer(player);
        require(msg.sender == player || isSessionValid(player, activeSessionKey), unicode"AAA: Для спавна требуется действующая сессия");
        mainContract.spawnPlayer(player, 1, 0);
        return (1, 0);
    }

    /**
     * @notice Ход с криптографической подписью сессионного ключа (Gasless через релеер)
     * @param player Адрес кошелька игрока
     * @param targetX Целевая координата X
     * @param targetY Целевая координата Y
     * @param moveSig Подпись команды хода сессионным ключом из RAM
     */
    function moveWithSession(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata moveSig
    ) external {
        (, , bool exists, address sessionKey, ) = mainContract.getPlayer(player);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        require(isSessionValid(player, sessionKey), unicode"AAA: Сессия истекла или недействительна");

        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 moveHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Move", player, targetX, targetY, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(moveHash, moveSig);
        require(signer == sessionKey, unicode"AAA: Несовпадение сессионного ключа в подписи хода");

        _validateAndExecuteMove(player, targetX, targetY);
    }

    /**
     * @notice Прямой ход игрока со своего личного кошелька (автономный режим)
     * @param targetX Целевая координата X
     * @param targetY Целевая координата Y
     */
    function moveDirect(int32 targetX, int32 targetY) external {
        (, , bool exists, , ) = mainContract.getPlayer(msg.sender);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        _validateAndExecuteMove(msg.sender, targetX, targetY);
    }

    // ========================================================================
    // === ПРОВЕРКА ПРАВИЛ И ВЫПОЛНЕНИЕ ДЕЙСТВИЯ ===
    // ========================================================================

    /**
     * @dev Внутренняя валидация физики мира (шаг не более 1 клетки, запрет наступать на Обелиск)
     */
    function _validateAndExecuteMove(address player, int32 targetX, int32 targetY) internal {
        (int32 currentX, int32 currentY, , , ) = mainContract.getPlayer(player);

        int32 dx = targetX - currentX;
        int32 dy = targetY - currentY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        require(dx <= 1 && dy <= 1, unicode"AAA: Дистанция хода превышает 1 клетку");
        require(dx + dy > 0, unicode"AAA: Необходимо выбрать соседнюю клетку, а не текущую");

        // Проверяем препятствие клетки
        IInfinityVerse_Main.Cell memory targetCell = mainContract.getCell(targetX, targetY);
        require(targetCell.object != 1, unicode"AAA: Нельзя наступать на Обелиск");

        mainContract.movePlayer(player, targetX, targetY);
    }

    /**
     * @notice Восстановление публичного адреса подписанта по стандарту EIP-191 / ecrecover
     * @param messageHash Хеш сообщения с префиксом "\x19Ethereum Signed Message:\n32"
     * @param sig 65-байтная сигнатура (r, s, v)
     * @return Адрес кошелька, подписавшего сообщение
     */
    function recoverSigner(bytes32 messageHash, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, unicode"AAA: Некорректная длина подписи");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) v += 27;
        return ecrecover(messageHash, v, r, s);
    }
}
