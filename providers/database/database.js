const SqlClient = require('./sql-client');
const DatabaseMapper = require('./database-mapper');
const schema = require('./database-schema');
const constants = require('./constants');
const Cache = require('./cache');
const QueryParser = require('./query-parser');
const { BigInteger } = require('bignumber');

function Database(config) {
  const cache = new Cache();
  const sqlClient = new SqlClient(config);
  const mapper = new DatabaseMapper();

  async function open(fast, readOnly) {
    await sqlClient.open(fast, readOnly);
    if (this.queryParser) {
      await this.queryParser.initialize();
    }
  }

  function close() {
    return sqlClient.close();
  }

  async function getLastKittyBlock() {
    let res = 0;
    const row = await sqlClient.get(
      schema.Tables.Kitties.Name,
      [schema.Tables.Kitties.Fields.BirthBlock.Name],
      undefined,
      [`${schema.Tables.Kitties.Fields.ID.Name} DESC`],
    );
    if (row) {
      res = row[schema.Tables.Kitties.Fields.BirthBlock.Name];
    }
    return res;
  }

  async function getLastAuctionBlock(type) {
    let res = 0;
    const where = `${schema.Tables.Auctions.Fields.Type.Name}=${type}`;
    const row = await sqlClient.get(
      schema.Tables.Auctions.Name,
      [schema.Tables.Auctions.Fields.StartedBlock.Name],
      where,
      [`${schema.Tables.Auctions.Fields.StartedBlock.Name} DESC`],
    );
    if (row) {
      res = row[schema.Tables.Auctions.Fields.StartedBlock.Name];
    }
    return res;
  }

  async function getImportHistoryBlockNumber(eventName) {
    let res = 0;
    const where = `${schema.Tables.ImportHistory.Fields.EventName.Name}='${eventName}'`;
    const row = await sqlClient.get(
      schema.Tables.ImportHistory.Name,
      [schema.Tables.ImportHistory.Fields.BlockNumber.Name],
      where,
    );
    if (row) {
      res = row[schema.Tables.ImportHistory.Fields.BlockNumber.Name];
    }
    return res;
  }

  async function getEventLastSync(eventName) {
    let res = 0;
    switch (eventName) {
      case 'Birth':
        res = await getLastKittyBlock();
        break;
      case 'SaleAuctionCreated':
        res = await getLastAuctionBlock(1);
        break;
      case 'SireAuctionCreated':
        res = await getLastAuctionBlock(2);
        break;
      default:
        res = await getImportHistoryBlockNumber(eventName);
        break;
    }
    return res < constants.ckCoreCreationBlock ? constants.ckCoreCreationBlock : res;
  }

  async function updateEventLastSync(eventName, blockNumber) {
    const where = `${schema.Tables.ImportHistory.Fields.EventName.Name}="${eventName}"`;
    const set = `${schema.Tables.ImportHistory.Fields.BlockNumber.Name}=${blockNumber}`;
    switch (eventName) {
      case 'Birth':
        // no need to do anything for this event, last sync block can be calculated
        break;
      default:
        await sqlClient.update(schema.Tables.ImportHistory.Name, set, where);
        break;
    }
  }


  async function getOrAddOwner(address) {
    const hexAddress = mapper.toHexString(address);
    const cacheKey = `getOrAddOwner(${hexAddress})`;
    // read from memory cache if possible
    const res = await cache.getOrAdd(cacheKey, async () => {
      const where = `${schema.Tables.Owners.Fields.Address.Name}='${hexAddress}'`;
      let owner = await sqlClient.get(
        schema.Tables.Owners.Name,
        [schema.Tables.Owners.Fields.ID.Name],
        where,
      );
      if (!owner) {
        const newOwner = mapper.mapData('Owner', address);
        const ownerId = await sqlClient.insert(schema.Tables.Owners.Name, newOwner);
        owner = { ID: ownerId };
      }
      return owner.ID;
    });
    return res;
  }

  async function getKittyById(id) {
    const cacheKey = `getKittyById(${id})`;
    // read from memory cache if possible
    const res = await cache.getOrAdd(cacheKey, async () => {
      const fields = schema.getFieldsOfTable(schema.Tables.Kitties).map(f => f.Name);
      const where = `${schema.Tables.Kitties.Fields.ID.Name}=${id}`;
      const kitty = await sqlClient.get(
        schema.Tables.Kitties.Name,
        fields,
        where,
      );
      return kitty;
    });
    return res;
  }

  async function addKitty(data) {
    const eventData = data;
    eventData.genes = new BigInteger(data.returnValues.genes);
    const mapped = mapper.mapData('Birth', eventData);
    const owner = mapped.Owner;
    const ownerId = await getOrAddOwner(owner);
    mapped.Owner = ownerId;
    mapped.Breeder = ownerId;
    let matron;
    let patron;
    if (mapped.MatronId !== 0) {
      // TODO run this in parallel
      matron = await getKittyById(mapped.MatronId);
      patron = await getKittyById(mapped.PatronId);
      mapped.Generation = Math.max(matron.Generation, patron.Generation) + 1;
    }
    const res = await sqlClient.insert(
      schema.Tables.Kitties.Name,
      mapped,
    );
    return res;
  }

  function getCooldownIndex(kitty) {
    let res = kitty.Generation + kitty.ChildrenCount;
    if (res > 13) {
      res = 13;
    }
    return res;
  }

  async function updateKittyCooldown(data) {
    const mapped = mapper.mapData('Pregnant', data);

    let where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.MatronId}`;
    let set = `${schema.Tables.Kitties.Fields.NextActionAt.Name}=${mapped.NextActionAt}`;
    const matronUpdate = sqlClient.getUpdateStatement(schema.Tables.Kitties.Name, set, where);

    // we don't know exact sire's cooldown end block at the moment of event issue
    // since we don't know number of sire's children at specified block number
    // we can use current sire cooldown index to check if sire is currenlty resting
    const patron = await getKittyById(mapped.PatronId);
    const cooldownIndex = getCooldownIndex(patron);
    where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.PatronId}`;
    const value = `SELECT ${schema.Tables.Cooldowns.Fields.CooldownBlocks.Name} ` +
      `+ ${mapped.BlockNumber} FROM ${schema.Tables.Cooldowns.Name} WHERE ID=${cooldownIndex}`;
    set = `${schema.Tables.Kitties.Fields.NextActionAt.Name}=(${value})`;
    const patronUpdate = sqlClient.getUpdateStatement(schema.Tables.Kitties.Name, set, where);
    await sqlClient.runStatements([matronUpdate, patronUpdate]);
  }

  async function updateKittyOwner(data) {
    const mapped = mapper.mapData('Transfer', data);

    const ownerId = await getOrAddOwner(mapped.To);
    const where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.ID}`;
    const set = `${schema.Tables.Kitties.Fields.Owner.Name}=${ownerId}`;

    await sqlClient.update(schema.Tables.Kitties.Name, set, where);
  }

  async function getTraits() {
    const join = `${schema.Tables.TraitTypes.Name} AS l ` +
    `ON t.${schema.Tables.Traits.Fields.TraitTypeID.Name}=l.${schema.Tables.TraitTypes.Fields.ID.Name}`;
    const res = await sqlClient.all(
      `${schema.Tables.Traits.Name} AS t`,
      [
        `t.${schema.Tables.Traits.Fields.ID.Name}`,
        `t.${schema.Tables.Traits.Fields.Name.Name}`,
        schema.Tables.Traits.Fields.TraitTypeID.Name,
        schema.Tables.Traits.Fields.DominantGen0.Name,
        `l.${schema.Tables.TraitTypes.Fields.Name.Name} AS Location`,
      ],
      null,
      null,
      null,
      join,
    );
    return res;
  }

  async function getKitties(query, orderBy = null, limit = 100) {
    const fields = schema.getFieldsOfTable(schema.Tables.Kitties).map(f => `k.${f.Name}`);
    const rows = await sqlClient.all(
      `${schema.Tables.Kitties.Name} AS k`,
      fields,
      query,
      orderBy || [`k.${schema.Tables.Kitties.Fields.ID.Name} DESC`],
      limit,
    );
    let res;
    if (rows && rows.length && limit) {
      // get total if limit is specified for pagination
      const total = await sqlClient.get(
        `${schema.Tables.Kitties.Name} AS k`,
        ['COUNT(*) AS cnt'],
        query,
      );
      res = { rows, total: total.cnt };
    } else {
      res = rows;
    }
    return res;
  }

  async function getKittiesWithAuctions(query, orderBy = null, limit = 100) {
    const kittyFields = schema.getFieldsOfTable(schema.Tables.Kitties).map(f => `k.${f.Name}`);
    const auctionFields = [
      schema.Tables.Auctions.Fields.StartedBlock,
      schema.Tables.Auctions.Fields.Duration,
      schema.Tables.Auctions.Fields.StartPrice,
      schema.Tables.Auctions.Fields.EndPrice,
    ].map(f => `a.${f.Name} AS Auction${f.Name}`);
    const fields = kittyFields.concat(auctionFields);
    const join = `${schema.Tables.Auctions.Name} AS a ON a.${schema.Tables.Auctions.Fields.KittyId.Name} = k.${schema.Tables.Kitties.Fields.ID.Name} ` +
    `AND a.${schema.Tables.Auctions.Fields.Status.Name} = 1`;
    const rows = await sqlClient.all(
      `${schema.Tables.Kitties.Name} AS k`,
      fields,
      query,
      orderBy || [`k.${schema.Tables.Kitties.Fields.ID.Name} DESC`],
      limit,
      join,
      true,
    );
    let res;
    if (rows && rows.length && limit) {
      // get total if limit is specified for pagination
      const total = await sqlClient.get(
        schema.Tables.Kitties.Name,
        ['COUNT(*) AS cnt'],
        query,
      );
      res = { rows, total: total.cnt };
    } else {
      res = rows;
    }
    return res;
  }


  async function addAuction(data, type) {
    const eventData = data;
    const mapped = mapper.mapData('AuctionCreated', eventData);
    mapped[schema.Tables.Auctions.Fields.Type.Name] = type;

    const res = await sqlClient.insert(
      schema.Tables.Auctions.Name,
      mapped,
    );
    return res;
  }

  async function cancelAuction(data, type) {
    const eventData = data;
    const mapped = mapper.mapData('AuctionCancelled', eventData);
    const { Auctions } = schema.Tables;
    mapped[Auctions.Fields.Type.Name] = type;
    const where = `${Auctions.Fields.ID.Name}=(SELECT ID FROM ${Auctions.Name} ` +
    `WHERE ${Auctions.Fields.StartedBlock.Name} < ${mapped[Auctions.Fields.EndedBlock.Name]} ` +
    `AND  ${Auctions.Fields.KittyId.Name}=${mapped[Auctions.Fields.KittyId.Name]} ` +
    `ORDER BY ${Auctions.Fields.StartedBlock.Name} DESC LIMIT 1)`;

    const set = `${Auctions.Fields.Status.Name}=${mapped[Auctions.Fields.Status.Name]},` +
      `${Auctions.Fields.EndedBlock.Name}=${mapped[Auctions.Fields.EndedBlock.Name]}`;

    await sqlClient.update(Auctions.Name, set, where);
  }

  async function completeAuction(data, type) {
    const eventData = data;
    const mapped = mapper.mapData('AuctionSuccessful', eventData);
    const { Auctions } = schema.Tables;
    mapped[Auctions.Fields.Type.Name] = type;
    const buyer = mapped[Auctions.Fields.Buyer.Name];
    const buyerId = await getOrAddOwner(buyer);

    const where = `${Auctions.Fields.ID.Name}=(SELECT ID FROM ${Auctions.Name} ` +
    `WHERE ${Auctions.Fields.StartedBlock.Name} < ${mapped[Auctions.Fields.EndedBlock.Name]} ` +
    `AND  ${Auctions.Fields.KittyId.Name}=${mapped[Auctions.Fields.KittyId.Name]} ` +
    `ORDER BY ${Auctions.Fields.StartedBlock.Name} DESC LIMIT 1)`;

    const set = `${Auctions.Fields.Status.Name}=${mapped[Auctions.Fields.Status.Name]},` +
    `${Auctions.Fields.Buyer.Name}=${buyerId},` +
    `${Auctions.Fields.BuyPrice.Name}=${mapped[Auctions.Fields.BuyPrice.Name]},` +
    `${Auctions.Fields.EndedBlock.Name}=${mapped[Auctions.Fields.EndedBlock.Name]}`;

    await sqlClient.update(Auctions.Name, set, where);
  }

  this.open = open;
  this.close = close;
  this.getEventLastSync = getEventLastSync;
  this.addKitty = addKitty;
  this.updateKittyCooldown = updateKittyCooldown;
  this.updateEventLastSync = updateEventLastSync;
  this.updateKittyOwner = updateKittyOwner;
  this.getTraits = getTraits;
  this.getKitties = getKitties;
  this.getKittiesWithAuctions = getKittiesWithAuctions;
  this.addAuction = addAuction;
  this.cancelAuction = cancelAuction;
  this.completeAuction = completeAuction;
  this.queryParser = new QueryParser(this);
}

module.exports = Database;
