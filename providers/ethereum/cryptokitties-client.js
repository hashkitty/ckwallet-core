let Web3 = require("Web3");
let EthereumClient = require("./ethereum-client");
//let config = require("../config/ethereum-config.json");

function CryptoKittiesClient(config) {
    let ethClient = new EthereumClient(config);
    let ckCoreAbi = require("./abi/ckcore-abi.json");
    let ckSaleAuctionAbi = require("./abi/cksale-abi.json");
    let ckSireAuctionAbi = require("./abi/cksire-abi.json");
    let coreContract = ethClient.createContractWrapper(config.ckCoreAddress, ckCoreAbi);
    let saleContract = ethClient.createContractWrapper(config.ckSaleAuctionAddress, ckSaleAuctionAbi);
    let sireContract = ethClient.createContractWrapper(config.ckSireAuctionAddress, ckSireAuctionAbi);

    function getEvents(eventName, fromBlock, toBlock) {
        switch(eventName) {
            case "Birth":
            case "Transfer":
            case "Pregnant":
                return ethClient.getEvents(coreContract, eventName, fromBlock, toBlock);
            break;
        }
    }
    function getPregnantEvents(fromBlock, toBlock) {
        return ethClient.getEvents(coreContract, "Pregnant", fromBlock, toBlock);
    }
    function getTransferEvents(fromBlock, toBlock) {
        return ethClient.getEvents(coreContract, "Transfer", fromBlock, toBlock);
    }
    function getSaleAuctionCreated(fromBlock, toBlock) {
        return ethClient.getEvents(saleContract, "AuctionCreated", fromBlock, toBlock);
    }
    function getSaleAuctionCancelled(fromBlock, toBlock) {
        return ethClient.getEvents(saleContract, "AuctionCancelled", fromBlock, toBlock);
    }
    function getSaleAuctionSuccessful(fromBlock, toBlock) {
        return ethClient.getEvents(saleContract, "AuctionSuccessful", fromBlock, toBlock);
    }
    function getSireAuctionCreated(fromBlock, toBlock) {
        return ethClient.getEvents(sireContract, "AuctionCreated", fromBlock, toBlock);
    }
    function getSireAuctionCancelled(fromBlock, toBlock) {
        return ethClient.getEvents(sireContract, "AuctionCancelled", fromBlock, toBlock);
    }
    function getSireAuctionSuccessful(fromBlock, toBlock) {
        return ethClient.getEvents(sireContract, "AuctionSuccessful", fromBlock, toBlock);
    }
    function getCurrentBlockNumber() {
        return ethClient.getCurrentBlockNumber();
    }

    this.getEvents = getEvents;
    this.getCurrentBlockNumber = getCurrentBlockNumber;
}

module.exports = CryptoKittiesClient;
