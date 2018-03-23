let Web3 = require("Web3");

function EthereumClient(config) {
    let web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl, config.rpcTimeout));

    function createContractWrapper(address, abi) {
        return new web3.eth.Contract(abi, address);
    }
    
    function getCurrentBlockNumber() {
        return web3.eth.getBlockNumber().then(v => parseInt(v));
    }

    function getEvents(contract, name, fromBlock, toBlock) {
        return new Promise(function(resolve, reject) {
            contract.getPastEvents(name, 
            { 
                fromBlock: fromBlock, 
                toBlock: toBlock
            },
            function(error, data) {
                if(error) {
                    reject(error)
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    

    this.createContractWrapper = createContractWrapper;
    this.getCurrentBlockNumber = getCurrentBlockNumber;
    this.getEvents = getEvents;
}

module.exports = EthereumClient;