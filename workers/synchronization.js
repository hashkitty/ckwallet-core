let CryptoKittiesClient = require("../providers/ethereum/cryptokitties-client");
let Database = require("../providers/database/database");
let Logger = require("../providers/log/logger");
let config = require("../config/config.local.json");

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
    let lastSyncBlock = await database.getEventLastSync(eventName);
    let pageSize = 1000;
    let startBlock = lastSyncBlock + 1;
    while(startBlock < currentBlock) {
        let startTime = process.hrtime();
        let endBlock = startBlock + pageSize;
        let events = await kittyClient.getEvents(eventName, startBlock, endBlock);
        if(events && events.length > 0) {
            for(let i = 0; i < events.length; i++) {
                await handler(database, events[i]);
            };
            let ellapsed = process.hrtime(startTime)[0];
            logger.log(`${startBlock}/${currentBlock} - ${events.length} ${eventName} events at ${ellapsed/events.length} sec/event rate`);
        }
        //save last sync block to DB
        await database.updateEventLastSync(eventName, endBlock > currentBlock ? currentBlock : endBlock); 
        startBlock += pageSize + 1;
    }
}

async function synchronize() {
    logger = new Logger(config.logger);
    let kittyClient = new CryptoKittiesClient(config.ethereum);
    let database = new Database(config.database);
    let currentBlock = await kittyClient.getCurrentBlockNumber();

    logger.log("Synchronization started");
    try {
        await database.open(true);
        await synchronizeEvent(database, kittyClient, currentBlock, "Birth", proccessBirthEvent);
        await synchronizeEvent(database, kittyClient, currentBlock, "Pregnant", proccessPregnantEvent);
        await synchronizeEvent(database, kittyClient, currentBlock, "Transfer", proccessTransferEvent);
        logger.log("Synchronization completed");
    }
    catch(err) {
        logger.error('Synchronization error: ' + err);
    }
    finally {
        await database.close();
    }
}

async function start(interval) {
    syncStop = false;
    await synchronize();
    if(interval && !syncStop) {
        syncTimer = setTimeout(async _ => await start(interval), interval);
    }
}

function stop() {
    if(syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = false;
    }
    syncStop = true;
}

exports.start = start;
exports.stop = stop;

start(1000*60*2);