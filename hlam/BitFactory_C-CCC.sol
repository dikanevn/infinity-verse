// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMainGrid {
	
	struct Playerstat {
		uint256 bestScore; 
		string name; 
        uint256 firstGameTimestamp; // Время начала первой игры
		string link;
    }


	
    struct TopPlayer {
        address playerAddress;
        uint256 bestScore;
    }
	

	
	struct Cell {
        string content;
        string tool;
        uint256 coalAmount;
        uint256 lastTimeChecked;
        string man;
        uint256 ironAmount;
        uint256 ironplateAmount;
        uint256 componentsAmount;
        string factorySettings;
        string previouscontent;
		uint256 wallPowerAmount;
    }	
	
	function getCell(address user, uint256 x, uint256 y) external view returns (Cell memory);

	
	struct Depot {
        uint256 gridSize;
        uint256 drillsAmount;
        uint256 boxesAmount;
        uint256 mansAmount;
        uint256 furnaceAmount;
        uint256 factoryAmount;
        uint256 starttimee;
        uint256 lastmeteoritTimeChecked;
        uint256 blocktimestamp;
        uint256 bulldozerAmount;
        uint256 early;
        uint256 mmmtime;
        uint256 mmmdrillSpeed;
        uint256 iterationLimitDepot;
    uint256 isPaused;       // 1 - пауза активна, 0 - игра идёт
    uint256 pausedDuration; // Накопленное время паузы
    uint256 pauseStartTime; // Время начала текущей паузы		
	 uint256 wallAmount;	
	 	 uint256 theEndCount;
uint256 speedkoef;
    uint256 trainingCompleted; // Новый параметр: 0 - обучение не завершено, 1 - завершено
    uint256 normalizedTime;
    uint256 lastUpdateTime;
    uint256 frequencyFactor;
    uint256 gotoLevel;
 bool allMeteorsProcessed; // Новый флаг


    }

    function getDepot(address user) external view returns (Depot memory);
	
	
    function updateDepotSpeedkoef(address user, uint256 speedkoef) external;
	function getMaxBox() external view returns (uint256);
    function updateContent(address user, uint256 x, uint256 y, string memory content) external;
    function updateTool(address user, uint256 x, uint256 y, string memory tool) external;
    function updateCoalAmount(address user, uint256 x, uint256 y, uint256 coalAmount) external;
    function updateLastTimeChecked(address user, uint256 x, uint256 y, uint256 lastTimeChecked) external;
    function updateMan(address user, uint256 x, uint256 y, string memory man) external;
    function updateIronAmount(address user, uint256 x, uint256 y, uint256 ironAmount) external;
    function updateIronplateAmount(address user, uint256 x, uint256 y, uint256 ironplateAmount) external;
    function updateComponentsAmount(address user, uint256 x, uint256 y, uint256 componentsAmount) external;
    function updateFactorySettings(address user, uint256 x, uint256 y, string memory factorySettings) external;
    function updatePreviousContent(address user, uint256 x, uint256 y, string memory previouscontent) external;


    function updateDepotGridSize(address user, uint256 gridSize) external;
    function updateDepotDrillsAmount(address user, uint256 drillsAmount) external;
    function updateDepotBoxesAmount(address user, uint256 boxesAmount) external;
    function updateDepotMansAmount(address user, uint256 mansAmount) external;
    function updateDepotFurnaceAmount(address user, uint256 furnaceAmount) external;
    function updateDepotFactoryAmount(address user, uint256 factoryAmount) external;
    function updateDepotStarttimee(address user, uint256 starttimee) external;
    function updateDepotLastMeteoritTimeChecked(address user, uint256 lastmeteoritTimeChecked) external;
    function updateDepotBlockTimestamp(address user, uint256 blocktimestamp) external;
    function updateDepotBulldozerAmount(address user, uint256 bulldozerAmount) external;
    function updateDepotEarly(address user, uint256 early) external;
    function updateDepotMmmtime(address user, uint256 mmmtime) external;
    function updateDepotMmmdrillSpeed(address user, uint256 mmmdrillSpeed) external;
    function updateDepotiterationLimitDepot(address user, uint256 iterationLimitDepot) external;
    function setDepotPause(address user, uint256 isPaused) external;
    function updateDepotPausedDuration(address user, uint256 pausedDuration) external;
    function updateDepotPauseStartTime(address user, uint256 pauseStartTime) external;
   function updateDepotWallAmount(address user, uint256 wallAmount) external;
function updateWallPowerAmount(address user, uint256 x, uint256 y, uint256 wallPowerAmount) external;
function updateDepotTheEndCount(address user, uint256 theEndCount) external;
function updateDepotTrainingCompleted(address user, uint256 trainingCompleted) external;
    function updateDepotNormalizedTime(address user, uint256 normalizedTime) external;
    function updateDepotLastUpdateTime(address user, uint256 lastUpdateTime) external;
   function updateDepotFrequencyFactor(address user, uint256 frequencyFactor) external;
function updateDepotGotoLevel(address user, uint256 gotoLevel) external;
    function getTopPlayers() external view returns (TopPlayer[100] memory);

    function updateBestScore(address player, uint256 newScore) external;

    function updateName(address player, string calldata newText) external;

    function updateFirstGameTimestamp(address player, uint256 time) external;

    function updateLink(address player, string calldata newText) external;

    function updateAllTopPlayers(TopPlayer[100] calldata newTopPlayers) external;

    function getPlayerstat(address user) external view returns (Playerstat memory);
function setPendingChronicle(address user, uint256 recordId) external;
function nextRecordId() external view returns (uint256);
function incrementNextRecordId() external;
 function updateDepotMeteorsProcessed(address user, bool status) external;


    function addChronicle(
        uint256 recordId,
        uint256 score,
        address addr,
        string memory name,
        string memory message,
        uint256 recordTime
    ) external;
	
 
    function pendingChronicles(address user) external view returns (uint256);


    function getChronicle(uint256 id)
        external
        view
        returns (
            uint256 recordScore,
            address recordAddress,
            string memory recordName,
            string memory recordMessage,
            uint256 recordTime
        );










}












contract ContractCCC {
	
	
	
	IMainGrid private mainGrid;
	
    uint256 constant SCALE = 1e18; // Масштабирование для фиксированной точки
	
    enum Direction { UP, RIGHT, DOWN, LEFT }
	
	
	
    // Конструктор для установки администратора и адреса основного контракта
    constructor(address mainGridAddress) {
        require(mainGridAddress != address(0), "MainGrid address cannot be zero");
        mainGrid = IMainGrid(mainGridAddress);
        //admin = msg.sender; // Устанавливаем администратора
		
    }	
	
    function setMainGridAddress(address newMainGridAddress) external {
        require(newMainGridAddress != address(0), "MainGrid address cannot be zero");

        //address oldAddress = address(mainGrid);
        mainGrid = IMainGrid(newMainGridAddress);

        //emit MainGridAddressChanged(oldAddress, newMainGridAddress);
    }	
	
	
	
	
function removeTool(address senderFromBBB, uint256 x, uint256 y, uint256 /* unused */) public {
    // Проверяем координаты
    IMainGrid.Cell memory cell = mainGrid.getCell(senderFromBBB, x, y);
    IMainGrid.Depot memory depot = mainGrid.getDepot(senderFromBBB);

		require(depot.isPaused == 0, "paused");
		//require(depot.theEndCount > 100, "Game Over");
     require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");

    string memory toolType = cell.tool;
    require(keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("toolEmpty")), "toolEmpty");
    require(keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("Space")), "Space");
    require(keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("Ruins")), "Ruins");
	
	
	
	
    // Возвращаем инструмент в депо
    if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Drill"))) {
        mainGrid.updateDepotDrillsAmount(senderFromBBB, depot.drillsAmount + 1);
    } else if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Box"))) {
        mainGrid.updateDepotBoxesAmount(senderFromBBB, depot.boxesAmount + 1);
    } else if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Man"))) {
        mainGrid.updateDepotMansAmount(senderFromBBB, depot.mansAmount + 1);
    } else if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Furnace"))) {
        mainGrid.updateDepotFurnaceAmount(senderFromBBB, depot.furnaceAmount + 1);
    } else if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Factory"))) {
        mainGrid.updateDepotFactoryAmount(senderFromBBB, depot.factoryAmount + 1);
    }

    // Сбрасываем состояние ячейки через основной контракт
    mainGrid.updateMan(senderFromBBB, x, y, "manEmpty");
    mainGrid.updateTool(senderFromBBB, x, y, "toolEmpty");
    mainGrid.updateCoalAmount(senderFromBBB, x, y, 0);
    mainGrid.updateIronAmount(senderFromBBB, x, y, 0);
    mainGrid.updateIronplateAmount(senderFromBBB, x, y, 0);
    mainGrid.updateComponentsAmount(senderFromBBB, x, y, 0);
    mainGrid.updateFactorySettings(senderFromBBB, x, y, "factorySettingsEmptyF");

    mainGrid.updateWallPowerAmount(senderFromBBB, x, y, 0); // Сбрасываем wallPowerAmount	
}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	

/*
    event MeteoritFrequencyUpdated(
        address indexed user,
        uint256 frequencyFactor,
        uint256 adjustedMeteoritTime
    );

    event MeteoritCalledBBB(
        address indexed user,
        uint256 timestamp,
        uint256 targetX,
        uint256 targetY,
        uint256 startX,
        uint256 startY
    );

    event TimeMetricsUpdated(
        address indexed user,
        uint256 lastMeteoritTimeChecked,
        uint256 blockTimestamp,
        uint256 early
    );
*/
function meteoritfunction(uint256 frequencyFactorInCoal, address senderFromBBB, uint256 externalRandom) public {
    IMainGrid.Depot memory depot = mainGrid.getDepot(senderFromBBB);

    uint256 gridSize = depot.gridSize;
    require(depot.isPaused == 0, "Paused");
    require(gridSize > 0, "Grid size is not initialized");

    require(depot.speedkoef > 0, "Speed coefficient must be greater than zero");
    require(frequencyFactorInCoal > SCALE, "Frequency factor must be > 1e18");
    require(depot.speedkoef <= type(uint256).max / frequencyFactorInCoal, "Multiplication overflow risk");

    uint256 scaledSpeedFactor = depot.speedkoef * frequencyFactorInCoal;
    require(scaledSpeedFactor > 0, "Scaled speed factor must be greater than zero");
    require(depot.mmmtime <= type(uint256).max / SCALE, "mmmtime scaling overflow");

    uint256 adjustedMeteoritTime = depot.mmmtime * SCALE / scaledSpeedFactor;
    require(adjustedMeteoritTime > 0, "Adjusted meteorit time must be greater than zero");

    require(depot.lastmeteoritTimeChecked <= type(uint256).max - adjustedMeteoritTime, "Last meteorit time addition overflow");
    depot.lastmeteoritTimeChecked += adjustedMeteoritTime;

    mainGrid.updateDepotLastMeteoritTimeChecked(senderFromBBB, depot.lastmeteoritTimeChecked);

    require(block.timestamp > 0, "Block timestamp must be valid");
    mainGrid.updateDepotBlockTimestamp(senderFromBBB, block.timestamp);

    require(gridSize > 0, "Grid size must be valid");
    (uint256 targetX, uint256 targetY) = selectRandomCell(senderFromBBB, gridSize, externalRandom);
    Direction edgeDirection = selectRandomEdgeDirection(senderFromBBB, externalRandom);
    (uint256 startX, uint256 startY) = getEdgeStartPosition(edgeDirection, gridSize, targetX, targetY);

    moveMeteorite(senderFromBBB, startX, startY, gridSize, depot);
}




	
// Функция выбора случайной ячейки
function selectRandomCell(address senderFromBBB, uint256 gridSize, uint256 externalRandom) private view returns (uint256, uint256) {
    require(gridSize > 0, "Grid size must be greater than zero");

    // Генерация псевдослучайного числа для X
    uint256 randomSeedX = uint256(
        keccak256(
            abi.encodePacked(block.timestamp, block.prevrandao, senderFromBBB, externalRandom, "X")
        )
    );
    uint256 startX = randomSeedX % gridSize;
    require(startX < gridSize, "Invalid X coordinate");

    // Генерация псевдослучайного числа для Y
    uint256 randomSeedY = uint256(
        keccak256(
            abi.encodePacked(block.timestamp, block.prevrandao, senderFromBBB, externalRandom, "Y")
        )
    );
    uint256 startY = randomSeedY % gridSize;
    require(startY < gridSize, "Invalid Y coordinate");

    return (startX, startY);
}

// Выбор случайной стороны для начала движения
function selectRandomEdgeDirection(address senderFromBBB, uint256 externalRandom) private view returns (Direction) {
    uint256 randDir = uint256(
        keccak256(
            abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                senderFromBBB,
                externalRandom
            )
        )
    ) % 4;
    require(randDir < 4, "Invalid direction value");

    return Direction(randDir); // UP, RIGHT, DOWN, LEFT
}



// Получение стартовой позиции на краю сетки
function getEdgeStartPosition(
    Direction edgeDirection,
    uint256 gridSize,
    uint256 currentX,
    uint256 currentY
)
    private
    pure
    returns (uint256, uint256)
{
  require(gridSize > 0, "Grid size must be greater than zero");

    if (edgeDirection == Direction.UP) {
        require(currentY < gridSize, "Invalid Y coordinate for UP");
        return (0, currentY);
    } else if (edgeDirection == Direction.RIGHT) {
        require(currentX < gridSize, "Invalid X coordinate for RIGHT");
        return (currentX, gridSize - 1);
    } else if (edgeDirection == Direction.DOWN) {
        require(currentY < gridSize, "Invalid Y coordinate for DOWN");
        return (gridSize - 1, currentY);
    } else {
        require(currentX < gridSize, "Invalid X coordinate for LEFT");
        return (currentX, 0);
    }
}

// Движение метеорита с края внутрь
function moveMeteorite(
	address senderFromBBB,
    uint256 startX,
    uint256 startY,
    uint256 gridSize,
    IMainGrid.Depot memory depot
) private {
    require(gridSize > 0, "Grid size must be greater than zero");
    require(startX < gridSize && startY < gridSize, "Invalid start coordinates");

    uint256 currentX = startX;
    uint256 currentY = startY;

    while (true) {
        // Получаем данные текущей ячейки
        IMainGrid.Cell memory currentCell = mainGrid.getCell(senderFromBBB, currentX, currentY);

        // Проверяем, можно ли разместить метеорит
        if (
            keccak256(abi.encodePacked(currentCell.tool)) != keccak256(abi.encodePacked("Space")) &&
            keccak256(abi.encodePacked(currentCell.tool)) != keccak256(abi.encodePacked("Ruins"))
        ) {
            // Размещаем метеорит
            handleMeteoriteImpact(senderFromBBB, currentX, currentY, depot);
            break;
        }

        // Двигаемся к следующей ячейке
        bool outOfBounds;
        (currentX, currentY, outOfBounds) = getNextStep(currentX, currentY, startX, startY, gridSize);
        require(currentX < gridSize && currentY < gridSize, "Invalid coordinates during movement");

        // Если достигли края сетки, завершаем движение
        if (outOfBounds) {
            break;
        }
    }
}



function getNextStep(
    uint256 currentX,
    uint256 currentY,
    uint256 startX,
    uint256 startY,
    uint256 gridSize
) private pure returns (uint256, uint256, bool) {
    require(gridSize > 0, "Grid size must be greater than zero");
    require(currentX < gridSize, "Invalid currentX");
    require(currentY < gridSize, "Invalid currentY");

    // Если начальная позиция была сверху, движемся вниз
    if (startX == 0) {
        if (currentX + 1 < gridSize) {
            return (currentX + 1, currentY, false);
        } else {
            return (currentX, currentY, true); // Достигли нижнего края
        }
    }

    // Если начальная позиция была справа, движемся влево
    if (startY == gridSize - 1) {
        if (currentY > 0) {
            return (currentX, currentY - 1, false);
        } else {
            return (currentX, currentY, true); // Достигли левого края
        }
    }

    // Если начальная позиция была снизу, движемся вверх
    if (startX == gridSize - 1) {
        if (currentX > 0) {
            return (currentX - 1, currentY, false);
        } else {
            return (currentX, currentY, true); // Достигли верхнего края
        }
    }

    // Если начальная позиция была слева, движемся вправо
    if (startY == 0) {
        if (currentY + 1 < gridSize) {
            return (currentX, currentY + 1, false);
        } else {
            return (currentX, currentY, true); // Достигли правого края
        }
    }

    return (currentX, currentY, true); // На случай ошибки
}




function handleMeteoriteImpact(address senderFromBBB, uint256 x, uint256 y, IMainGrid.Depot memory depot) internal {
IMainGrid.Playerstat memory playerstat = mainGrid.getPlayerstat(msg.sender);
    IMainGrid.Cell memory cell = mainGrid.getCell(senderFromBBB, x, y);
    string memory toolType = cell.tool;

    // Если инструмент - "Wall"
    if (keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("Wall"))) {
        if (cell.wallPowerAmount < 110) {
            // Если wallPowerAmount меньше 110, сбрасываем инструмент на "Ruins"
            mainGrid.updateWallPowerAmount(senderFromBBB, x, y, 0);
            removeTool(senderFromBBB, x, y, 0);
        } else {
            require(cell.wallPowerAmount >= 110, "Underflow in wallPowerAmount");
            uint256 newWallPower = cell.wallPowerAmount - 110;
            require(newWallPower <= cell.wallPowerAmount, "Overflow in wallPowerAmount update");
            mainGrid.updateWallPowerAmount(senderFromBBB, x, y, newWallPower);

            // Если wallPowerAmount становится 0, обновляем инструмент на "Ruins"
            if (newWallPower == 0) {
                removeTool(senderFromBBB, x, y, 0);
            }
        }

        return; // Завершаем выполнение функции
    }

    // Проверяем, что инструмент не является Space, Ruins, toolEmpty или Wall
    if (
        keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("Space")) &&
        keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("Ruins")) &&
        keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("Wall")) &&
        keccak256(abi.encodePacked(toolType)) != keccak256(abi.encodePacked("toolEmpty"))
    ) {
        // Вызываем removeTool для удаления инструмента
        removeTool(senderFromBBB, x, y, 0);
    }

    // Логика обновления инструмента в зависимости от его текущего состояния
    if (
        keccak256(abi.encodePacked(toolType)) == keccak256(abi.encodePacked("toolEmpty"))
    ) {
        require(depot.theEndCount > 0, "Underflow in theEndCount");
        uint256 newTheEndCount = depot.theEndCount - 1;
		
		
if (newTheEndCount <= 100) {
    // Проверяем и обновляем лучший результат игрока
    if (playerstat.bestScore < depot.normalizedTime) {
        mainGrid.updateBestScore(senderFromBBB, depot.normalizedTime);

    }
    

updateTopPlayers(senderFromBBB);


}


        require(newTheEndCount < depot.theEndCount, "Underflow in theEndCount update");
        depot.theEndCount = newTheEndCount;
        mainGrid.updateDepotTheEndCount(senderFromBBB, depot.theEndCount);
        mainGrid.updateTool(senderFromBBB, x, y, "Space");
    } else {
        require(depot.theEndCount > 0, "Underflow in theEndCount");
        uint256 newTheEndCount = depot.theEndCount - 1;
        require(newTheEndCount < depot.theEndCount, "Underflow in theEndCount update");
        depot.theEndCount = newTheEndCount;
        mainGrid.updateDepotTheEndCount(senderFromBBB, depot.theEndCount);
		
        mainGrid.updateTool(senderFromBBB, x, y, "Ruins");
    }
	


	
	
	
}


function updateTopPlayers(address user) internal {
    IMainGrid.TopPlayer[100] memory topPlayers = mainGrid.getTopPlayers();
    IMainGrid.Depot memory depot = mainGrid.getDepot(user);
    uint256 playerScore = depot.normalizedTime;

    // Проверяем, есть ли пользователь уже в списке
    for (uint256 i = 0; i < 100; i++) {
        if (topPlayers[i].playerAddress == user) {
            // Если старый результат хуже текущего, удаляем запись
            if (topPlayers[i].bestScore < playerScore) {
                for (uint256 j = i; j < 99; j++) {
                    topPlayers[j] = topPlayers[j + 1];
                }
                topPlayers[99] = IMainGrid.TopPlayer({
                    playerAddress: address(0),
                    bestScore: 0
                });
            } else {
                // Если результат не улучшился, ничего не делаем
                return;
            }
            break;
        }
    }

    // Обновляем топ игроков
    for (uint256 i = 0; i < 100; i++) {
        if (playerScore > topPlayers[i].bestScore) {
            for (uint256 j = 99; j > i; j--) {
                topPlayers[j] = topPlayers[j - 1];
            }
            topPlayers[i] = IMainGrid.TopPlayer({
                playerAddress: user,
                bestScore: playerScore
            });
            mainGrid.updateAllTopPlayers(topPlayers);

            // Если пользователь становится топ-1, создаем запись в хронике и задаем pendingChronicle
            if (i == 0) {
                uint256 recordId = mainGrid.nextRecordId();
                mainGrid.incrementNextRecordId(); // Увеличиваем `nextRecordId`

                // Добавляем временную запись в хронику
mainGrid.addChronicle(
    recordId,
    playerScore,
    user,
    "", // Имя будет заполнено позже
    "", // Сообщение будет заполнено позже
    block.timestamp // Передаем текущее время
);


                // Устанавливаем pendingChronicle для пользователя
                mainGrid.setPendingChronicle(user, recordId);
            }

            return;
        }
    }
}







    // Если результат игрока не входит в топ-100, ничего не делаем



































}//CCC

