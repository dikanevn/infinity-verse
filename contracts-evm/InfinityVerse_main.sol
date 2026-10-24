// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InfinityVerse_main
 * @author Infinity-Verse Team
 * @notice Основной контракт автономного мира Infinity-Verse:
 * 
 * 1. Бесконечная сетка клеток (x, y), где координаты упаковываются в 8-байтный ключ keccak256(x, y).
 * 2. Стартовая область 5х5 (25 клеток: x от -2 до +2, y от -2 до +2).
 *    В центре (0, 0) стоит древний Обелиск (🗿), вокруг — песчаная пустошь.
 * 3. Поддержка Игроков:
 *    - Каждый игрок имеет координаты (x, y) в мире.
 *    - Спавн игрока происходит возле Обелиска на клетке (0, 1).
 *    - Игрок может перемещаться на соседние клетки (влево, вправо, вверх, вниз, по диагонали).
 *    - На клетку с Обелиском (0, 0) наступать нельзя — это священный монолит!
 * 4. Поддержка Gasless-транзакций (Релеер):
 *    - Игрок может ходить сам (если у него есть монеты на газ).
 *    - ЛИБО за игрока транзакцию в блокчейн отправляет и оплачивает специальный спонсор (релеер).
 *      Благодаря этому игрок играет в один клик без всплывающих окон и с 0 на балансе!
 */
contract InfinityVerse_main {
    // Версия смарт-контракта (для проверки клиентом и фронтендом)
    string public constant VERSION = "0.0.0.0.6";

    /**
     * @dev Структура данных одной клетки мира (ровно 8 байт = 64 бита):
     * - terrain: тип почвы (0 = пустота, 1 = песок, 2 = вода, 3 = скала)
     * - object: объект на клетке (0 = пусто, 1 = обелиск, 2 = камень)
     * - state: состояние/прочность клетки (от 0 до 255)
     * - reserved: резервный байт под будущие механики
     * - paramA: 2 байта под параметры эпох (ресурсы, температура и т.д.)
     * - paramB: 2 байта под параметры эпох
     */
    struct Cell {
        uint8 terrain;
        uint8 object;
        uint8 state;
        uint8 reserved;
        uint16 paramA;
        uint16 paramB;
    }

    /**
     * @dev Структура игрока в мире:
     * - x, y: текущие координаты игрока
     * - exists: зарегистрирован ли игрок в мире
     * - lastMoveBlock: номер блока последнего хода (защита от спама)
     */
    struct Player {
        int32 x;
        int32 y;
        bool exists;
        uint256 lastMoveBlock;
    }

    // Хранилище клеток: хэш координат keccak256(x, y) => Данные клетки
    mapping(bytes32 => Cell) public cells;

    // Хранилище игроков: адрес кошелька игрока => Данные игрока
    mapping(address => Player) public players;

    // Адрес доверенного спонсора/релеера, который имеет право оплачивать газ за игроков
    address public relayer;

    // Владелец контракта (деплоер)
    address public owner;

    // --- СОБЫТИЯ (EVENTS) ---
    // Срабатывает при изменении клетки (ландшафт или объект)
    event CellUpdated(int32 indexed x, int32 indexed y, uint8 terrain, uint8 object);
    // Срабатывает при первом появлении (спавне) игрока в мире
    event PlayerSpawned(address indexed player, int32 x, int32 y);
    // Срабатывает при каждом шаге игрока
    event PlayerMoved(address indexed player, int32 fromX, int32 fromY, int32 toX, int32 toY);
    // Срабатывает при смене адреса спонсора/релеера
    event RelayerUpdated(address indexed newRelayer);

    /**
     * @dev Модификатор доступа: действие может выполнить:
     * 1. Сам игрок лично (со своего кошелька).
     * 2. Доверенный спонсор (релеер), оплачивающий газ за игрока.
     * 3. Владелец контракта (owner).
     */
    modifier onlyRelayerOrPlayer(address player) {
        require(msg.sender == player || msg.sender == relayer || msg.sender == owner, "Not authorized");
        _;
    }

    /**
     * @dev Модификатор доступа: только владелец контракта
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Конструктор контракта:
     * @param _relayer Адрес доверенного кошелька-спонсора для бесплатной игры игроков
     * Создаёт стартовую сетку 5х5 (25 клеток от -2 до +2 по осям X и Y).
     */
    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;

        // Заполняем сетку 5х5 вокруг центра
        for (int32 x = -2; x <= 2; x++) {
            for (int32 y = -2; y <= 2; y++) {
                bytes32 key = getCellKey(x, y);

                if (x == 0 && y == 0) {
                    // Точный центр мира (0, 0): песок (terrain = 1) и древний Обелиск (object = 1)
                    cells[key] = Cell({
                        terrain: 1,
                        object: 1,
                        state: 0,
                        reserved: 0,
                        paramA: 0,
                        paramB: 0
                    });
                } else {
                    // Окружающие 24 клетки: чистый песок (terrain = 1) без объектов (object = 0)
                    cells[key] = Cell({
                        terrain: 1,
                        object: 0,
                        state: 0,
                        reserved: 0,
                        paramA: 0,
                        paramB: 0
                    });
                }
            }
        }
    }

    /**
     * @notice Смена адреса спонсора/релеера (только для владельца контракта)
     */
    function setRelayer(address _newRelayer) external onlyOwner {
        relayer = _newRelayer;
        emit RelayerUpdated(_newRelayer);
    }

    /**
     * @notice Превращает координаты (x, y) в уникальный 32-байтный хэш-ключ для mapping
     * @dev Использует плотную бинарную упаковку abi.encodePacked(int32, int32) = ровно 8 байт
     */
    function getCellKey(int32 x, int32 y) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    /**
     * @notice Получить данные одной конкретной клетки по координатам (x, y)
     */
    function getCell(int32 x, int32 y) external view returns (Cell memory) {
        return cells[getCellKey(x, y)];
    }

    /**
     * @notice Получить данные сразу пачки клеток (оптимизация для быстрого чтения клиентом)
     * @param xs Массив координат X
     * @param ys Массив координат Y
     */
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
     * @notice Спавн (рождение) игрока в мире:
     * Если игрок заходит впервые — он появляется на клетке (0, 1), прямо к северу от Обелиска.
     */
    function spawn(address player) public onlyRelayerOrPlayer(player) returns (int32, int32) {
        if (!players[player].exists) {
            players[player] = Player({
                x: 0,
                y: 1,
                exists: true,
                lastMoveBlock: block.number
            });
            emit PlayerSpawned(player, 0, 1);
        }
        return (players[player].x, players[player].y);
    }

    /**
     * @notice Перемещение игрока на новую клетку:
     * @param player Адрес игрока, который совершает ход
     * @param targetX Координата X целевой клетки
     * @param targetY Координата Y целевой клетки
     * 
     * Правила хода:
     * 1. Если игрок ещё не появился в мире — он сначала автоматически спавнится.
     * 2. Ходить можно строго на соседнюю клетку (расстояние по осям не больше 1).
     * 3. Нельзя встать на клетку с Обелиском (0, 0).
     */
    function move(address player, int32 targetX, int32 targetY) external onlyRelayerOrPlayer(player) {
        // Если игрок ещё не родился в мире — спавним его
        if (!players[player].exists) {
            spawn(player);
        }

        Player storage p = players[player];
        int32 curX = p.x;
        int32 curY = p.y;

        // Вычисляем расстояние шага по X и по Y
        int32 dx = targetX - curX;
        int32 dy = targetY - curY;
        if (dx < 0) dx = -dx;
        if (dy < 0) dy = -dy;

        // Проверка: ход строго на соседнюю клетку (дистанция 1) и не на то же самое место
        require((dx <= 1 && dy <= 1) && (dx + dy > 0), "Can only move to adjacent cell");

        // Проверка: на клетке (0, 0) стоит монолитный Обелиск — проход заблокирован
        Cell memory dest = cells[getCellKey(targetX, targetY)];
        require(dest.object != 1, "Cell occupied by Obelisk");

        // Записываем новые координаты игрока и обновляем блок последнего хода
        p.x = targetX;
        p.y = targetY;
        p.lastMoveBlock = block.number;

        // Вызываем событие, чтобы фронтенд и индексаторы мгновенно увидели анимацию перемещения
        emit PlayerMoved(player, curX, curY, targetX, targetY);
    }

    /**
     * @notice Получить текущие координаты игрока и статус его существования
     */
    function getPlayer(address player) external view returns (int32 x, int32 y, bool exists) {
        Player memory p = players[player];
        return (p.x, p.y, p.exists);
    }
}
