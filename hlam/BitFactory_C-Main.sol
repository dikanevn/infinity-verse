// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPreviousContract {

    struct TopPlayer {
        address playerAddress;
        uint256 bestScore;
    }

    function nextRecordId() external view returns (uint256);
    function getTopPlayers() external view returns (TopPlayer[100] memory);
	 function admin() external view returns (address); // Новая функция

}




contract MainGrid {
	
	
IPreviousContract public previous;
//uint256 public constant MaxBox = 400000;
// Определение структуры Chronicle
    struct Chronicle { 
        uint256 recordScore;
        address recordAddress;  
        string recordName;  
        string recordMessage;
		uint256 recordTime;
    }

// Определение mapping для связывания идентификаторов с Chronicle
mapping(uint256 => Chronicle) public chronicles;


    uint256 public firstRecordId;
    uint256 public nextRecordId;
	uint256 public contractCreatedTime;
	
	struct Playerstat {
		uint256 bestScore; 
		string name; 
        uint256 firstGameTimestamp; // Время начала первой игры
		string link;
    }

    mapping(address => Playerstat) private playerstats;
	


IPreviousContract.TopPlayer[100] public topPlayers;
mapping(address => uint256) public pendingChronicles;



	
    struct Cell {
        string content;// "Coal", "contentEmpty", "Iron", "Update";
        string tool;// "Drill", "Box", "Man", "Furnace", "Factory", "toolEmpty", "Space", "Ruins", "Wall";
        uint256 coalAmount;
        uint256 lastTimeChecked;
        string man;// "LR" или "RL" или "UD" или "DU" или "manEmpty";
        uint256 ironAmount;
        uint256 ironplateAmount;
        uint256 componentsAmount;
        string factorySettings;// "drillsF", "boxesF", "mansF", "furnaceF", "factoryF", "bulldozerF", "componentsF", "factorySettingsEmptyF", "wallF", "",
        string previouscontent;// "Coal", "contentEmpty", "Iron";
		uint256 wallPowerAmount; // Крепкость стены 

    }

struct Depot { 
    uint256 gridSize; // Размер сетки для пользователя
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
    uint256 trainingCompleted; // Новый параметр: 1 - обучение завершено, 2 - не завершено
    uint256 normalizedTime;
    uint256 lastUpdateTime;
    uint256 frequencyFactor;
    uint256 gotoLevel;
	bool allMeteorsProcessed; // Новый флаг	
	
}


    struct Grid {
        mapping(uint256 => mapping(uint256 => Cell)) cells; // Динамический размер
    }
	bool public isOnlyAllowedContractsEnabled = false;
    mapping(address => Depot) private depots;
    mapping(address => Grid) private grids;

    mapping(address => bool) private allowedContracts;
	
	
    address[] private allowedContractsList;

    address public admin;

    event ContractAllowed(address indexed contractAddress);
    event ContractDisallowed(address indexed contractAddress);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not an admin");
        _;
    }

modifier onlyAllowedContracts() { if (isOnlyAllowedContractsEnabled) { require(allowedContracts[msg.sender], "Not an allowed contract"); } _; }

constructor(address _previousContract) {
    require(_previousContract != address(0), "Previous contract address is required");
    previous = IPreviousContract(_previousContract);

    // Проверяем, что администратор предыдущего контракта равен 0x000...dEaD
    address previousAdmin = IPreviousContract(_previousContract).admin();
    require(previousAdmin == 0x000000000000000000000000000000000000dEaD, "Previous admin is not the dead address");

    admin = msg.sender;

    // Получаем `nextRecordId` из предыдущего контракта
    firstRecordId = previous.nextRecordId();
    nextRecordId = firstRecordId;
    contractCreatedTime = block.timestamp;

    // Получаем топ-100 игроков из предыдущего контракта
    IPreviousContract.TopPlayer[100] memory previousTopPlayers = previous.getTopPlayers();

    for (uint256 i = 0; i < 100; i++) {
        topPlayers[i] = IPreviousContract.TopPlayer({
            playerAddress: previousTopPlayers[i].playerAddress,
            bestScore: previousTopPlayers[i].bestScore
        });
    }
}


function enableOnlyAllowedContracts() public onlyAdmin { isOnlyAllowedContractsEnabled = true; } 

function disableOnlyAllowedContracts() public onlyAdmin { isOnlyAllowedContractsEnabled = false; }

	
	
    function allowContract(address contractAddress) external onlyAdmin {
        require(!allowedContracts[contractAddress], "Already allowed");
        allowedContracts[contractAddress] = true;
        allowedContractsList.push(contractAddress);
        emit ContractAllowed(contractAddress);
    }

function disallowContract(address contractAddress) external onlyAdmin {
    require(allowedContracts[contractAddress], "Not allowed");
    allowedContracts[contractAddress] = false;

    // Удаляем адрес из списка
    for (uint256 i = 0; i < allowedContractsList.length; i++) {
        if (allowedContractsList[i] == contractAddress) {
            allowedContractsList[i] = allowedContractsList[allowedContractsList.length - 1];
            allowedContractsList.pop();
            break;
        }
    }

    emit ContractDisallowed(contractAddress);
}


    function getAllowedContracts() external view returns (address[] memory) {
        return allowedContractsList;
    }

function changeAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "New admin cannot be zero address");
    require(newAdmin != admin, "Already the current admin");
    require(allowedContractsList.length == 0, "Allowed contracts list must be empty before changing admin");
    require(isOnlyAllowedContractsEnabled == true, "isOnlyAllowedContractsEnabled not true");
    emit AdminChanged(admin, newAdmin);
    admin = newAdmin;
}


/*

function getMaxBox() external pure returns (uint256) {
    return MaxBox;
}
*/


function updateContent(
    address user,
    uint256 x,
    uint256 y,
    string memory content
) external onlyAllowedContracts {
    grids[user].cells[x][y].content = content;
}

function updateTool(
    address user,
    uint256 x,
    uint256 y,
    string memory tool
) external onlyAllowedContracts {
    grids[user].cells[x][y].tool = tool;
}



function updateWallPowerAmount(
    address user,
    uint256 x,
    uint256 y,
    uint256 wallPowerAmount
) external onlyAllowedContracts {
    grids[user].cells[x][y].wallPowerAmount = wallPowerAmount;
}



function updateCoalAmount(
    address user,
    uint256 x,
    uint256 y,
    uint256 coalAmount
) external onlyAllowedContracts {
    grids[user].cells[x][y].coalAmount = coalAmount;
}

function updateLastTimeChecked(
    address user,
    uint256 x,
    uint256 y,
    uint256 lastTimeChecked
) external onlyAllowedContracts {
    grids[user].cells[x][y].lastTimeChecked = lastTimeChecked;
}

function updateMan(
    address user,
    uint256 x,
    uint256 y,
    string memory man
) external onlyAllowedContracts {
    grids[user].cells[x][y].man = man;
}

function updateIronAmount(
    address user,
    uint256 x,
    uint256 y,
    uint256 ironAmount
) external onlyAllowedContracts {
    grids[user].cells[x][y].ironAmount = ironAmount;
}

function updateIronplateAmount(
    address user,
    uint256 x,
    uint256 y,
    uint256 ironplateAmount
) external onlyAllowedContracts {
    grids[user].cells[x][y].ironplateAmount = ironplateAmount;
}
/*
// Определяем событие
event ComponentsAmountUpdated(
    address indexed user,
    uint256 indexed x,
    uint256 indexed y,
    uint256 oldComponentsAmount,
    uint256 newComponentsAmount
);
*/
function updateComponentsAmount(
    address user,
    uint256 x,
    uint256 y,
    uint256 componentsAmount
) external onlyAllowedContracts {


    // Обновляем значение компонентов
    grids[user].cells[x][y].componentsAmount = componentsAmount;

}

function updateFactorySettings(
    address user,
    uint256 x,
    uint256 y,
    string memory factorySettings
) external onlyAllowedContracts {
    grids[user].cells[x][y].factorySettings = factorySettings;
}

function updatePreviousContent(
    address user,
    uint256 x,
    uint256 y,
    string memory previouscontent
) external onlyAllowedContracts {
    grids[user].cells[x][y].previouscontent = previouscontent;
}





function getDepot(address user) external view returns (Depot memory) {
    return depots[user];
}



function getCell(address user, uint256 x, uint256 y) external view returns (Cell memory) {
    return grids[user].cells[x][y];
}

function getCellsBatch(address user, uint256[] calldata indices, uint256 gridSize) 
    external 
    view 
    returns (Cell[] memory) 
{
    uint256 length = indices.length;
    Cell[] memory cells = new Cell[](length);

    for (uint256 i = 0; i < length; i++) {
        uint256 x = indices[i] % gridSize;
        uint256 y = indices[i] / gridSize;

        cells[i] = grids[user].cells[x][y];
    }

    return cells;
}


function updateDepotPart1(
    address user,
    uint256 gridSize, // Добавить gridSize как входной параметр
    uint256 drillsAmount,
    uint256 boxesAmount,
    uint256 mansAmount,
    uint256 furnaceAmount,
    uint256 factoryAmount,
	uint256 wallAmount
) external onlyAllowedContracts {
    Depot storage depot = depots[user];
    depot.gridSize = gridSize; // Устанавливаем размер сетки
    depot.drillsAmount = drillsAmount;
    depot.boxesAmount = boxesAmount;
    depot.mansAmount = mansAmount;
    depot.furnaceAmount = furnaceAmount;
    depot.factoryAmount = factoryAmount;
	depot.wallAmount = wallAmount;
}


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
) external onlyAllowedContracts {
    Depot storage depot = depots[user];
    depot.starttimee = starttimee;
    depot.lastmeteoritTimeChecked = lastmeteoritTimeChecked;
    depot.blocktimestamp = blocktimestamp;
    depot.bulldozerAmount = bulldozerAmount;
    depot.early = early;
    depot.mmmtime = mmmtime;
    depot.mmmdrillSpeed = mmmdrillSpeed;
    depot.iterationLimitDepot = iterationLimitDepot;

    // Добавлены три новых поля
    depot.isPaused = isPaused;
    depot.pausedDuration = pausedDuration;
    depot.pauseStartTime = pauseStartTime;
}



function updateMmmtime(address user, uint256 mmmtime) external onlyAllowedContracts {
    depots[user].mmmtime = mmmtime;
}






function updateDepotGridSize(address user, uint256 gridSize) external onlyAllowedContracts {
    Depot storage depot = depots[user];
    uint256 previousGridSize = depot.gridSize;
    uint256 previousTotalCells = previousGridSize * previousGridSize;
    uint256 newTotalCells = gridSize * gridSize;

    depot.gridSize = gridSize; // Устанавливаем новый размер сетки

    // Просто прибавляем разницу в количестве ячеек
    depot.theEndCount += (newTotalCells - previousTotalCells);
}

function updateDepotTrainingCompleted(address user, uint256 trainingCompleted) external onlyAllowedContracts {
    require(trainingCompleted == 0 || trainingCompleted == 1, "Invalid value for trainingCompleted");
    depots[user].trainingCompleted = trainingCompleted;
}

function updateDepotSpeedkoef(address user, uint256 speedkoef) external onlyAllowedContracts {
    depots[user].speedkoef = speedkoef;
}

function updateDepotWallAmount(address user, uint256 wallAmount) external onlyAllowedContracts {
    depots[user].wallAmount = wallAmount;
}

function updateDepotTheEndCount(address user, uint256 theEndCount) external onlyAllowedContracts {
    depots[user].theEndCount = theEndCount;
}





function updateDepotDrillsAmount(address user, uint256 drillsAmount) external onlyAllowedContracts {
    depots[user].drillsAmount = drillsAmount;
}

function updateDepotBoxesAmount(address user, uint256 boxesAmount) external onlyAllowedContracts {
    depots[user].boxesAmount = boxesAmount;
}

function updateDepotMansAmount(address user, uint256 mansAmount) external onlyAllowedContracts {
    depots[user].mansAmount = mansAmount;
}

function updateDepotFurnaceAmount(address user, uint256 furnaceAmount) external onlyAllowedContracts {
    depots[user].furnaceAmount = furnaceAmount;
}

function updateDepotFactoryAmount(address user, uint256 factoryAmount) external onlyAllowedContracts {
    depots[user].factoryAmount = factoryAmount;
}

function updateDepotStarttimee(address user, uint256 starttimee) external onlyAllowedContracts {
    depots[user].starttimee = starttimee;
}

function updateDepotLastMeteoritTimeChecked(address user, uint256 lastmeteoritTimeChecked) external onlyAllowedContracts {
    depots[user].lastmeteoritTimeChecked = lastmeteoritTimeChecked;
}

function updateDepotBlockTimestamp(address user, uint256 blocktimestamp) external onlyAllowedContracts {
    depots[user].blocktimestamp = blocktimestamp;
}

function updateDepotBulldozerAmount(address user, uint256 bulldozerAmount) external onlyAllowedContracts {
    depots[user].bulldozerAmount = bulldozerAmount;
}

function updateDepotEarly(address user, uint256 early) external onlyAllowedContracts {
    depots[user].early = early;
}

function updateDepotMmmtime(address user, uint256 mmmtime) external onlyAllowedContracts {
    depots[user].mmmtime = mmmtime;
}

function updateDepotMmmdrillSpeed(address user, uint256 mmmdrillSpeed) external onlyAllowedContracts {
    depots[user].mmmdrillSpeed = mmmdrillSpeed;
}

function updateDepotiterationLimitDepot(address user, uint256 iterationLimitDepot) external onlyAllowedContracts {
    depots[user].iterationLimitDepot = iterationLimitDepot;
}

function setDepotPause(address user, uint256 isPaused) external onlyAllowedContracts {
    depots[user].isPaused = isPaused; // Обновляем флаг паузы (0 - игра, 1 - пауза)
}

function updateDepotPausedDuration(address user, uint256 pausedDuration) external onlyAllowedContracts {
    depots[user].pausedDuration = pausedDuration; // Обновляем общее накопленное время паузы
}

function updateDepotPauseStartTime(address user, uint256 pauseStartTime) external onlyAllowedContracts {
    depots[user].pauseStartTime = pauseStartTime; // Обновляем время начала паузы
}


function updateDepotNormalizedTime(address user, uint256 normalizedTime) external onlyAllowedContracts {
    depots[user].normalizedTime = normalizedTime;
}

function updateDepotLastUpdateTime(address user, uint256 lastUpdateTime) external onlyAllowedContracts {
    depots[user].lastUpdateTime = lastUpdateTime;
}

function updateDepotFrequencyFactor(address user, uint256 frequencyFactor) external onlyAllowedContracts {
    depots[user].frequencyFactor = frequencyFactor;
}

function updateDepotGotoLevel(address user, uint256 gotoLevel) external onlyAllowedContracts {
    depots[user].gotoLevel = gotoLevel;
}




    // Обновление bestScore
    function updateBestScore(address user, uint256 newScore) external  onlyAllowedContracts {
        playerstats[user].bestScore = newScore;
    }

    function updateName(address user, string calldata newText) external  onlyAllowedContracts {
        playerstats[user].name = newText;
    }
	
    function updateFirstGameTimestamp(address user, uint256 time) external  onlyAllowedContracts {
        playerstats[user].firstGameTimestamp = time;
    }


	// Обновление link
    function updateLink(address user, string calldata newText) external  onlyAllowedContracts {
        playerstats[user].link = newText;
    }
	
function updateAllTopPlayers( IPreviousContract.TopPlayer[100] calldata newTopPlayers) external  onlyAllowedContracts {
    for (uint256 i = 0; i < 100; i++) {
        topPlayers[i] = newTopPlayers[i];
    }
}
function updateTopPlayer(uint256 index, IPreviousContract.TopPlayer calldata newTopPlayer) external onlyAllowedContracts {
    require(index < 100, "Index out of bounds"); // Проверяем, что индекс не выходит за пределы массива
    topPlayers[index] = newTopPlayer; // Обновляем элемент массива по указанному индексу
}


function getPlayerstat(address user) external view returns (Playerstat memory) {
    return playerstats[user];
}


function addChronicle(
    uint256 recordId,
    uint256 score,
    address addr,
    string memory name,
    string memory message,
    uint256 recordTime
) external onlyAllowedContracts {
    require(score > 0, "Score must be greater than zero");
    require(addr != address(0), "Invalid address");
    require(recordTime > 0, "Record time must be valid");
    require(recordId >= firstRecordId && recordId <= nextRecordId, "Record ID out of bounds");

    chronicles[recordId] = Chronicle({
        recordScore: score,
        recordAddress: addr,
        recordName: name,
        recordMessage: message,
        recordTime: recordTime // Время теперь передается как аргумент
    });
}







function getChronicle(uint256 id) public view returns (uint256, address, string memory, string memory, uint256) {
    require(id >= firstRecordId && id < nextRecordId, "Chronicle does not exist in this contract");
    Chronicle memory chronicle = chronicles[id];
    return (chronicle.recordScore, chronicle.recordAddress, chronicle.recordName, chronicle.recordMessage, chronicle.recordTime);
}



function getTopPlayers() external view returns (IPreviousContract.TopPlayer[100] memory) {
    return topPlayers;
}

    function incrementNextRecordId() external onlyAllowedContracts {
        nextRecordId++;
    }

function setPendingChronicle(address user, uint256 recordId) external onlyAllowedContracts {
    pendingChronicles[user] = recordId;
}



function updateDepotMeteorsProcessed(address user, bool status) external {
    depots[user].allMeteorsProcessed = status;
}














}
//main