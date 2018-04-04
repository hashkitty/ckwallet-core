const EthereumClient = require('./ethereum-client');
const ckCoreAbi = require('./abi/ckcore-abi.json');
// const ckSaleAuctionAbi = require('./abi/cksale-abi.json');
// const ckSireAuctionAbi = require('./abi/cksire-abi.json');
// let config = require("../config/ethereum-config.json");

function CryptoKittiesClient(config) {
  const ethClient = new EthereumClient(config);
  const coreContract = ethClient.createContractWrapper(config.ckCoreAddress, ckCoreAbi);

  function getEvents(eventName, fromBlock, toBlock) {
    let res = null;
    switch (eventName) {
      case 'Birth':
      case 'Transfer':
      case 'Pregnant':
        res = ethClient.getEvents(coreContract, eventName, fromBlock, toBlock);
        break;
      default:
        break;
    }
    return res;
  }

  function getCurrentBlockNumber() {
    return ethClient.getCurrentBlockNumber();
  }

  this.getEvents = getEvents;
  this.getCurrentBlockNumber = getCurrentBlockNumber;
}

module.exports = CryptoKittiesClient;
