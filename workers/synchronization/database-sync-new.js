const CryptoKittiesClient = require('../../providers/ethereum/cryptokitties-client');
const Database = require('../../providers/database/database');
const Logger = require('../../providers/log/logger');
const helpers = require('../../providers/helpers');
const { Tables } = require('../../providers/database/database-schema');
const assert = require('assert');

function DatabaseSync(config) {
  let logger = null;

  // slice kitties array so that parent/child are not on the same batch
  function sliceKitties(kitties) {
    let slice = [];
    const res = [slice];
    let currentIds = {};
    for (let i = 0; i < kitties.length; i += 1) {
      const kitty = kitties[i];
      if (currentIds[kitty.MatronId] || currentIds[kitty.PatronId]) {
        // start new slice
        slice = [];
        currentIds = {};
        res.push(slice);
      }
      slice.push(kitty);
      currentIds[kitty.ID] = true;
    }
    return res;
  }

  // slice auctions array so that batch does not have 2 auction for 1 kitty
  function sliceAuctions(auctions) {
    let slice = [];
    const res = [slice];
    let currentIds = {};
    for (let i = 0; i < auctions.length; i += 1) {
      const auction = auctions[i];
      if (currentIds[auction.key.KittyId]) {
        // start new slice
        slice = [];
        currentIds = {};
        res.push(slice);
      }
      slice.push(auction);
      currentIds[auction.key.KittyId] = true;
    }
    return res;
  }

  function bitrthEventToKitty(db, birth, ownerMap, parents, births) {
    const res = Object.assign(birth);
    res.Owner = ownerMap[db.mapper.toHexString(birth.Owner)].ID;
    res.Breeder = res.Owner;
    let matron = parents[res.MatronId];
    let patron = parents[res.PatronId];
    if (!matron) {
      // search in current batch
      matron = births.find(k => k.ID === res.MatronId);
    }
    if (!patron) {
      // search in current batch
      patron = births.find(k => k.ID === res.PatronId);
    }
    res.Generation = Math.max(matron.Generation, patron.Generation) + 1;
    return res;
  }

  function getKittyUpdates(db, pregnants, patrons, transfers, owners) {
    const res = {};
    // get updates for NextActionAt
    let ordered = pregnants.sort(p => p.BlockNumber);
    for (let i = 0; i < ordered.length; i += 1) {
      const pregnant = ordered[i];
      res[pregnant.MatronId] = {};
      res[pregnant.MatronId][Tables.Kitties.Fields.NextActionAt.Name] = pregnant.NextActionAt;

      // calculate cooldown for patron
      const patron = patrons[pregnant.PatronId];
      assert(patron, `Could not find patron ${pregnant.PatronId}`);
      const patronCooldownBlock = helpers.getCooldownBlocks(patron);
      res[pregnant.PatronId] = {};
      res[pregnant.PatronId][Tables.Kitties.Fields.NextActionAt.Name] =
        pregnant.BlockNumber + patronCooldownBlock;
    }

    // get updates for owners
    ordered = transfers.sort(p => p.BlockNumber);
    for (let i = 0; i < ordered.length; i += 1) {
      const transfer = transfers[i];
      res[transfer.ID] = res[transfer.ID] || {};
      const owner = owners[db.mapper.toHexString(transfer.To)];
      assert(owner, `Could not resolve owner for address ${db.mapper.toHexString(transfer.To)}`);
      res[transfer.ID][Tables.Kitties.Fields.Owner.Name] = owner.ID;
    }
    return res;
  }

  async function processKittyEvents(db, births, pregnants, transfers) {
    // get list of unique addresses from events and ensure they are in DB first
    let addresses = helpers.getUniqueBuffers(births.map(b => b.Owner)
      .concat(transfers.map(t => t.From))
      .concat(transfers.map(t => t.To)));
    addresses = addresses.map(a => db.mapper.toHexString(a));
    const owners = await db.resolveOwnerAddresses(addresses);
    // parents are needed to get generation so can be read from cache
    // since generation does not change
    const parents = await db.resolveKittyParents(births, true);
    const kitties = births.map(birth => bitrthEventToKitty(db, birth, owners, parents, births));
    const sliced = sliceKitties(kitties);
    const promises = sliced.map(s => db.addKitties(s));
    await Promise.all(promises);

    // read patrons not cached to get update childrne count
    const patrons = await db.resolveKittyParents(pregnants, false);
    const updates = getKittyUpdates(db, pregnants, patrons, transfers, owners);
    await db.updateKitties(updates);
  }

  function getAuctionUpdates(db, cancelled, successful, owners) {
    const res = [];
    const events = cancelled.concat(successful);
    const ordered = events.sort(e => e.BlockNumber);
    for (let i = 0; i < ordered.length; i += 1) {
      const event = {
        [Tables.Auctions.Fields.EndedBlock.Name]: ordered[i].EndedBlock,
        [Tables.Auctions.Fields.Status.Name]: ordered[i].Status,
      };
      if (event.Buyer) {
        // this is successful event need to replace buyer address with ID
        const address = db.mapper.toHexString(ordered[i].Buyer);
        const buyer = owners[address];
        assert(buyer, `Could not resolve buyer for address ${db.mapper.toHexString(event.Buyer)}`);
        event.Buyer = buyer;
        event[Tables.Auctions.Fields.BuyPrice.Name] = ordered[i].BuyPrice;
      }
      // make key for update operation
      event.key = {
        [Tables.Auctions.Fields.KittyId.Name]: ordered[i].KittyId,
        [Tables.Auctions.Fields.Status.Name]: 1,
      };
      res.push(event);
    }
    return res;
  }
  async function processAuctions(db, created, cancelled, successfull, type) {
    let addresses = helpers.getUniqueBuffers(successfull.map(e => e.Buyer));
    addresses = addresses.map(a => db.mapper.toHexString(a));
    const owners = await db.resolveOwnerAddresses(addresses);

    await db.addAuctions(created, type);
    const updates = getAuctionUpdates(db, cancelled, successfull, owners);
    const sliced = sliceAuctions(updates);
    const promises = sliced.map(s => db.updateAuctions(s));
    await Promise.all(promises);
  }

  async function synchronizeKitties(db, kittyClient, toBlock) {
    logger.log(`Synchronizing kitties: ${new Date()}`);
    const lastSyncBlock = await db.getEventLastSync('Birth');
    const pageSize = 1000;
    let startBlock = lastSyncBlock + 1;
    while (startBlock < toBlock) {
      const startTime = process.hrtime();
      const endBlock = startBlock + pageSize;
      const events = await Promise.all([
        kittyClient.getEvents('Birth', startBlock, endBlock, e => db.mapBirthEventData(e)),
        kittyClient.getEvents('Pregnant', startBlock, endBlock, e => db.mapper.mapData('Pregnant', e)),
        kittyClient.getEvents('Transfer', startBlock, endBlock, e => db.mapper.mapData('Transfer', e)),
      ]);
      if (events) {
        const births = events[0];
        const pregnants = events[1];
        const transfers = events[2];
        await processKittyEvents(db, births, pregnants, transfers);
        const hrtime = process.hrtime(startTime);
        const ellapsed = hrtime[0] + (hrtime[1] / 1000000000);
        const eventNumber = births.length + pregnants.length + transfers.length;
        await db.optimize();
        logger.log(`${startBlock}/${toBlock} - ${eventNumber} events at ${eventNumber / ellapsed} event/sec rate`);
      }
      startBlock += pageSize + 1;
    }
    logger.log(`Synchronizing kitties done: ${new Date()}`);
  }

  async function synchronizeAuctions(db, kittyClient, toBlock, type) {
    logger.log(`Synchronizing ${type === 1 ? 'sale' : 'sire'} auctions: ${new Date()}`);
    const eventType = type === 1 ? 'SaleAuctionCreated' : 'SirAuctionCreated';
    const lastSyncBlock = await db.getEventLastSync(eventType);
    const pageSize = 1000;
    let startBlock = lastSyncBlock + 1;
    while (startBlock < toBlock) {
      const startTime = process.hrtime();
      const endBlock = startBlock + pageSize;
      let promises = [];
      if (type === 1) {
        promises = [
          kittyClient.getEvents('SaleAuctionCreated', startBlock, endBlock, e => db.mapper.mapData('AuctionCreated', e)),
          kittyClient.getEvents('SaleAuctionCancelled', startBlock, endBlock, e => db.mapper.mapData('AuctionCancelled', e)),
          kittyClient.getEvents('SaleAuctionSuccessful', startBlock, endBlock, e => db.mapper.mapData('AuctionSuccessful', e)),
        ];
      } else if (type === 2) {
        promises = [
          kittyClient.getEvents('SireAuctionCreated', startBlock, endBlock, e => db.mapper.mapData('AuctionCreated', e)),
          kittyClient.getEvents('SireAuctionCancelled', startBlock, endBlock, e => db.mapper.mapData('AuctionCancelled', e)),
          kittyClient.getEvents('SireAuctionSuccessful', startBlock, endBlock, e => db.mapper.mapData('AuctionSuccessful', e)),
        ];
      }
      const events = await Promise.all(promises);
      if (events) {
        const created = events[0];
        const cancelled = events[1];
        const successful = events[2];
        await processAuctions(db, created, cancelled, successful, type);
        const hrtime = process.hrtime(startTime);
        const ellapsed = hrtime[0] + (hrtime[1] / 1000000000);
        const eventNumber = created.length + cancelled.length + successful.length;
        await db.optimize();
        logger.log(`${startBlock}/${toBlock} - ${eventNumber} events at ${eventNumber / ellapsed} event/sec rate`);
      }
      startBlock += pageSize + 1;
    }
    logger.log(`Synchronizing auctions done: ${new Date()}`);
  }

  async function run() {
    logger = new Logger(config.logger);
    const kittyClient = new CryptoKittiesClient(config.ethereum);
    const database = new Database(config.database);
    const currentBlock = await kittyClient.getCurrentBlockNumber() -
      config.ethereum.confimationBlocks;

    logger.log('Synchronization started');
    try {
      await database.open(true);
      await synchronizeKitties(database, kittyClient, currentBlock);
      await synchronizeAuctions(database, kittyClient, currentBlock, 1);
      await synchronizeAuctions(database, kittyClient, currentBlock, 2);
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
