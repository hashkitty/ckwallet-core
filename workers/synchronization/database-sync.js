const CryptoKittiesClient = require('../../providers/ethereum/cryptokitties-client');
const Database = require('../../providers/database/database');
const Logger = require('../../providers/log/logger');

function DatabaseSync(config) {
  let logger = null;


  async function proccessBirthEvent(database, eventData) {
    await database.addKitty(eventData);
  }

  async function proccessPregnantEvent(database, eventData) {
    await database.updateKittyCooldown(eventData);
  }

  async function proccessTransferEvent(database, eventData) {
    await database.updateKittyOwner(eventData);
  }

  async function proccessAuctionCreated(database, eventData, type) {
    await database.addAuction(eventData, type);
  }

  async function proccessAuctionCancelled(database, eventData, type) {
    await database.cancelAuction(eventData, type);
  }

  async function proccessAuctionCompleted(database, eventData, type) {
    await database.completeAuction(eventData, type);
  }


  async function synchronizeEvent(database, kittyClient, currentBlock, eventName, handler) {
    const lastSyncBlock = await database.getEventLastSync(eventName);
    const pageSize = 1000;
    let startBlock = lastSyncBlock + 1;
    while (startBlock < currentBlock) {
      const startTime = process.hrtime();
      const endBlock = startBlock + pageSize;
      const events = await kittyClient.getEvents( // eslint-disable-line no-await-in-loop
        eventName,
        startBlock,
        endBlock,
      );
      if (events && events.length > 0) {
        for (let i = 0; i < events.length; i += 1) {
          await handler(database, events[i]); // eslint-disable-line no-await-in-loop
        }
        const ellapsed = process.hrtime(startTime)[0];
        logger.log(`${startBlock}/${currentBlock} - ${events.length} ${eventName} events at ${ellapsed / events.length} sec/event rate`);
      }
      // save last sync block to DB
      await database.updateEventLastSync( // eslint-disable-line no-await-in-loop
        eventName,
        endBlock > currentBlock ? currentBlock : endBlock,
      );
      startBlock += pageSize + 1;
    }
  }

  async function run(fast) {
    logger = new Logger(config.logger);
    const kittyClient = new CryptoKittiesClient(config.ethereum);
    const database = new Database(config.database);
    const currentBlock = await kittyClient.getCurrentBlockNumber() -
      config.ethereum.confimationBlocks;

    logger.log('Synchronization started');
    try {
      await database.open(fast);
      await synchronizeEvent(database, kittyClient, currentBlock, 'Birth', proccessBirthEvent);
      await synchronizeEvent(database, kittyClient, currentBlock, 'Pregnant', proccessPregnantEvent);
      await synchronizeEvent(database, kittyClient, currentBlock, 'Transfer', proccessTransferEvent);
      await synchronizeEvent(database, kittyClient, currentBlock, 'SaleAuctionCreated', (d, e) => proccessAuctionCreated(d, e, 1));
      await synchronizeEvent(database, kittyClient, currentBlock, 'SaleAuctionCancelled', (d, e) => proccessAuctionCancelled(d, e, 1));
      await synchronizeEvent(database, kittyClient, currentBlock, 'SaleAuctionSuccessful', (d, e) => proccessAuctionCompleted(d, e, 1));
      logger.log('Synchronization completed');
    } catch (err) {
      logger.error(`Synchronization error: ${err}`);
    } finally {
      await database.close();
    }
  }

  this.run = run;
}

module.exports = DatabaseSync;
