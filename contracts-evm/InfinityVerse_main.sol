// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_main
 * @author Infinity-Verse Team
 * @notice Основной контракт автономного мира Infinity-Verse:
 * 
 * КРИПТОГРАФИЧЕСКАЯ БЕЗОПАСНОСТЬ (SESSION KEYS):
 * 1. Игрок подключает кошелёк (MetaMask / Rabby / Phantom) и ОДИН РАЗ подписывает сессию.
 * 2. Сессия регистрирует временный сессионный ключ (sessionKey), который может ходить за игрока до expireTime.
 * 3. Релеер отправляет транзакции и платит за газ, но контракт ПРОВЕРЯЕТ подпись сессионного ключа.
 * 4. Никто чужой не может ходить за чужого игрока!
 */
contract InfinityVerse_main {
    string public constant VERSION = "0.0.0.0.7";

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
        address sessionKey;    // Авторизованный временный ключ игрока
        uint256 sessionExpiry; // Срок действия сессии
    }

    mapping(bytes32 => Cell) public cells;
    mapping(address => Player) public players;

    // Счётчик nonces для защиты от повтора подписей (Replay Attack)
    mapping(address => uint256) public nonces;

    address public relayer;
    address public owner;

    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    event PlayerSpawned(address indexed player, int32 x, int32 y);
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    event SessionAuthorized(address indexed player, address indexed sessionKey, uint256 expiry);
    event SessionRevoked(address indexed player);
    event RelayerUpdated(address indexed newRelayer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;

        // Создаём стартовую сетку 5х5 (25 клеток от -2 до +2)
        for (int32 x = -2; x <= 2; x++) {
            for (int32 y = -2; y <= 2; y++) {
                bytes32 key = getCellKey(x, y);

                if (x == 0 && y == 0) {
                    cells[key] = Cell({
                        terrain: 1,
                        object: 1,
                        state: 0,
                        reserved: 0
                    });
                } else {
                    cells[key] = Cell({
                        terrain: 1,
                        object: 0,
                        state: 0,
                        reserved: 0
                    });
                }

            }
        }
    }

    function setRelayer(address _newRelayer) external onlyOwner {
        relayer = _newRelayer;
        emit RelayerUpdated(_newRelayer);
    }

    function getCellKey(int32 x, int32 y) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    function getCell(int32 x, int32 y) external view returns (Cell memory) {
        return cells[getCellKey(x, y)];
    }

    function getCellsBatch(
        int32[] calldata xs,
        int32[] calldata ys
    ) external view returns (Cell[] memory) {
        require(xs.length == ys.length, "Arrays length mismatch");
        uint256 total = xs.length;
        Cell[] memory result = new Cell[](total);
        for (uint256 i = 0; i < total; i++) {
            result[i] = cells[getCellKey(xs[i], ys[i])];
        }
        return result;
    }

    /**
     * @notice Авторизация сессионного ключа игрока (вызывается релеером с подписью кошелька игрока)
     * @param player Адрес основного кошелька игрока
     * @param sessionKey Временный локальный ключ в браузере игрока
     * @param expiry Время истечения сессии (unix timestamp)
     * @param sig Подпись EIP-191 / personal_sign от основного кошелька игрока
     */
    function authorizeSessionWithSig(
        address player,
        address sessionKey,
        uint256 expiry,
        bytes calldata sig
    ) public {
        require(block.timestamp < expiry, "Session already expired");

        // Хэш сообщения авторизации: keccak256("AuthorizeSession", player, sessionKey, expiry, nonce, chainId)
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("AuthorizeSession", player, sessionKey, expiry, nonces[player]++, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        require(signer == player, "Invalid session signature");

        players[player].sessionKey = sessionKey;
        players[player].sessionExpiry = expiry;

        emit SessionAuthorized(player, sessionKey, expiry);
    }

    /**
     * @notice Прямой отзыв сессии игроком (если у игрока есть газ на вызов)
     */
    function revokeSessionDirect() external {
        _revokeSession(msg.sender);
    }

    /**
     * @notice Газлесс-отзыв сессии через релеер с криптографической подписью основного кошелька игрока
     * @param player Адрес игрока
     * @param sig Подпись сообщения "RevokeSession" от основного кошелька игрока
     */
    function revokeSessionWithSig(address player, bytes calldata sig) external {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("RevokeSession", player, nonces[player]++, block.chainid))
            )
        );

        address signer = recoverSigner(messageHash, sig);
        require(signer == player, "Invalid revoke signature");

        _revokeSession(player);
    }

    function _revokeSession(address player) internal {
        players[player].sessionKey = address(0);
        players[player].sessionExpiry = 0;
        emit SessionRevoked(player);
    }

    /**
     * @notice Прямой спавн игроком со своего адреса (требует газа игрока)
     */
    function spawnDirect() external returns (int32, int32) {
        return _executeSpawn(msg.sender);
    }

    /**
     * @notice Спавн игрока:
     * Может вызываться:
     * 1. Лично игроком со своего кошелька (msg.sender == player)
     * 2. Релеером (gasless) ТОЛЬКО при наличии валидной сессии, подписанной приватником игрока (isSessionValid)
     */
    function spawn(address player) external returns (int32, int32) {
        require(msg.sender == player || isSessionValid(player, players[player].sessionKey), "Not authorized: session required");
        return _executeSpawn(player);
    }

    function _executeSpawn(address player) internal returns (int32, int32) {
        require(!players[player].exists, "Player already born");

        players[player].x = 1;
        players[player].y = 0;
        players[player].exists = true;
        players[player].lastMoveBlock = block.number;

        emit PlayerSpawned(player, 1, 0);
        return (1, 0);
    }


    /**
     * @notice Перемещение игрока с криптографической проверкой сессионного ключа:
     * @param player Адрес игрока
     * @param targetX Куда шагнуть по X
     * @param targetY Куда шагнуть по Y
     * @param moveSig Подпись действия от сессионного ключа игрока
     */
    function moveWithSession(
        address player,
        int32 targetX,
        int32 targetY,
        bytes calldata moveSig
    ) external {
        require(players[player].exists, "Player must spawn first");
        require(isSessionValid(player, players[player].sessionKey), "Session expired or invalid");

        // Проверяем подпись конкретного шага сессионным ключом
        bytes32 moveHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked("Move", player, targetX, targetY, nonces[player]++, block.chainid))
            )
        );

        address signer = recoverSigner(moveHash, moveSig);
        require(signer == players[player].sessionKey, "Invalid move signature: session key mismatch");

        _executeMove(player, targetX, targetY);
    }

    /**
     * @notice Прямой ход игрока (если игрок вызывает сам со своего кошелька)
     */
    function moveDirect(int32 targetX, int32 targetY) external {
        require(players[msg.sender].exists, "Player must spawn first");
        _executeMove(msg.sender, targetX, targetY);
    }

    function _executeMove(address player, int32 targetX, int32 targetY) internal {
        Player storage p = players[player];
        int32 curX = p.x;
        int32 curY = p.y;

        int32 dx = targetX - curX;
        int32 dy = targetY - curY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        require((dx <= 1 && dy <= 1) && (dx + dy > 0), "Can only move to adjacent cell");

        Cell memory dest = cells[getCellKey(targetX, targetY)];
        require(dest.object != 1, "Cell occupied by Obelisk");

        p.x = targetX;
        p.y = targetY;
        p.lastMoveBlock = block.number;

        emit PlayerMoved(player, curX, curY, targetX, targetY);
    }

    function isSessionValid(address player, address caller) public view returns (bool) {
        Player memory p = players[player];
        return p.sessionKey != address(0) && p.sessionKey == caller && block.timestamp < p.sessionExpiry;
    }

    function getPlayer(address player) external view returns (int32 x, int32 y, bool exists, address sessionKey, uint256 sessionExpiry) {
        Player memory p = players[player];
        return (p.x, p.y, p.exists, p.sessionKey, p.sessionExpiry);
    }

    function recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(hash, v, r, s);
    }
}
