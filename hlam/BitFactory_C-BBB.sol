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



interface IContractCCC {
    function meteoritfunction(uint256 frequencyFactorInCoal, address senderFromBBB, uint256 externalRandom) external;
    function removeTool(address senderFromBBB, uint256 x, uint256 y, uint256 unused) external;
}




































contract ContractBBB {
	
	
IContractCCC private ccc; // Интерфейс CCC
	IMainGrid private mainGrid;
	address public admin;
	uint256 public constant oreProbability = 20;
	
    // Параметры функции f(t) = a * e^(k * t) + 1, масштабированные на 1e18
    uint256 constant SCALE = 1e18; // Масштабирование для фиксированной точки
	
	    uint256 public aExponential = 1e18 ;         
    uint256 public kExponentialScaled = 2e15;  // 2e15 = 0.002	
	
	
	
	/*
    uint256 public aExponential = 1e16 ;         
    uint256 public kExponentialScaled = 8e14;  // 2e15 = 0.002	
	*/
	
	/*
	event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
	event MainGridAddressChanged(address indexed oldAddress, address indexed newAddress);
	event Debug(string message, uint256 value);
 // События для отладки и отслеживания
    event MeteoriteImpacted(string direction, uint256 x, uint256 y);
    event MeteoritePlaced(uint256 x, uint256 y);
*/
    // Константы направлений
	
	
	
	

    // Нонс для генерации случайных чисел
    uint256 private nonce;	// Модификатор для ограничения доступа администратору
	modifier onlyAdmin() {
		require(msg.sender == admin, "Not an admin");
		_;
	}




constructor(address mainGridAddress, address cccAddress) {
    require(mainGridAddress != address(0), "MainGrid address cannot be zero");
    require(cccAddress != address(0), "CCC address cannot be zero");

    mainGrid = IMainGrid(mainGridAddress); // Устанавливаем интерфейс MainGrid
    ccc = IContractCCC(cccAddress); // Устанавливаем интерфейс CCC
    admin = msg.sender; // Устанавливаем администратора
}

	
	
	
function validateRequire(IMainGrid.Depot memory depot) internal view {
    //require(block.timestamp - depot.blocktimestamp < 300, "Wait for the update");
    require(depot.isPaused == 0, "paused");
    require(depot.theEndCount > 100, "Game Over");
	//require(depot.early < 300, "Wait for the update");
}
	
	




    function setMainGrid(address mainGridAddress) external onlyAdmin {
        require(mainGridAddress != address(0), "MainGrid address cannot be zero");
        mainGrid = IMainGrid(mainGridAddress);
    }

    // Сеттер для CCC
    function setCCC(address cccAddress) external onlyAdmin {
        require(cccAddress != address(0), "CCC address cannot be zero");
        ccc = IContractCCC(cccAddress);
    }














function transferResourses(uint256 fromX, uint256 fromY, uint256 toX, uint256 toY) internal {
    // Проверяем координаты
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
    require(fromX < depot.gridSize && fromY < depot.gridSize, "Invalid source coordinates");
    require(toX < depot.gridSize && toY < depot.gridSize, "Invalid destination coordinates");

    // Проверяем переполнения для координат
    require(fromX >= 0 && fromY >= 0, "Underflow in source coordinates");
    require(toX >= 0 && toY >= 0, "Underflow in destination coordinates");
    require(fromX <= type(uint256).max && fromY <= type(uint256).max, "Overflow in source coordinates");
    require(toX <= type(uint256).max && toY <= type(uint256).max, "Overflow in destination coordinates");

    // Выполняем перенос ресурсов
    transferCoal(fromX, fromY, toX, toY);
    transferIron(fromX, fromY, toX, toY);
    transferIronPlate(fromX, fromY, toX, toY);
    transferComponents(fromX, fromY, toX, toY);
}


function transferCoal(uint256 fromX, uint256 fromY, uint256 toX, uint256 toY) internal {
    // Получаем данные ячеек через основной контракт
    IMainGrid.Cell memory source = mainGrid.getCell(msg.sender, fromX, fromY);
    IMainGrid.Cell memory destination = mainGrid.getCell(msg.sender, toX, toY);

    // Получаем максимальный размер Box через основной контракт
    //uint256 MaxBox = mainGrid.getMaxBox();

    // Проверяем, чтобы не произошло переполнения при вычислении доступного пространства
    require(destination.coalAmount <= type(uint256).max - destination.ironAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount <= type(uint256).max - destination.ironplateAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount + destination.ironplateAmount <= type(uint256).max - destination.componentsAmount, "Overflow in available space calculation");

    // Проверяем условия для переноса ресурсов
    if (
        (
            (
                keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Box")) &&
                destination.coalAmount < 50000 // Условие для Box
            ) || 
            (
                keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Furnace")) &&
                destination.coalAmount < 50000 
            )
        ) && (
            keccak256(abi.encodePacked(source.tool)) == keccak256(abi.encodePacked("Drill")) ||
            keccak256(abi.encodePacked(source.tool)) == keccak256(abi.encodePacked("Box"))
        )
    ) {
		
		
		
		
uint256 resourceToMove = source.coalAmount / 3;

// Проверяем, что целевая ячейка не переполняется при добавлении ресурсов
require(destination.coalAmount <= type(uint256).max - resourceToMove, "Overflow in resource transfer calculation");

// Переносим все доступные ресурсы
mainGrid.updateCoalAmount(msg.sender, toX, toY, destination.coalAmount + resourceToMove);

// Уменьшаем количество ресурсов в исходной ячейке
mainGrid.updateCoalAmount(msg.sender, fromX, fromY, source.coalAmount - resourceToMove);





    }
}


function transferIron(uint256 fromX, uint256 fromY, uint256 toX, uint256 toY) internal {
    // Получаем данные ячеек через основной контракт
    IMainGrid.Cell memory source = mainGrid.getCell(msg.sender, fromX, fromY);
    IMainGrid.Cell memory destination = mainGrid.getCell(msg.sender, toX, toY);

    // Получаем максимальный размер Box через основной контракт
    //uint256 MaxBox = mainGrid.getMaxBox();

    // Проверяем, чтобы не произошло переполнения при вычислении доступного пространства
    require(destination.coalAmount <= type(uint256).max - destination.ironAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount <= type(uint256).max - destination.ironplateAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount + destination.ironplateAmount <= type(uint256).max - destination.componentsAmount, "Overflow in available space calculation");

    // Проверяем условия для переноса ресурсов
    if (
        (
            (
                keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Box")) &&
                destination.ironAmount < 50000 // Условие для Box
            ) || 
            (
                keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Furnace")) &&
                destination.ironAmount < 50000 && // Условие для Furnace
                destination.ironplateAmount < 5000
            )
        ) && (
            keccak256(abi.encodePacked(source.tool)) == keccak256(abi.encodePacked("Drill")) ||
            keccak256(abi.encodePacked(source.tool)) == keccak256(abi.encodePacked("Box"))
        )
    ) {
uint256 resourceToMove = source.ironAmount / 3;

// Проверяем, что целевая ячейка не переполняется при добавлении ресурсов
require(destination.ironAmount <= type(uint256).max - resourceToMove, "Overflow in resource transfer calculation");

// Переносим все доступные ресурсы
mainGrid.updateIronAmount(msg.sender, toX, toY, destination.ironAmount + resourceToMove);

// Уменьшаем количество ресурсов в исходной ячейке
mainGrid.updateIronAmount(msg.sender, fromX, fromY, source.ironAmount - resourceToMove);

    }
}



function transferIronPlate(uint256 fromX, uint256 fromY, uint256 toX, uint256 toY) internal {
    // Получаем данные ячеек через основной контракт
    IMainGrid.Cell memory source = mainGrid.getCell(msg.sender, fromX, fromY);
    IMainGrid.Cell memory destination = mainGrid.getCell(msg.sender, toX, toY);

    // Получаем максимальный размер Box через основной контракт
   // uint256 MaxBox = mainGrid.getMaxBox();

    // Проверяем, чтобы не произошло переполнения при вычислении доступного пространства
    require(destination.coalAmount <= type(uint256).max - destination.ironAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount <= type(uint256).max - destination.ironplateAmount, "Overflow in available space calculation");
    require(destination.coalAmount + destination.ironAmount + destination.ironplateAmount <= type(uint256).max - destination.componentsAmount, "Overflow in available space calculation");

    // Проверяем условия для переноса ресурсов
    if (
        keccak256(abi.encodePacked(source.factorySettings)) != keccak256(abi.encodePacked("componentsF")) && // Проверка source
        (
            (
                keccak256(abi.encodePacked(destination.factorySettings)) == keccak256(abi.encodePacked("componentsF")) &&
				destination.componentsAmount < 500
            ) ||
            keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Box")) ||
            keccak256(abi.encodePacked(destination.factorySettings)) == keccak256(abi.encodePacked("wallF"))
        ) &&
        destination.ironplateAmount < 5000
    ) {
uint256 resourceToMove = source.ironplateAmount / 3;

// Проверяем, что целевая ячейка не переполняется при добавлении ресурсов
require(destination.ironplateAmount <= type(uint256).max - resourceToMove, "Overflow in resource transfer calculation");

// Переносим все доступные ресурсы
mainGrid.updateIronplateAmount(msg.sender, toX, toY, destination.ironplateAmount + resourceToMove);

// Уменьшаем количество ресурсов в исходной ячейке
mainGrid.updateIronplateAmount(msg.sender, fromX, fromY, source.ironplateAmount - resourceToMove);

    }
}
/*
// Define events for logging before and after the transfer
event TransferComponentsBefore(
    address indexed user,
    uint256 fromX,
    uint256 fromY,
    uint256 toX,
    uint256 toY,
    uint256 sourceComponentsAmount,
    uint256 destinationComponentsAmount
);

event TransferComponentsAfter(
    address indexed user,
    uint256 fromX,
    uint256 fromY,
    uint256 toX,
    uint256 toY,
    uint256 transferredAmount,
    uint256 newSourceComponentsAmount,
    uint256 newDestinationComponentsAmount
);

*/


	function transferComponents(
    uint256 fromX,
    uint256 fromY,
    uint256 toX,
    uint256 toY
) internal {
    // Получаем данные ячеек через основной контракт
    IMainGrid.Cell memory source = mainGrid.getCell(msg.sender, fromX, fromY);
    IMainGrid.Cell memory destination = mainGrid.getCell(msg.sender, toX, toY);
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

    // Получаем максимальный размер Box через основной контракт
   // uint256 MaxBox = mainGrid.getMaxBox();

    // Проверяем условия для переноса ресурсов
    if (
        (
            (
                keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Factory")) &&
                keccak256(abi.encodePacked(destination.factorySettings)) != keccak256(abi.encodePacked("componentsF"))
            ) || 
            keccak256(abi.encodePacked(destination.tool)) == keccak256(abi.encodePacked("Box"))
        ) 
        &&
        (
            keccak256(abi.encodePacked(source.factorySettings)) == keccak256(abi.encodePacked("componentsF")) ||
            keccak256(abi.encodePacked(source.tool)) == keccak256(abi.encodePacked("Box"))
        )
        &&
        (
            keccak256(abi.encodePacked(destination.factorySettings)) != keccak256(abi.encodePacked("bulldozerF")) ||
            depot.bulldozerAmount <= 50
        )
        &&
        (
            keccak256(abi.encodePacked(destination.factorySettings)) != keccak256(abi.encodePacked("wallF")) ||
            depot.wallAmount <= 50
        )
        &&
        (
            keccak256(abi.encodePacked(destination.factorySettings)) != keccak256(abi.encodePacked("furnaceF")) ||
            depot.furnaceAmount <= 50
        )
        &&
        destination.componentsAmount < 500
    ) {
        uint256 resourceToMove = source.componentsAmount / 3;

        // Проверяем, что целевая ячейка не переполняется при добавлении ресурсов
        require(
            destination.componentsAmount <= type(uint256).max - resourceToMove,
            "Overflow in resource transfer calculation"
        );
/*
        // Emit the "before" event
        emit TransferComponentsBefore(
            msg.sender,
            fromX,
            fromY,
            toX,
            toY,
            source.componentsAmount,
            destination.componentsAmount
        );*/

        // Переносим все доступные ресурсы
        mainGrid.updateComponentsAmount(
            msg.sender,
            toX,
            toY,
            destination.componentsAmount + resourceToMove
        );

        // Уменьшаем количество ресурсов в исходной ячейке
        mainGrid.updateComponentsAmount(
            msg.sender,
            fromX,
            fromY,
            source.componentsAmount - resourceToMove
        );
/*
        // Emit the "after" event
        emit TransferComponentsAfter(
            msg.sender,
            fromX,
            fromY,
            toX,
            toY,
            resourceToMove,
            source.componentsAmount - resourceToMove,
            destination.componentsAmount + resourceToMove
        );*/
    }
}






function removeTool(uint256 x, uint256 y, uint256 unused) public {
    // Передаем вызов в контракт CCC через интерфейс
    ccc.removeTool(msg.sender, x, y, unused);
}

	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	















































function updateCoal(uint256 externalRandom) public {
    address user = msg.sender;

    // Получаем данные депо и размер сетки
    IMainGrid.Depot memory depot = mainGrid.getDepot(user);
    require(depot.isPaused == 0, "paused");
    require(depot.theEndCount > 100, "Game Over");

    uint256 gridSize = depot.gridSize;
    require(gridSize > 0, "Grid size must be greater than zero");
    require(gridSize <= type(uint256).max / gridSize, "Overflow in totalCells calculation");

    // Вычисляем частоту вызова meteorit
    uint256 frequencyFactorInCoal;
    if (depot.gotoLevel == 110) {
        require(depot.normalizedTime <= type(uint256).max / SCALE, "Overflow in normalizedTime scaling");
        frequencyFactorInCoal = f(depot.normalizedTime * SCALE); // Вызываем f(), если gotoLevel равен 101
    } else if (depot.gotoLevel == 100) {
        frequencyFactorInCoal = 1 + SCALE; // Устанавливаем значение 1, если gotoLevel равен 100
    } else {
        revert("Invalid gotoLevel"); // Реверт для других значений
    }

    require(frequencyFactorInCoal > SCALE, "Frequency factor must be > 1e18");

    // Проверяем и вызываем функцию метеорита при необходимости
    uint256 maxMeteors = depot.iterationLimitDepot; // Максимальное количество вызовов meteoritfunction за один раз
    uint256 meteorCount = 0;

    while (_shouldCallMeteorit(depot) && meteorCount < maxMeteors) {
        require(externalRandom + meteorCount >= externalRandom, "Overflow in externalRandom calculation");
        ccc.meteoritfunction(frequencyFactorInCoal, msg.sender, externalRandom + meteorCount);
        meteorCount++;
        depot = mainGrid.getDepot(user);
    }

if (!_shouldCallMeteorit(depot)) {
    mainGrid.updateDepotMeteorsProcessed(msg.sender, true); // Устанавливаем флаг
}

    // Вычисляем индексы ячеек
    uint256 totalCells = gridSize * gridSize;
    require(totalCells > 0, "Total cells must be greater than zero");
    require(totalCells <= type(uint256).max, "Overflow in total cells calculation");

    uint256[] memory indices = _generateShuffledIndices(externalRandom, totalCells);

    // Обработка ячеек
    uint256 maxBox = 150000;
    _processCells(user, indices, gridSize, maxBox);

    // Обновляем временные метки и параметры депо
    require(block.timestamp >= depot.lastUpdateTime, "Invalid timestamp");
    mainGrid.updateDepotBlockTimestamp(user, block.timestamp);
    mainGrid.updateDepotFrequencyFactor(msg.sender, frequencyFactorInCoal);

    uint256 earlyUpdate = block.timestamp - depot.pausedDuration - (depot.lastmeteoritTimeChecked / 10**6);
    require(block.timestamp >= depot.pausedDuration + (depot.lastmeteoritTimeChecked / 10**6), "Underflow in early update calculation");

    mainGrid.updateDepotEarly(msg.sender, earlyUpdate);

    if (depot.allMeteorsProcessed) {
		
        uint256 elapsedTime = block.timestamp - depot.lastUpdateTime;


        uint256 updatedNormalizedTime = depot.normalizedTime + elapsedTime * depot.speedkoef;
		
		
		
        mainGrid.updateDepotLastUpdateTime(msg.sender, block.timestamp);
		
		if (depot.gotoLevel == 100){
			updatedNormalizedTime = 1;
		}
		
        mainGrid.updateDepotNormalizedTime(msg.sender, updatedNormalizedTime);
    }
}










function _shouldCallMeteorit(IMainGrid.Depot memory depot) internal view returns (bool) {
    // Проверяем корректность масштабирования
    require(depot.pausedDuration <= type(uint256).max / (10**6 * SCALE), "Paused duration scaling overflow");
    require(depot.lastmeteoritTimeChecked <= type(uint256).max / (10**6 * SCALE), "Last meteorit time scaling overflow");
    require(block.timestamp <= type(uint256).max / (10**6 * SCALE), "Block timestamp scaling overflow");

    // Масштабируем значения
    uint256 scaledPausedDuration = depot.pausedDuration * 10**6 * SCALE;
    uint256 scaledLastMeteoritTimeChecked = depot.lastmeteoritTimeChecked * SCALE;
    uint256 scaledBlockTimestamp = block.timestamp * 10**6 * SCALE;

    // Проверяем переполнение при сложении
    require(scaledPausedDuration <= type(uint256).max - scaledLastMeteoritTimeChecked, "Time sum overflow");

    // Рассчитываем предел времени
    uint256 ttrequiredTime = scaledPausedDuration + scaledLastMeteoritTimeChecked;

    // Проверяем, что текущий блок превышает требуемое время
    require(scaledBlockTimestamp >= ttrequiredTime, "Time comparison failed");

    // Проверяем скорость и mmmTime
    require(depot.speedkoef > 0, "Speed coefficient must be greater than zero");
    require(depot.mmmtime / depot.speedkoef > 0, "Division overflow risk in mmmtime calculation");

    // Прямое сравнение без вычитания
    return (scaledBlockTimestamp > ttrequiredTime + depot.mmmtime * SCALE / depot.speedkoef);
}




    // Генерация и перемешивание индексов ячеек
    function _generateShuffledIndices(uint256 externalRandom, uint256 totalCells) internal view returns (uint256[] memory) {
		
        require(totalCells > 0, "Total cells must be greater than zero");

        uint256[] memory indices = new uint256[](totalCells);
        for (uint256 i = 0; i < totalCells; i++) {
            indices[i] = i;
        }

        for (uint256 i = totalCells - 1; i > 0; i--) {
            require(i + 1 > 0, "Overflow in index calculation");
            uint256 j = uint256(
                keccak256(
                    abi.encodePacked(externalRandom, block.timestamp, block.prevrandao, i)
                )
            ) % (i + 1);
            (indices[i], indices[j]) = (indices[j], indices[i]);
        }

        return indices;
    }

    // Обработка ячеек и сбор обновленных данных
function _processCells(
    address user,
    uint256[] memory indices,
    uint256 gridSize,
    //IMainGrid.Depot memory depot,
    uint256 maxBox
) internal {
    require(gridSize > 0, "Grid size must be greater than zero");

    for (uint256 iter = 0; iter < gridSize * gridSize; iter++) {
        uint256 index = indices[iter];
        require(index < gridSize * gridSize, "Index out of bounds");
        (uint256 x, uint256 y) = _getCoordinates(index, gridSize);

        IMainGrid.Cell memory cell = mainGrid.getCell(user, x, y);

        // Фильтруем неактуальные ячейки
        if (_isCellIrrelevant(cell)) {
            continue;
        }

        // Обрабатываем логику ячейки
        _handleCellLogic(cell, x, y, maxBox);
    }
}



// Получение координат x и y из индекса
function _getCoordinates(uint256 index, uint256 gridSize) internal pure returns (uint256 x, uint256 y) {
    require(gridSize > 0, "Grid size must be greater than zero");
    x = index % gridSize;
    y = index / gridSize;
}

// Проверка, является ли ячейка неактуальной
function _isCellIrrelevant(IMainGrid.Cell memory cell) internal pure returns (bool) {
    bytes32 toolHash = keccak256(abi.encodePacked(cell.tool));
    return (
        toolHash == keccak256(abi.encodePacked("toolEmpty")) ||
        toolHash == keccak256(abi.encodePacked("Space")) ||
        toolHash == keccak256(abi.encodePacked("Ruins")) ||
        toolHash == keccak256(abi.encodePacked("Wall"))
    );
}

// Обработка логики ячейки
function _handleCellLogic(
    IMainGrid.Cell memory cell,
    uint256 x,
    uint256 y,
    //IMainGrid.Depot memory depot,
    uint256 maxBox
) internal {
   require(maxBox > 0, "Max box must be greater than zero");
   
   
    if (keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Man"))) {
        _handleManType(x, y);
    }
	
	
    // Проверяем, что tool равен "Drill", перед запуском _handleContent
    if (keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Drill"))) {
        _handleContent(maxBox, x, y);
    }
	
	
    // Проверяем, что tool равен "Furnace" или "Factory", перед запуском _handleProductionBuildings
    if (
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Furnace")) ||
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Factory"))
    ) {
        _handleProductionBuildings(x, y);
    }
	
	
	
}

// Обработка типа человека
function _handleManType(uint256 x, uint256 y) internal {
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
    //IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
    bytes32 manType = keccak256(abi.encodePacked(cell.man));
    if (manType != keccak256(abi.encodePacked("manEmpty"))) {
        if (manType == keccak256(abi.encodePacked("LR"))) {
            require(x > 0, "Invalid x-coordinate for transfer");
            transferResourses(x - 1, y, x + 1, y);
        } else if (manType == keccak256(abi.encodePacked("RL"))) {
            require(x + 1 > x, "Overflow in x-coordinate for transfer");
            transferResourses(x + 1, y, x - 1, y);
        } else if (manType == keccak256(abi.encodePacked("UD"))) {
            require(y + 1 > y, "Overflow in y-coordinate for transfer");
            transferResourses(x, y + 1, x, y - 1);
        } else if (manType == keccak256(abi.encodePacked("DU"))) {
            require(y > 0, "Invalid y-coordinate for transfer");
            transferResourses(x, y - 1, x, y + 1);
        }
    }
}

    // Обработка содержания ячейки (уголь, железо)
function _handleContent(
    uint256 maxBox,
    uint256 x,
    uint256 y
) internal {
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

        bytes32 toolHash = keccak256(abi.encodePacked(cell.tool));
        bytes32 contentHash = keccak256(abi.encodePacked(cell.content));

        if (toolHash == keccak256(abi.encodePacked("Drill"))) {
			
            if (contentHash == keccak256(abi.encodePacked("Coal"))) {
				
uint256 elapsedTime = block.timestamp - depot.pausedDuration - cell.lastTimeChecked;

// Проверяем, чтобы `block.timestamp >= cell.lastTimeChecked`
require(block.timestamp >= cell.lastTimeChecked, "Invalid timestamp: time travel detected");

// Проверяем, что `elapsedTime` умещается в допустимый диапазон для последующих вычислений
require(elapsedTime <= type(uint256).max / (depot.mmmdrillSpeed * depot.speedkoef), "Overflow risk in elapsedTime calculation");

// Проверяем, чтобы результат умножения `depot.mmmdrillSpeed * depot.speedkoef` умещался в диапазон
require(depot.mmmdrillSpeed <= type(uint256).max / depot.speedkoef, "Overflow risk in drill speed calculation");

uint256 coalIncrement = elapsedTime * (depot.mmmdrillSpeed * depot.speedkoef);

// Проверяем, чтобы итоговое значение `newCoalAmount` не вызвало переполнения
require(cell.coalAmount <= type(uint256).max - coalIncrement, "Overflow risk in coal amount calculation");

uint256 newCoalAmount = cell.coalAmount + coalIncrement;

// Ограничиваем значение `newCoalAmount` до `maxBox`
cell.coalAmount = newCoalAmount > maxBox ? maxBox : newCoalAmount;

// Обновляем `lastTimeChecked`
cell.lastTimeChecked = block.timestamp - depot.pausedDuration;
mainGrid.updateLastTimeChecked(msg.sender, x, y, cell.lastTimeChecked);	
            mainGrid.updateCoalAmount(msg.sender, x, y, cell.coalAmount);
      
            }

            if (contentHash == keccak256(abi.encodePacked("Iron"))) {
				
uint256 elapsedTime = block.timestamp - depot.pausedDuration - cell.lastTimeChecked;

// Проверяем, чтобы `block.timestamp >= cell.lastTimeChecked`
require(block.timestamp >= cell.lastTimeChecked, "Invalid timestamp: time travel detected");

// Проверяем, что `elapsedTime` умещается в допустимый диапазон для последующих вычислений
require(elapsedTime <= type(uint256).max / (depot.mmmdrillSpeed * depot.speedkoef), "Overflow risk in elapsedTime calculation");

// Проверяем, чтобы результат умножения `depot.mmmdrillSpeed * depot.speedkoef` умещался в диапазон
require(depot.mmmdrillSpeed <= type(uint256).max / depot.speedkoef, "Overflow risk in drill speed calculation");

uint256 ironIncrement = elapsedTime * (depot.mmmdrillSpeed * depot.speedkoef);

// Проверяем, чтобы итоговое значение `newIronAmount` не вызвало переполнения
require(cell.ironAmount <= type(uint256).max - ironIncrement, "Overflow risk in iron amount calculation");

uint256 newIronAmount = cell.ironAmount + ironIncrement;

// Ограничиваем значение `newIronAmount` до `maxBox`
cell.ironAmount = newIronAmount > maxBox ? maxBox : newIronAmount;

// Обновляем `lastTimeChecked`
cell.lastTimeChecked = block.timestamp - depot.pausedDuration;
mainGrid.updateLastTimeChecked(msg.sender, x, y, cell.lastTimeChecked);	
            mainGrid.updateIronAmount(msg.sender, x, y, cell.ironAmount);
            }
        }
		
		
		
		
    }
function handleProductionBuildings(uint256 x, uint256 y) internal {
    _handleProductionBuildings(x, y);
}// Обработка производственных построек (печь, фабрика)


function _handleProductionBuildings(
    uint256 x,
    uint256 y
) internal {

    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);	
    bytes32 toolHash = keccak256(abi.encodePacked(cell.tool));

    // Обработка печи
    if (toolHash == keccak256(abi.encodePacked("Furnace")) && cell.coalAmount >= 10 && cell.ironAmount >= 10) {
        uint256 coalUsed = 10;
        uint256 ironUsed = 10;
        uint256 ironPlateProduced = 1;
        while (cell.coalAmount >= coalUsed && cell.ironAmount >= ironUsed) {
           // require(cell.coalAmount >= coalUsed, "Insufficient coal");
           // require(cell.ironAmount >= ironUsed, "Insufficient iron");
           // require(cell.ironplateAmount <= type(uint256).max - ironPlateProduced, "Ironplate overflow");

            cell.coalAmount -= coalUsed;
            cell.ironAmount -= ironUsed;
            cell.ironplateAmount += ironPlateProduced;
        }
    }

    // Обработка фабрики для компонентов
    if (
        toolHash == keccak256(abi.encodePacked("Factory")) &&
        keccak256(abi.encodePacked(cell.factorySettings)) == keccak256(abi.encodePacked("componentsF")) &&
        cell.ironplateAmount >= 10
    ) {
        while (cell.ironplateAmount >= 10) {
          //  require(cell.ironplateAmount >= 10, "Insufficient ironplates");
          //  require(cell.componentsAmount <= type(uint256).max - 1, "Components overflow");

            cell.ironplateAmount -= 10;
            cell.componentsAmount += 1;
        }
    }

    if (
        toolHash == keccak256(abi.encodePacked("Factory")) &&
        keccak256(abi.encodePacked(cell.factorySettings)) == keccak256(abi.encodePacked("wallF")) &&
        cell.componentsAmount >= 50 && 
        depot.furnaceAmount >= 5 &&
        cell.ironplateAmount >= 1000
    ) {
uint256 maxIterations = 1000; // Максимальное количество итераций
uint256 iterations = 0;     // Счетчик итераций

while (
    cell.componentsAmount >= 50 &&
    depot.furnaceAmount >= 5 &&
    cell.ironplateAmount >= 1000 &&
    depot.wallAmount <= 100 &&
    iterations < maxIterations
) {
    // Проверка, что значение компонентов достаточно для вычитания
    require(cell.componentsAmount >= 50, "Not enough components to subtract");
    // Проверка, что количество печей достаточно для вычитания
    require(depot.furnaceAmount >= 5, "Not enough furnaces to subtract");
    // Проверка, что количество железных пластин достаточно для вычитания
    require(cell.ironplateAmount >= 1000, "Not enough iron plates to subtract");
    // Проверка, что увеличение стен не вызывает переполнения
    require(depot.wallAmount <= type(uint256).max - 2, "Wall amount overflow");

    // Обновление значений
    cell.componentsAmount -= 50;
    depot.furnaceAmount -= 5;
    cell.ironplateAmount -= 1000;
    depot.wallAmount += 2;

    // Проверка итерации перед увеличением
    require(iterations < type(uint256).max, "Iteration count overflow");
    iterations++; // Увеличиваем счетчик итераций
}




    }

    // Обработка фабрики для различных настроек
    if (
        toolHash == keccak256(abi.encodePacked("Factory")) &&
        cell.componentsAmount >= 10 &&
        keccak256(abi.encodePacked(cell.factorySettings)) != keccak256(abi.encodePacked("componentsF")) &&
        keccak256(abi.encodePacked(cell.factorySettings)) != keccak256(abi.encodePacked("factorySettingsEmptyF"))
    ) {
        bytes32 factorySettingsHash = keccak256(abi.encodePacked(cell.factorySettings));
		
		
		
		
while (true) {
    if (factorySettingsHash == keccak256(abi.encodePacked("bulldozerF"))) {
        if (cell.componentsAmount >= 100) {
            require(depot.bulldozerAmount <= type(uint256).max - 1, "Bulldozer overflow");
            cell.componentsAmount -= 100;
            depot.bulldozerAmount += 1;
        } else {
            break; // Выход из цикла, если компонентов недостаточно
        }
    } else if (cell.componentsAmount >= 10) {
        require(depot.drillsAmount <= type(uint256).max - 1, "Depot overflow");

        cell.componentsAmount -= 10;
        if (factorySettingsHash == keccak256(abi.encodePacked("drillsF"))) {
            depot.drillsAmount += 1;
        } else if (factorySettingsHash == keccak256(abi.encodePacked("boxesF"))) {
            depot.boxesAmount += 1;
        } else if (factorySettingsHash == keccak256(abi.encodePacked("mansF"))) {
            depot.mansAmount += 1;
        } else if (factorySettingsHash == keccak256(abi.encodePacked("furnaceF"))) {
            depot.furnaceAmount += 1;
        } else if (factorySettingsHash == keccak256(abi.encodePacked("factoryF"))) {
            depot.factoryAmount += 1;
        } else if (factorySettingsHash == keccak256(abi.encodePacked("wallF"))) {
			cell.componentsAmount += 10;
            break; // Пропуск действия
			
        } else {
            cell.componentsAmount += 10; // Восстановление компонентов
            revert("Operation terminated: invalid factory setting");
        }
    } else {
        break; // Выход из цикла, если компонентов недостаточно
    }
}

		
		
		
		
    }
	
mainGrid.updateCoalAmount(msg.sender, x, y, cell.coalAmount);
mainGrid.updateIronAmount(msg.sender, x, y, cell.ironAmount);
mainGrid.updateIronplateAmount(msg.sender, x, y, cell.ironplateAmount);
mainGrid.updateComponentsAmount(msg.sender, x, y, cell.componentsAmount);

mainGrid.updateDepotFurnaceAmount(msg.sender, depot.furnaceAmount);
mainGrid.updateDepotWallAmount(msg.sender, depot.wallAmount);
mainGrid.updateDepotBulldozerAmount(msg.sender, depot.bulldozerAmount);
mainGrid.updateDepotDrillsAmount(msg.sender, depot.drillsAmount);
mainGrid.updateDepotBoxesAmount(msg.sender, depot.boxesAmount);
mainGrid.updateDepotMansAmount(msg.sender, depot.mansAmount);
mainGrid.updateDepotFactoryAmount(msg.sender, depot.factoryAmount);
	
	
}

/*
// Обновление mainGrid с обновленными данными ячеек
function _updateMainGrid(
    address user,
    uint256[] memory indices,
    IMainGrid.Cell[] memory updatedCells,
    bool[] memory isUpdated,
    uint256 gridSize,
    uint256 totalCells
) internal {
	}
	*/
	/*
    for (uint256 iter = 0; iter < totalCells; iter++) {
        if (isUpdated[iter]) {
            uint256 index = indices[iter];
            (uint256 x, uint256 y) = _getCoordinates(index, gridSize);
            IMainGrid.Cell memory cell = updatedCells[iter];

            require(cell.coalAmount <= type(uint256).max, "Coal amount overflow");
            require(cell.ironAmount <= type(uint256).max, "Iron amount overflow");
            require(cell.ironplateAmount <= type(uint256).max, "Ironplate amount overflow");
            require(cell.componentsAmount <= type(uint256).max, "Components amount overflow");

           //mainGrid.updateCoalAmount(user, x, y, cell.coalAmount);
           //mainGrid.updateIronAmount(user, x, y, cell.ironAmount);
           //mainGrid.updateIronplateAmount(user, x, y, cell.ironplateAmount);
          // mainGrid.updateComponentsAmount(user, x, y, cell.componentsAmount);
          // mainGrid.updateLastTimeChecked(user, x, y, cell.lastTimeChecked);
        }
    }
}
*/
// Обновление количеств в депо
/*
function _updateDepotAmounts(address user, IMainGrid.Depot memory depot) internal {
	
    require(depot.drillsAmount <= type(uint256).max, "Drills amount overflow");
    require(depot.boxesAmount <= type(uint256).max, "Boxes amount overflow");
    require(depot.mansAmount <= type(uint256).max, "Mans amount overflow");
    require(depot.furnaceAmount <= type(uint256).max, "Furnace amount overflow");
    require(depot.bulldozerAmount <= type(uint256).max, "Bulldozer amount overflow");
    require(depot.factoryAmount <= type(uint256).max, "Factory amount overflow");
    require(depot.wallAmount <= type(uint256).max, "Wall amount overflow");

    mainGrid.updateDepotDrillsAmount(user, depot.drillsAmount);
    mainGrid.updateDepotBoxesAmount(user, depot.boxesAmount);
    mainGrid.updateDepotMansAmount(user, depot.mansAmount);
    mainGrid.updateDepotFurnaceAmount(user, depot.furnaceAmount);
    mainGrid.updateDepotBulldozerAmount(user, depot.bulldozerAmount);
    mainGrid.updateDepotFactoryAmount(user, depot.factoryAmount);
    mainGrid.updateDepotWallAmount(user, depot.wallAmount); // Добавляем обновление стен
}

*/


/*


// * @dev Вычисляет e^x, где x масштабировано на 1e18.
 //* Используется разложение в ряд Тейлора до 20-го члена.
 //* @param x Масштабированное значение x (1e18 = 1).
 //* @return result Масштабированное значение e^x (1e18 = 1).

function exp(uint256 x) internal pure returns (uint256) {
    // Разложение в ряд Тейлора для e^x
    // e^x = 1 + x + x^2/2! + x^3/3! + ... + x^20/20!
    uint256 result = SCALE; // 1 * SCALE
    uint256 term = SCALE;   // Начальный термин: 1 * SCALE

    require(x <= type(uint256).max / SCALE, "Input x too large: multiplication with SCALE will overflow");

    for (uint8 i = 1; i <= 40; i++) { // Увеличено до 20-го члена
        // Проверка на переполнение при умножении term * x
        require(term <= type(uint256).max / x, "Overflow during term multiplication");
        term = (term * x) / SCALE; // Умножаем на x и масштабируем

        // Проверка деления на ноль (неактуально для i, так как i начинается с 1)
        require(i > 0, "Division by zero: i is zero");

        // Проверка на арифметическое переполнение при делении term / i
        require(term >= i, "Underflow during division by factorial");
        term = term / i;            // Делим на факториал

        // Проверка на переполнение при добавлении result + term
        require(result <= type(uint256).max - term, "Overflow during result addition");
        result += term;             // Добавляем к результату

        // Проверка на выход за пределы допустимых значений term
        require(term <= result, "Term exceeds result during iteration");
    }

    // Проверка на переполнение итогового результата
    require(result >= SCALE, "Underflow or invalid result for exp");
    
    return result;
}



// * @dev Вычисляет функцию f(t) = a * e^(k * t) + 1.
 //* @param tScaled Масштабированное значение t (1e18 = 1).
 //* @return fResult Масштабированное значение f(t) (1e18 = 1).

function f(uint256 tScaled) public view returns (uint256) {
    // Проверка, чтобы tScaled не превышал допустимый диапазон для расчёта
    require(tScaled <= type(uint256).max / SCALE, "Input tScaled too large");

    // Вычисляем k * t, масштабированное на SCALE
    require(tScaled <= type(uint256).max / kExponentialScaled, "Overflow during multiplication of k and t");
    uint256 kt = (kExponentialScaled * tScaled) / SCALE;

    // Проверяем корректность вычисленного значения kt
    require(kt >= kExponentialScaled, "Underflow in kt calculation");

    // Вычисляем e^(k * t)
    uint256 ekt = exp(kt);

    // Проверяем корректность вычисленного значения ekt
    require(ekt >= SCALE, "Invalid result from exp(kt)");

    // Вычисляем a * e^(k * t), масштабированное на SCALE
    require(aExponential <= type(uint256).max / ekt, "Overflow during multiplication of a and e^kt");
    uint256 a_eckt = (aExponential * ekt) / SCALE;

    // Проверяем корректность вычисленного значения a_eckt
    require(a_eckt >= aExponential, "Underflow in a * e^(k * t) calculation");

    // 1, масштабированное на SCALE
    uint256 one = SCALE;

    // Возвращаем f(t) = a * e^(k * t) + 1, масштабированное на SCALE
    require(a_eckt <= type(uint256).max - one, "Overflow during addition of a*e^kt and 1");
    return a_eckt + one;
}


*/





function f(uint256 tScaled) internal view returns (uint256) {
    uint256 result;

    // Проверка на переполнение при умножении kExponentialScaled * tScaled
    require(tScaled <= type(uint256).max / kExponentialScaled, "Overflow during multiplication of k and t");
    uint256 scaledProduct = (kExponentialScaled * tScaled) / SCALE;

    // Проверка на переполнение при добавлении aExponential
    require(scaledProduct <= type(uint256).max - aExponential, "Overflow during addition of k*t and a");

    // Вычисление результата
    result = scaledProduct + aExponential;

    return result;
}

































}
//BBB
