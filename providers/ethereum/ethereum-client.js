const Web3 = require('web3');

function EthereumClient(config) {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl, config.rpcTimeout));

  function createContractWrapper(address, abi) {
    return new web3.eth.Contract(abi, address);
  }

  function getCurrentBlockNumber() {
    return web3.eth.getBlockNumber().then(v => parseInt(v, 10));
  }

  function getEvents(contract, name, fromBlock, toBlock) {
    return new Promise(((resolve, reject) => {
      contract.getPastEvents(
        name,
        {
          fromBlock,
          toBlock,
        },
        (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        },
      );
    }));
  }


  this.createContractWrapper = createContractWrapper;
  this.getCurrentBlockNumber = getCurrentBlockNumber;
  this.getEvents = getEvents;
}

module.exports = EthereumClient;
