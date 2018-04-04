const CryptoKittiesClient = require('../../providers/ethereum/cryptokitties-client');
const Database = require('../../providers/database/database');
const Logger = require('../../providers/log/logger');
const config = require('../../config/config.local.json');

let syncTimer = null;
let syncStop = false;
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

async function synchronize(fast) {
  logger = new Logger(config.logger);
  const kittyClient = new CryptoKittiesClient(config.ethereum);
  const database = new Database(config.database);
  const currentBlock = await kittyClient.getCurrentBlockNumber();

  logger.log('Synchronization started');
  try {
    await database.open(fast);
    await synchronizeEvent(database, kittyClient, currentBlock, 'Birth', proccessBirthEvent);
    await synchronizeEvent(database, kittyClient, currentBlock, 'Pregnant', proccessPregnantEvent);
    await synchronizeEvent(database, kittyClient, currentBlock, 'Transfer', proccessTransferEvent);
    logger.log('Synchronization completed');
  } catch (err) {
    logger.error(`Synchronization error: ${err}`);
  } finally {
    await database.close();
  }
}

async function start(fast, interval) {
  syncStop = false;
  await synchronize(fast);
  if (interval && !syncStop) {
    syncTimer = setTimeout(async () => start(fast, interval), interval);
  }
}

function stop() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = false;
  }
  syncStop = true;
}

exports.start = start;
exports.stop = stop;
