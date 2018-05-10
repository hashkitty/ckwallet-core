const EthereumClient = require('./ethereum-client');
const ckCoreAbi = require('./abi/ckcore-abi.json');
const ckSaleAuctionAbi = require('./abi/cksale-abi.json');
const ckSireAuctionAbi = require('./abi/cksire-abi.json');

function CryptoKittiesClient(config) {
  const ethClient = new EthereumClient(config);
  const coreContract = ethClient.createContractWrapper(config.ckCoreAddress, ckCoreAbi);
  const saleContract = ethClient.createContractWrapper(
    config.ckSaleAuctionAddress,
    ckSaleAuctionAbi,
  );
  const sireContract = ethClient.createContractWrapper(
    config.ckSireAuctionAddress,
    ckSireAuctionAbi,
  );

  async function getEvents(eventName, fromBlock, toBlock, mapper = null) {
    let res = null;
    switch (eventName) {
      case 'Birth':
      case 'Transfer':
      case 'Pregnant':
        res = await ethClient.getEvents(coreContract, eventName, fromBlock, toBlock);
        break;
      case 'SaleAuctionCreated':
      case 'SaleAuctionCancelled':
      case 'SaleAuctionSuccessful':
        res = await ethClient.getEvents(saleContract, eventName.replace('Sale', ''), fromBlock, toBlock);
        break;
      case 'SireAuctionCreated':
      case 'SireAuctionCancelled':
      case 'SireAuctionSuccessful':
        res = await ethClient.getEvents(sireContract, eventName.replace('Sire', ''), fromBlock, toBlock);
        break;
      default:
        break;
    }
    if (mapper && res && res.length) {
      res = res.map(mapper);
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
