// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract GenesisContract {
	
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

    struct TopPlayer {
        address playerAddress;
        uint256 bestScore;
    }

    TopPlayer[100] public topPlayers; // Массив для хранения топ-100 игроков
	
    // Адрес предыдущего контракта
    uint256 public firstRecordId;
    uint256 public nextRecordId;




constructor() {
    nextRecordId = 1; // Начинаем идентификаторы с 1
    firstRecordId = 0;

    // Создаем начальную запись с идентификатором 0
chronicles[0] = Chronicle({
    recordScore: 108,
    recordAddress: msg.sender,
    recordName: "dikanevn",
    recordMessage: "Poehali!",
    recordTime: block.timestamp // Текущее время в виде timestamp
});

    // Инициализация первого топ-игрока
    topPlayers[0] = TopPlayer({
        playerAddress: msg.sender,
        bestScore: 108
    });

    // Остальные позиции топа инициализируются пустыми (если это требуется)
    for (uint256 i = 1; i < 100; i++) {
        topPlayers[i] = TopPlayer({
            playerAddress: address(0),
            bestScore: 0
        });
    }
}





function getChronicle(uint256 id) public view returns (uint256, address, string memory, string memory, uint256) {
    require(id >= firstRecordId && id < nextRecordId, "Chronicle does not exist in this contract");
    Chronicle memory chronicle = chronicles[id];
    return (
        chronicle.recordScore, 
        chronicle.recordAddress, 
        chronicle.recordName, 
        chronicle.recordMessage,
        chronicle.recordTime
    );
}


    function getTopPlayers() external view returns (TopPlayer[100] memory) {
        return topPlayers;
    }






}
//genesis