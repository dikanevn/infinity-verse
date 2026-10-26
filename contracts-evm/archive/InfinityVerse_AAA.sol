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
    function getPlayer(address player) external view returns (
        int32 x,
        int32 y,
        bool exists,
        address sessionKey,
        uint256 sessionExpiry,
        uint64 registeredAtBlock,
        uint64 registeredAtTimestamp
    );
    function getCell(int32 x, int32 y) external view returns (Cell memory);
    
    function setCell(int32 x, int32 y, Cell calldata cellData) external;
    function spawnPlayer(address player, int32 startX, int32 startY) external;
    function movePlayer(address player, int32 toX, int32 toY) external;
    function setPlayerSession(address player, address sessionKey, uint256 expiry) external;
    function revokePlayerSession(address player) external;
    function incrementNonce(address player) external returns (uint256);
    function setContractAAA(address _contractAAA) external;
}

/**
 * @title InfinityVerse_AAA
 * @notice Логический контракт версии AAA (первое поколение игровой логики).
 * Выполняет все проверки правил игры, проверку криптографических подписей (EIP-191),
 * сессионные ключи и передает проверенные команды в контракт-хранитель Main.
 *
 * ВСЕ ПОЛЬЗОВАТЕЛЬСКИЕ ДЕЙСТВИЯ ИМЕЮТ СТРОГУЮ ПАРНУЮ СИММЕТРИЮ:
 * 1. ...Direct  — автономное действие со своего кошелька (без посредников, сам платишь газ)
 * 2. ...Gasless — действие без газа через спонсора/релеер (по криптографической подписи)
 */
contract InfinityVerse_AAA {
    string public constant VERSION = "0.0.0.0.9-AAA";
    string public constant REPOSITORY = "https://github.com/dikanevn/infinity-verse";

    // Адрес хранилища Main (на этапе активной разработки изменяемый деплоером)
    IInfinityVerse_Main public mainContract;
    // Неизменяемый адрес деплоера для управления привязкой Main на этапе разработки
    address public immutable deployer;
    // Неизменяемый адрес официального релеера-спонсора газа
    address public immutable relayer;

    event MainContractUpdated(address indexed oldMain, address indexed newMain);

    modifier onlyDeployer() {
        require(msg.sender == deployer, unicode"AAA: Вызов разрешен только деплоеру");
        _;
    }

    constructor(address _mainContract, address _relayer) {
        require(_mainContract != address(0), unicode"AAA: Некорректный адрес Main контракта");
        require(_relayer != address(0), unicode"AAA: Некорректный адрес релеера");
        deployer = msg.sender;
        mainContract = IInfinityVerse_Main(_mainContract);
        relayer = _relayer;
    }

    // ========================================================================
    // === АДМИНИСТРАЦИЯ И СЕТЬ ===
    // ========================================================================

    /**
     * @notice Изменение адреса контракта-хранилища Main (на этапе разработки)
     * @dev Разрешено только деплоеру контракта
     * @param _newMain Новый адрес контракта InfinityVerse_Main
     */
    function setMainContract(address _newMain) external onlyDeployer {
        require(_newMain != address(0), unicode"AAA: Некорректный адрес Main контракта");
        address oldMain = address(mainContract);
        mainContract = IInfinityVerse_Main(_newMain);
        
        // 🚀 АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:
        // Пытаемся автоматически авторизовать себя в новом Main (если он поддерживает авто-авторизацию деплоером)
        try IInfinityVerse_Main(_newMain).setContractAAA(address(this)) {
            // Успешно авторизован в Main за один вызов!
        } catch {
            // Если Main старой версии — не блокируем смену адреса
        }

        emit MainContractUpdated(oldMain, _newMain);
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
        (, , bool exists, address activeKey, uint256 expiry, , ) = mainContract.getPlayer(player);
        if (!exists && activeKey == address(0)) {
            return (sessionKey != address(0) && activeKey == sessionKey && block.timestamp < expiry);
        }
        return (sessionKey != address(0) && activeKey == sessionKey && block.timestamp < expiry);
    }

    /**
     * @notice 1. Авторизация сессии — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Вызывается игроком напрямую со своего кошелька (без спонсора и без подписи)
     * @param sessionKey Временный сессионный ключ (хранится в RAM браузера)
     * @param expiry Срок окончания сессии (unix timestamp)
     */
    function authorizeSessionDirect(address sessionKey, uint256 expiry) external {
        require(block.timestamp < expiry, unicode"AAA: Срок действия сессии уже истек");
        require(sessionKey != address(0), unicode"AAA: Некорректный сессионный ключ");
        mainContract.setPlayerSession(msg.sender, sessionKey, expiry);
    }

    /**
     * @notice 1. Авторизация сессии — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Отправляется спонсором/релеером по EIP-191 подписи игрока
     * @param player Адрес владельца аккаунта
     * @param sessionKey Временный сессионный ключ
     * @param expiry Срок окончания сессии (unix timestamp)
     * @param sig Подпись EIP-191 личным кошельком игрока
     */
    function authorizeSessionGasless(
        address player,
        address sessionKey,
        uint256 expiry,
        bytes calldata sig
    ) external {
        require(block.timestamp < expiry, unicode"AAA: Срок действия сессии уже истек");
        require(sessionKey != address(0), unicode"AAA: Некорректный сессионный ключ");

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
     * @notice 2. Отзыв сессии — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Мгновенный прямой отзыв сессии игроком со своего кошелька
     */
    function revokeSessionDirect() external {
        _executeRevokeSession(msg.sender);
    }

    /**
     * @notice 2. Отзыв сессии — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Отзыв сессии спонсором/релеером по подписи владельца
     * @param player Адрес игрока
     * @param sig Подпись EIP-191 на команду RevokeSession
     */
    function revokeSessionGasless(address player, bytes calldata sig) external {
        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("RevokeSession", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        require(signer == player, unicode"AAA: Неверная подпись отзыва сессии");

        _executeRevokeSession(player);
    }

    // ========================================================================
    // === ИГРОВЫЕ ДЕЙСТВИЯ: СПАВН И ХОДЫ ===
    // ========================================================================

    /**
     * @notice 3. Рождение в мире — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Прямой спавн со своего адреса (личная транзакция игрока в Monad RPC)
     * @return (x, y) Начальные координаты появления (1, 0)
     */
    function spawnDirect() external returns (int32, int32) {
        return _executeSpawn(msg.sender);
    }

    /**
     * @notice 3. Рождение в мире — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Газлесс-спавн через спонсора/релеер по криптографической EIP-191 подписи сессионного ключа
     * @param player Адрес кошелька игрока
     * @param spawnSig Подпись команды "Spawn" сессионным ключом игрока
     * @return (x, y) Начальные координаты появления (1, 0)
     */
    function spawnGasless(address player, bytes calldata spawnSig) external returns (int32, int32) {
        (, , , address activeSessionKey, , , ) = mainContract.getPlayer(player);
        require(isSessionValid(player, activeSessionKey), unicode"AAA: Для спавна требуется действующая сессия");

        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 spawnHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Spawn", player, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(spawnHash, spawnSig);
        require(signer == activeSessionKey, unicode"AAA: Несовпадение сессионного ключа в подписи спавна");

        return _executeSpawn(player);
    }

    /**
     * @notice 4. Ход по клеткам — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Прямой ход игрока со своего личного кошелька
     * @param targetX Целевая координата X
     * @param targetY Целевая координата Y
     */
    function moveDirect(int32 targetX, int32 targetY) external {
        (, , bool exists, , , , ) = mainContract.getPlayer(msg.sender);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        _validateAndExecuteMove(msg.sender, targetX, targetY);
    }

    /**
     * @notice 4. Ход по клеткам — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Ход с криптографической подписью сессионного ключа из RAM (оплачивает релеер)
     * @param player Адрес кошелька игрока
     * @param targetX Целевая координата X
     * @param targetY Целевая координата Y
     * @param moveSig Подпись команды хода сессионным ключом из RAM
     */
    function moveGasless(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata moveSig
    ) external {
        (, , bool exists, address sessionKey, , , ) = mainContract.getPlayer(player);
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
     * @notice 5. Разведка / создание одной клетки мира — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Игрок материализует 1 клетку песка из первозданной пустоты за собственный газ
     * @param targetX Координата X создаваемой клетки
     * @param targetY Координата Y создаваемой клетки
     */
    function discoverCellDirect(int32 targetX, int32 targetY) external {
        (, , bool exists, , , , ) = mainContract.getPlayer(msg.sender);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        _validateAndExecuteDiscoverCell(msg.sender, targetX, targetY);
    }

    /**
     * @notice 5. Разведка / создание одной клетки мира — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Игрок материализует 1 клетку песка по EIP-191 подписи сессионного ключа (газ платит спонсор)
     * @param player Адрес кошелька игрока
     * @param targetX Координата X создаваемой клетки
     * @param targetY Координата Y создаваемой клетки
     * @param sig Подпись команды "DiscoverCell" сессионным ключом игрока
     */
    function discoverCellGasless(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata sig
    ) external {
        (, , bool exists, address sessionKey, , , ) = mainContract.getPlayer(player);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        require(isSessionValid(player, sessionKey), unicode"AAA: Сессия истекла или недействительна");

        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 discoverHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("DiscoverCell", player, targetX, targetY, currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(discoverHash, sig);
        require(signer == sessionKey, unicode"AAA: Несовпадение сессионного ключа в подписи создания клетки");

        _validateAndExecuteDiscoverCell(player, targetX, targetY);
    }

    /**
     * @notice 6. Пакетная разведка / создание пачки клеток — ПРЯМОЙ РЕЖИМ (Direct)
     * @dev Игрок материализует до 9 клеток песка за собственный газ
     * @param xs Массив координат X
     * @param ys Массив координат Y
     */
    function discoverCellsBatchDirect(int32[] calldata xs, int32[] calldata ys) external {
        (, , bool exists, , , , ) = mainContract.getPlayer(msg.sender);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        _validateAndExecuteDiscoverBatch(msg.sender, xs, ys);
    }

    /**
     * @notice 6. Пакетная разведка / создание пачки клеток — БЕЗГАЗОВЫЙ РЕЖИМ (Gasless)
     * @dev Игрок материализует до 9 клеток песка по EIP-191 подписи сессионного ключа
     * @param player Адрес кошелька игрока
     * @param xs Массив координат X
     * @param ys Массив координат Y
     * @param sig Подпись команды "DiscoverBatch" сессионным ключом игрока
     */
    function discoverCellsBatchGasless(
        address player,
        int32[] calldata xs,
        int32[] calldata ys,
        bytes calldata sig
    ) external {
        (, , bool exists, address sessionKey, , , ) = mainContract.getPlayer(player);
        require(exists, unicode"AAA: Сначала необходимо родиться в мире");
        require(isSessionValid(player, sessionKey), unicode"AAA: Сессия истекла или недействительна");

        uint256 currentNonce = mainContract.incrementNonce(player);

        bytes32 batchHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("DiscoverBatch", player, keccak256(abi.encodePacked(xs)), keccak256(abi.encodePacked(ys)), currentNonce, block.chainid))
            )
        );

        address signer = recoverSigner(batchHash, sig);
        require(signer == sessionKey, unicode"AAA: Несовпадение сессионного ключа в подписи пакетного создания клеток");

        _validateAndExecuteDiscoverBatch(player, xs, ys);
    }

    // ========================================================================
    // === ЕДИНОЕ ВНУТРЕННЕЕ ЯДРО ВЫПОЛНЕНИЯ (INTERNAL CORE) ===
    // ========================================================================

    /**
     * @dev Внутренняя логика спавна нового игрока. Все режимы входа вызывают исключительно её.
     */
    function _executeSpawn(address player) internal returns (int32, int32) {
        int32 startX = 1;
        int32 startY = 0;
        mainContract.spawnPlayer(player, startX, startY);
        return (startX, startY);
    }

    /**
     * @dev Внутренняя логика отзыва сессии. Все режимы отзыва вызывают исключительно её.
     */
    function _executeRevokeSession(address player) internal {
        mainContract.revokePlayerSession(player);
    }

    /**
     * @dev Внутренняя валидация физики мира (шаг не более 1 клетки, запрет наступать на Обелиск)
     */
    function _validateAndExecuteMove(address player, int32 targetX, int32 targetY) internal {
        (int32 currentX, int32 currentY, , , , , ) = mainContract.getPlayer(player);

        int32 dx = targetX - currentX;
        int32 dy = targetY - currentY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        require(dx <= 1 && dy <= 1, unicode"AAA: Дистанция хода превышает 1 клетку");
        require(dx + dy > 0, unicode"AAA: Необходимо выбрать соседнюю клетку, а не текущую");

        // Проверяем препятствие клетки (Обелиск или Стена)
        IInfinityVerse_Main.Cell memory targetCell = mainContract.getCell(targetX, targetY);
        require(targetCell.object != 1, unicode"AAA: Нельзя наступать на Обелиск");
        require(targetCell.object != 2, unicode"AAA: Путь преграждает каменная стена");

        mainContract.movePlayer(player, targetX, targetY);
    }

    /**
     * @dev Внутренняя валидация и создание одной клетки песка:
     * 1) Клетка обязана быть первозданной пустотой (terrain == 0)
     * 2) Дистанция от игрока не более 1 клетки (в радиусе 3х3 вокруг персонажа)
     */
    function _validateAndExecuteDiscoverCell(address player, int32 targetX, int32 targetY) internal {
        (int32 currentX, int32 currentY, , , , , ) = mainContract.getPlayer(player);

        int32 dx = targetX - currentX;
        int32 dy = targetY - currentY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        require(dx <= 1 && dy <= 1, unicode"AAA: Создание клетки разрешено только в радиусе 1 шага от игрока");

        IInfinityVerse_Main.Cell memory targetCell = mainContract.getCell(targetX, targetY);
        require(targetCell.terrain == 0, unicode"AAA: Клетка уже существует (не пустота)");

        mainContract.setCell(targetX, targetY, IInfinityVerse_Main.Cell({
            terrain: 1, // Песок
            object: 0,  // Без препятствий
            state: 0,
            reserved: 0
        }));
    }

    /**
     * @dev Внутренняя пакетная валидация и создание до 9 клеток песка (радиус 3х3 вокруг игрока)
     */
    function _validateAndExecuteDiscoverBatch(address player, int32[] calldata xs, int32[] calldata ys) internal {
        require(xs.length == ys.length, unicode"AAA: Длины массивов xs и ys не совпадают");
        require(xs.length > 0 && xs.length <= 9, unicode"AAA: Количество клеток должно быть от 1 до 9");

        (int32 currentX, int32 currentY, , , , , ) = mainContract.getPlayer(player);

        IInfinityVerse_Main.Cell memory sandCell = IInfinityVerse_Main.Cell({
            terrain: 1, // Песок
            object: 0,  // Без препятствий
            state: 0,
            reserved: 0
        });

        for (uint256 i = 0; i < xs.length; i++) {
            int32 targetX = xs[i];
            int32 targetY = ys[i];

            int32 dx = targetX - currentX;
            int32 dy = targetY - currentY;
            if (dx < 0) dx = -dx;
            if (dy < 0) dy = -dy;

            require(dx <= 1 && dy <= 1, unicode"AAA: Все создаваемые клетки обязаны быть в радиусе 1 шага от игрока");

            IInfinityVerse_Main.Cell memory targetCell = mainContract.getCell(targetX, targetY);
            require(targetCell.terrain == 0, unicode"AAA: Одна из клеток уже существует (не пустота)");

            mainContract.setCell(targetX, targetY, sandCell);
        }
    }

    /**
     * @notice Восстановление публичного адреса подписанта по стандарту EIP-191 / ecrecover
     * @dev Включает строгую защиту от Signature Malleability (EIP-2 / OpenZeppelin ECDSA standard).
     * Значение s обязано находиться в нижней половине диапазона secp256k1 (s <= n/2), а v равно 27 или 28.
     * @param messageHash Хеш сообщения с префиксом "\x19Ethereum Signed Message:\n32"
     * @param sig 65-байтная сигнатура (r, s, v)
     * @return signer Адрес кошелька, подписавшего сообщение
     */
    function recoverSigner(bytes32 messageHash, bytes memory sig) public pure returns (address signer) {
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
        require(v == 27 || v == 28, unicode"AAA: Некорректный параметр v подписи");

        // Защита от Signature Malleability (EIP-2):
        // Ограничиваем s нижней половиной порядка эллиптической кривой secp256k1 (n / 2)
        // 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0 = secp256k1n / 2
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            unicode"AAA: Некорректный параметр s (malleability protection)"
        );

        signer = ecrecover(messageHash, v, r, s);
        require(signer != address(0), unicode"AAA: Не удалось восстановить подписанта");
    }
}
