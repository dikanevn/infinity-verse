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
	
	
	
	
	
	
	
	
	
    function updateDepotPart1(
        address user,
		uint256 gridSize,
        uint256 drillsAmount,
        uint256 boxesAmount,
        uint256 mansAmount,
        uint256 furnaceAmount,
        uint256 factoryAmount,
		uint256 wallAmount
    ) external;

    // Вторая часть обновления депо
    function updateDepotPart2(
        address user,
        uint256 starttimee,
        uint256 lastmeteoritTimeChecked,
        uint256 blocktimestamp,
        uint256 bulldozerAmount,
        uint256 early,
        uint256 mmmtime,
        uint256 mmmdrillSpeed,
        uint256 iterationLimitDepot,
		uint256 isPaused,
		uint256 pausedDuration,
		uint256 pauseStartTime
		
		
    ) external;
}















































contract ContractAAA {
    IMainGrid private mainGrid;
    address public admin;
    uint256 public constant oreProbability = 20;

    // События
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event MainGridAddressChanged(address indexed oldAddress, address indexed newAddress);

    // Модификатор для ограничения доступа администратору
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not an admin");
        _;
    }

    // Конструктор для установки администратора и адреса основного контракта
    constructor(address mainGridAddress) {
        require(mainGridAddress != address(0), "MainGrid address cannot be zero");
        mainGrid = IMainGrid(mainGridAddress);
        admin = msg.sender; // Устанавливаем администратора
		
    }




// Объявление события
event GridInitialized(address indexed user, uint256 timestamp);

function initializeGrid(uint256 /* unused */) external {
    for (uint256 x = 0; x < 10; x++) {
        for (uint256 y = 0; y < 10; y++) {
            initializeCell(msg.sender, x, y);
        }
    }

    updateDepotInitialSettings(msg.sender);

    // Эмит события
    //emit GridInitialized(msg.sender, block.timestamp);
}


function initializeCell(address user, uint256 x, uint256 y) internal {
    uint256 random = generateRandom(x, y, user);

    string memory tool = "toolEmpty";
    uint256 coalAmount = 0;
    uint256 lastTimeChecked = block.timestamp;
    string memory man = "manEmpty";
    uint256 ironAmount = 0;
    uint256 ironplateAmount = 0;
    uint256 componentsAmount = 0;
    string memory factorySettings = "factorySettingsEmptyF";
    string memory previouscontent = "contentEmpty";
    uint256 wallPowerAmount = 0;

    updateCellBaseProperties(user, x, y, tool, coalAmount, lastTimeChecked, man, ironAmount, ironplateAmount, componentsAmount, factorySettings, previouscontent, wallPowerAmount);
    updateCellContentBasedOnProbability(user, x, y, random);
    initializeSpecialCells(user, x, y);
}

function updateCellBaseProperties(
    address user,
    uint256 x,
    uint256 y,
    string memory tool,
    uint256 coalAmount,
    uint256 lastTimeChecked,
    string memory man,
    uint256 ironAmount,
    uint256 ironplateAmount,
    uint256 componentsAmount,
    string memory factorySettings,
    string memory previouscontent,
    uint256 wallPowerAmount
) internal {
    mainGrid.updateTool(user, x, y, tool);
    mainGrid.updateCoalAmount(user, x, y, coalAmount);
    mainGrid.updateLastTimeChecked(user, x, y, lastTimeChecked);
    mainGrid.updateMan(user, x, y, man);
    mainGrid.updateIronAmount(user, x, y, ironAmount);
    mainGrid.updateIronplateAmount(user, x, y, ironplateAmount);
    mainGrid.updateComponentsAmount(user, x, y, componentsAmount);
    mainGrid.updateFactorySettings(user, x, y, factorySettings);
    mainGrid.updatePreviousContent(user, x, y, previouscontent);
    mainGrid.updateWallPowerAmount(user, x, y, wallPowerAmount);
}

function updateCellContentBasedOnProbability(address user, uint256 x, uint256 y, uint256 random) internal {
    if (random < oreProbability * 2) {
        if (random < oreProbability) {
            mainGrid.updateContent(user, x, y, "contentEmpty");
        } else {
            mainGrid.updateContent(user, x, y, "contentEmpty");
        }
    } else {
        mainGrid.updateContent(user, x, y, "contentEmpty");
    }
}

function initializeSpecialCells(address user, uint256 x, uint256 y) internal {
    if (x == 8 && y == 7) {
        mainGrid.updateContent(user, x, y, "Coal");
    } else if (x == 4 && y == 7) {
        mainGrid.updateContent(user, x, y, "Iron");
    } else if (x == 2 && y == 5) {
        mainGrid.updateContent(user, x, y, "Coal");
    } else if (x == 8 && y == 1) {
        mainGrid.updateContent(user, x, y, "Iron");
    }
}


/*



function updateDepotInitialSettings(address user) internal {
	uint256 gridSize = 10; // Задаем размер сетки
	uint256 theEndCount = gridSize * gridSize + 100;
    mainGrid.updateDepotPart1(
        user,
        gridSize, // gridSize
        3,  // drillsAmount
        0,  // boxesAmount
        4,  // mansAmount
        1,  // furnaceAmount
        2,  // factoryAmount
        0  // wallAmount
    );

    mainGrid.updateDepotPart2(
        user,
        block.timestamp, // starttimee
        block.timestamp, // lastmeteoritTimeChecked
        block.timestamp, // blocktimestamp
        400,             // bulldozerAmount
        0,               // early
        20,              // mmmtime
        20,             // mmmdrillSpeed
        20,              // iterationLimitDepot
        0,               // isPaused
        0,               // pausedDuration
        0                // pauseStartTime
    );
mainGrid.updateDepotTheEndCount(user, theEndCount);
}




*/

function updateDepotInitialSettings(address user) internal {
IMainGrid.Playerstat memory playerstat = mainGrid.getPlayerstat(msg.sender);
    uint256 gridSize = 10; // Задаем размер сетки
    uint256 theEndCount = gridSize * gridSize + 100;
    
    mainGrid.updateDepotPart1(
        user,
        gridSize, // gridSize
        3,  // drillsAmount
        0,  // boxesAmount
        4,  // mansAmount
        1,  // furnaceAmount
        2,  // factoryAmount
        0  // wallAmount
    );

    mainGrid.updateDepotPart2(
        user,
        block.timestamp, // starttimee
        block.timestamp * 10**6, // lastmeteoritTimeChecked
        block.timestamp, // blocktimestamp
        500,             // bulldozerAmount
        0,            // early
        20 * 10**6,              // mmmtime
        100,              // mmmdrillSpeed
        30,              // iterationLimitDepot
        0,               // isPaused
        0,               // pausedDuration
        0                // pauseStartTime
    );

    mainGrid.updateDepotTheEndCount(user, theEndCount);

    // Устанавливаем значение speedkoef
    mainGrid.updateDepotSpeedkoef(user, 1);
    mainGrid.updateDepotTrainingCompleted(user, 1);
    mainGrid.updateDepotNormalizedTime(user, 1);     // Изначально нормализованное время равно 0
    mainGrid.updateDepotLastUpdateTime(user, block.timestamp); // Устанавливаем текущее время
    mainGrid.updateDepotFrequencyFactor(user, 1);      
mainGrid.updateDepotGotoLevel(user, 100); // Изначальный уровень
    if (playerstat.firstGameTimestamp == 0) {
        mainGrid.updateFirstGameTimestamp (user, block.timestamp); // Устанавливаем текущее время
    }
 mainGrid.updateDepotMeteorsProcessed(user, false);	
	
	
	}




function generateRandom(uint256 x, uint256 y, address user) internal view returns (uint256) {
    return uint256(
        keccak256(
            abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                x,
                y,
                user
            )
        )
    ) % 100;
}

	
	
function validateRequire(IMainGrid.Depot memory depot) internal view {
    require(block.timestamp - depot.blocktimestamp < 60, "Wait for update depot.blocktimestamp");
    require(depot.isPaused == 0, "paused");
    require(depot.theEndCount > 100, "Game Over");
	require(depot.early < 60, "Wait for the update early");
}
	
	

    


    


    


    


    


    


    


    

    


    


    


    


    


    


    

    


    


    


    


    


    


    

    


    


    


    


    


    


    


    

    // Смена администратора
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    // Изменение адреса основного контракта (только администратором)
    function setMainGridAddress(address newMainGridAddress) external onlyAdmin {
        require(newMainGridAddress != address(0), "MainGrid address cannot be zero");
        emit MainGridAddressChanged(address(mainGrid), newMainGridAddress);
        mainGrid = IMainGrid(newMainGridAddress);
    }
	

	
function setTrainingCompleted(uint256 trainingCompleted, uint256 /* unused */) external {
    require(trainingCompleted == 0 || trainingCompleted == 1, "Invalid value for trainingCompleted");
    mainGrid.updateDepotTrainingCompleted(msg.sender, trainingCompleted);
}
    event Debug(string message, uint256 value);
    event DebugString(string message, string value);
    event DebugCoordinates(uint256 x, uint256 y);
	
	


function placeBox(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
validateRequire(depot); 
		
		require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.boxesAmount > 0, "No boxes available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
    


    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );

    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Box");
    mainGrid.updateDepotBoxesAmount(msg.sender, depot.boxesAmount - 1);
}




function placeWall(uint256 x, uint256 y, uint256 /* unused */) external {
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
    validateRequire(depot);

    require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.wallAmount > 0, "No wall available");

    // Получаем данные ячейки
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    // Если инструмент на клетке "Space", сначала ставим бульдозер
if (
    keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Space")) || 
    keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Ruins"))
) {
    placeBulldozer(x, y, 0);
    // Обновляем данные ячейки после вызова placeBulldozer
    cell = mainGrid.getCell(msg.sender, x, y);
}


    // Проверяем, можно ли разместить стену
    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")) ||
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Wall")),
        "Tool already placed"
    );

    uint256 wallPowerAmount = 900; // Начальное значение для крепкости стены

    // Обновляем данные ячейки
    mainGrid.updateTool(msg.sender, x, y, "Wall");
    mainGrid.updateWallPowerAmount(msg.sender, x, y, wallPowerAmount); // Устанавливаем wallPowerAmount
    mainGrid.updateDepotWallAmount(msg.sender, depot.wallAmount - 1); // Уменьшаем количество доступных стен
}

	

	
	function placeDrill(uint256 x, uint256 y, uint256 /* unused */) external {
        // Получаем данные депо через основной контракт
        IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

validateRequire(depot); 
        require(depot.gridSize > 0, "Grid size is not initialized");
        require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
        require(depot.drillsAmount > 0, "No drills available");

        // Получаем данные ячейки через основной контракт
        IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

        require(
            keccak256(abi.encodePacked(cell.content)) != keccak256(abi.encodePacked("contentEmpty")),
            "No ore to drill"
        );

        require(
            keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
            "Tool already placed"
        );

        // Обновляем данные ячейки и депо через основной контракт
        mainGrid.updateTool(msg.sender, x, y, "Drill");
        mainGrid.updateLastTimeChecked(msg.sender, x, y, block.timestamp - depot.pausedDuration);
        mainGrid.updateDepotDrillsAmount(msg.sender, depot.drillsAmount - 1);
    }
	
	
	
function placeManLR(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.mansAmount > 0, "No mansAmount available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );


    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Man");
    mainGrid.updateMan(msg.sender, x, y, "LR");
    mainGrid.updateDepotMansAmount(msg.sender, depot.mansAmount - 1);
}

	
	
	
	
	
	
	
	function placeManRL(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.mansAmount > 0, "No mansAmount available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );



    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Man");
    mainGrid.updateMan(msg.sender, x, y, "RL");
    mainGrid.updateDepotMansAmount(msg.sender, depot.mansAmount - 1);
}

	
	
	
	
	
function placeManDU(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.mansAmount > 0, "No mansAmount available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );



    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Man");
    mainGrid.updateMan(msg.sender, x, y, "DU");
    mainGrid.updateDepotMansAmount(msg.sender, depot.mansAmount - 1);
}
	
	
	
	
	
	
	
	
function placeManUD(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.mansAmount > 0, "No mansAmount available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );



    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Man");
    mainGrid.updateMan(msg.sender, x, y, "UD");
    mainGrid.updateDepotMansAmount(msg.sender, depot.mansAmount - 1);
}
	
	
	
	
	
function placeFurnace(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);

validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.furnaceAmount > 0, "No furnace available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );



    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Furnace");
    mainGrid.updateDepotFurnaceAmount(msg.sender, depot.furnaceAmount - 1);
}
	
	
	
function placeFactory(uint256 x, uint256 y, uint256 /* unused */) external {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.factoryAmount > 0, "No factory available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("toolEmpty")),
        "Tool already placed"
    );



    // Обновляем данные ячейки и депо через основной контракт
    mainGrid.updateTool(msg.sender, x, y, "Factory");
    mainGrid.updateDepotFactoryAmount(msg.sender, depot.factoryAmount - 1);
}
	
	
function placeBulldozer(uint256 x, uint256 y, uint256 /* unused */) public {
    // Получаем данные депо через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
validateRequire(depot); 
     require(depot.gridSize > 0, "Grid size is not initialized");
    require(x < depot.gridSize && y < depot.gridSize, "Invalid coordinates");
    require(depot.bulldozerAmount > 0, "No bulldozer available");

    // Получаем данные ячейки через основной контракт
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);

    require(
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Space")) ||
        keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Ruins")),
        "Not Space or Ruins"
    );

    // Уменьшаем количество бульдозеров в депо
    mainGrid.updateDepotBulldozerAmount(msg.sender, depot.bulldozerAmount - 1);


        mainGrid.updateTool(msg.sender, x, y, "toolEmpty");
  

    // Обновляем время последней проверки
    mainGrid.updateLastTimeChecked(msg.sender, x, y, block.timestamp - depot.pausedDuration);
 depot.theEndCount += 1;	
mainGrid.updateDepotTheEndCount(msg.sender, depot.theEndCount);
}
	
	/*
function iterationLimitDepotUpdate(uint256 decrementValue) external {

    mainGrid.updateDepotiterationLimitDepot(msg.sender, decrementValue);
}
*/

/*
function mmmtimeUpdate(uint256 decrementValue) external {

    mainGrid.updateDepotMmmtime(msg.sender, decrementValue);
}
*/




function starttimeeUpdate(uint256 decrementValue, uint256 unused) external {
    // Получаем данные депо и сетку через основной контракт
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
    uint256 gridSize = depot.gridSize;
validateRequire(depot); 
     require(decrementValue < (depot.lastmeteoritTimeChecked / 10**6), "Decrement value exceeds starttimee");
    require(decrementValue * depot.speedkoef< 100000, "decrementValue * depot.speedkoef = max 100000");

    // Обновляем значения депо
    mainGrid.updateDepotLastMeteoritTimeChecked(msg.sender, (depot.lastmeteoritTimeChecked - (decrementValue * 10**6)));
    mainGrid.updateDepotBlockTimestamp(msg.sender, block.timestamp);
    mainGrid.updateDepotEarly(msg.sender, block.timestamp - depot.pausedDuration - ( (depot.lastmeteoritTimeChecked / 10**6) - decrementValue));

    // Обновляем значения в каждой ячейке
    for (uint256 x = 0; x < gridSize; x++) {
        for (uint256 y = 0; y < gridSize; y++) {
            IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
            mainGrid.updateLastTimeChecked(msg.sender, x, y, cell.lastTimeChecked - decrementValue);
        }
    }


	
}

	
	
function factorySettingsUpdate(uint256 x, uint256 y, string memory factorySettingsType, uint256 /* extra */) external {
     // Получаем данные ячейки через основной контракт
	 
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender); // Получаем всю структуру Depot
validateRequire(depot); 
    IMainGrid.Cell memory cell = mainGrid.getCell(msg.sender, x, y);
    require(keccak256(abi.encodePacked(cell.tool)) == keccak256(abi.encodePacked("Factory")), "Not Factory");


     // Определяем настройки фабрики и обновляем через основной контракт
    if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("drillsF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "drillsF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("boxesF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "boxesF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("mansF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "mansF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("furnaceF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "furnaceF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("factoryF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "factoryF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("bulldozerF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "bulldozerF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("wallF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "wallF");
    } else if (keccak256(abi.encodePacked(factorySettingsType)) == keccak256(abi.encodePacked("componentsF"))) {
        mainGrid.updateFactorySettings(msg.sender, x, y, "componentsF");
    } else {
        revert("Invalid factorySettingsType");
    }
}
	
	

// Постановка на паузу
function setPause(uint256) external {
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender); // Получаем всю структуру Depot
    require(depot.isPaused == 0, "Already paused");
require(depot.theEndCount > 0, "Game Over");
    //require(depot.early <= 60, "Wait for the update");
     uint256 currentTime = block.timestamp;
    mainGrid.setDepotPause(msg.sender, 1); // Устанавливаем паузу
    mainGrid.updateDepotPauseStartTime(msg.sender, currentTime); // Фиксируем время начала паузы
}

function unsetPause(uint256) external {
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender); // Получаем всю структуру Depot
    require(depot.isPaused != 0, "not paused");
    require(depot.theEndCount > 0, "Game Over");
    require(block.timestamp >= depot.pauseStartTime, "Invalid timestamp: block.timestamp < pauseStartTime");
    
    uint256 additionalPausedTime = block.timestamp - depot.pauseStartTime;

    // Проверяем, чтобы сумма не привела к переполнению
    require(depot.pausedDuration <= type(uint256).max - additionalPausedTime, "Overflow in pausedDuration");
    uint256 newPausedDuration = depot.pausedDuration + additionalPausedTime;

    // Проверяем, чтобы не было underflow
    //require(depot.normalizedTime >= additionalPausedTime, "Underflow in normalizedTime");
    //uint256 reducedNormalizedTime = depot.normalizedTime - additionalPausedTime;

    // Обновляем значения в mainGrid
	mainGrid.updateDepotLastUpdateTime(msg.sender, block.timestamp); 
    //mainGrid.updateDepotNormalizedTime(msg.sender, reducedNormalizedTime);
    mainGrid.updateDepotPausedDuration(msg.sender, newPausedDuration);
    mainGrid.setDepotPause(msg.sender, 0); // Снимаем паузу
    mainGrid.updateDepotPauseStartTime(msg.sender, 0); // Сбрасываем время начала паузы
    mainGrid.updateDepotSpeedkoef(msg.sender, 1);
}


    event SpeedKoefUpdated(
        address indexed user,
        uint256 oldSpeedKoef,
        uint256 newSpeedKoef,
        uint256 timeElapsed,
        uint256 normalizedTime
    );

    event DebugLog(string message, uint256 value);


function updateSpeedKoef(uint256 newSpeedKoef, uint256 /* unused */) external {
  
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
 validateRequire(depot); 

    uint256 timeElapsed = block.timestamp - depot.lastUpdateTime;



    uint256 additionalNormalizedTime = timeElapsed * depot.speedkoef; 
    uint256 updatedNormalizedTime = depot.normalizedTime + additionalNormalizedTime;



   
    mainGrid.updateDepotNormalizedTime(msg.sender, updatedNormalizedTime);  
    mainGrid.updateDepotLastUpdateTime(msg.sender, block.timestamp);        
    mainGrid.updateDepotSpeedkoef(msg.sender, newSpeedKoef);                

}


    function EmptyFunctionForNonce(uint256 nonce) external {
       
    }	

	

	
	
function setGotoLevel(uint256 newLevel, uint256 /* unused */) external {
    IMainGrid.Depot memory depot = mainGrid.getDepot(msg.sender);
    validateRequire(depot); // Проверяем основные условия

    // Обновляем уровень
    mainGrid.updateDepotGotoLevel(msg.sender, newLevel);
    mainGrid.updateDepotNormalizedTime(msg.sender, 1);

    // Проверяем и обновляем количество бульдозеров, если больше 50
    if (depot.bulldozerAmount > 50) {
        mainGrid.updateDepotBulldozerAmount(msg.sender, 50);
    }
}

    function updatePlayerName(string calldata newName, uint256 /* unused */) external {
        mainGrid.updateName(msg.sender, newName);
    }

    function updatePlayerLink(string calldata newLink, uint256 /* unused */) external {
        mainGrid.updateLink(msg.sender, newLink);
    }	
	
	
function updatePendingChronicle(string memory name, string memory message, uint256 /*unused*/) external {
    // Проверяем, есть ли у пользователя запись в pendingChronicles через mainGrid
    uint256 recordId = mainGrid.pendingChronicles(msg.sender);
    require(recordId != 0, "No pending chronicle for this msg.sender");

    // Проверяем, что запись существует через mainGrid
    (uint256 currentScore, address recordAddress, string memory currentName, string memory currentMessage, uint256 recordTime) = mainGrid.getChronicle(recordId);
    require(recordAddress == msg.sender, "Invalid pending chronicle owner");


    require(keccak256(abi.encodePacked(currentName)) != keccak256(abi.encodePacked("empty")), "Current name is 'empty'");
    require(keccak256(abi.encodePacked(currentMessage)) != keccak256(abi.encodePacked("empty")), "Current message is 'empty'");

    // Обновляем хронику через mainGrid с сохранением текущего результата и времени
    mainGrid.addChronicle(recordId, currentScore, msg.sender, name, message, recordTime);

    // Убираем пользователя из pendingChronicles через mainGrid
    mainGrid.setPendingChronicle(msg.sender, 0);
}

	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
}
//AAA