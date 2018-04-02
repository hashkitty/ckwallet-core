let SqlClient = require("./sql-client");
let DatabaseMapper = require("./database-mapper");
let schema = require("./database-schema");
let constants = require("./constants");
let Cache = require("./cache");

function Database(config) {
    let cache = new Cache();
    let sqlClient = new SqlClient(config);
    let mapper = new DatabaseMapper();

    function open(fast) {
        return sqlClient.open(fast);
    }
    function close() {
        return sqlClient.close();
    }

    async function getLastKittyBlock() {
        let res = 0;
        let row = await sqlClient.get(
            schema.Tables.Kitties.Name, 
            [schema.Tables.Kitties.Fields.BirthBlock.Name],
            undefined,
            [`${schema.Tables.Kitties.Fields.ID.Name} DESC`]
        );
        if(row) {
            res = row[schema.Tables.Kitties.Fields.BirthBlock.Name];
        }
        return res;
    }

    async function getImportHistoryBlockNumber(eventName) {
        let res = 0;
        let where = `${schema.Tables.ImportHistory.Fields.EventName.Name}='${eventName}'`
        let row = await sqlClient.get(
            schema.Tables.ImportHistory.Name, 
            [schema.Tables.ImportHistory.Fields.BlockNumber.Name],
            where);
        if(row) {
            res = row[schema.Tables.ImportHistory.Fields.BlockNumber.Name];
        }
        return res;
    }

    async function getEventLastSync(eventName) {
        let res = 0;
        switch(eventName) {
            case "Birth":
                res = await getLastKittyBlock();
            break;
            default:
                res = await getImportHistoryBlockNumber(eventName);
            break;
        }
        return res < constants.ckCoreCreationBlock ? constants.ckCoreCreationBlock : res;;
    }
    async function updateEventLastSync(eventName, blockNumber) {
        switch(eventName) {
            case "Birth":
            //no need to do anything for this event, last sync block can be calculated
            break;
            default:
                let where = `${schema.Tables.ImportHistory.Fields.EventName.Name}="${eventName}"`;
                let set = `${schema.Tables.ImportHistory.Fields.BlockNumber.Name}=${blockNumber}`;
                await sqlClient.update(schema.Tables.ImportHistory.Name, set, where);
            break;
        }
    }


    async function getOrAddOwner(address) {
        let hexAddress = mapper.toHexString(address)
        let cacheKey = `getOrAddOwner(${hexAddress})`;
        //read from memory cache if possible
        let res = await cache.getOrAdd(cacheKey, async function() {
            let where = `${schema.Tables.Owners.Fields.Address.Name}='${hexAddress}'`;
            let owner = await sqlClient.get(
                schema.Tables.Owners.Name, 
                [schema.Tables.Owners.Fields.ID.Name],
                where);
            if(!owner) {
                let newOwner = mapper.mapData("Owner", address);
                let ownerId = await sqlClient.insert(schema.Tables.Owners.Name, newOwner);
                owner = {ID: ownerId};
            }
            return owner.ID;
        });
        return res;
    }

    async function getKittyById(id, updateCache) {
        let cacheKey = `getKittyById(${id})`;
        //read from memory cache if possible
        let res = await cache.getOrAdd(cacheKey, async function() {
            let fields = schema.getFieldsOfTable(schema.Tables.Kitties).map(f => f.Name);
            let where = `${schema.Tables.Kitties.Fields.ID.Name}=${id}`;
            let kitty = await sqlClient.get(
                schema.Tables.Kitties.Name, 
                fields,
                where);
            return kitty;
        });
        return res;
    }

    async function addKitty(data) {
        let mapped = mapper.mapData("Birth", data);
        let owner = mapped.Owner;
        let ownerId = await getOrAddOwner(owner);
        mapped.Owner = ownerId;
        mapped.Breeder = ownerId;
        let matron;
        let patron;
        if(mapped.MatronId != 0) {
            //TODO run this in parallel 
            matron = await getKittyById(mapped.MatronId);
            patron = await getKittyById(mapped.PatronId);
            mapped.Generation = Math.max(matron.Generation, patron.Generation) + 1;
        }
        let res = await sqlClient.insert(
            schema.Tables.Kitties.Name,
            mapped);
        return res;
    }

    function getCooldownIndex(kitty) {
        let res = kitty.Generation + kitty.ChildrenCount;
        if(res > 13) {
            res = 13;
        }
        return res;
    }

    async function updateKittyCooldown(data) {
        let mapped = mapper.mapData("Pregnant", data);
        
        let where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.MatronId}`;
        let set = `${schema.Tables.Kitties.Fields.NextActionAt.Name}=${mapped.NextActionAt}`;
        let matronUpdate = sqlClient.getUpdateStatement(schema.Tables.Kitties.Name, set, where);

        //we don't know exact sire's cooldown end block at the moment of event issue
        //since we don't know number of sire's children at specified block number
        //we can use current sire cooldown index to check if sire is currenlty resting
        let patron = await getKittyById(mapped.PatronId);
        let cooldownIndex = getCooldownIndex(patron);
        where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.PatronId}`;
        let value = `SELECT ${schema.Tables.Cooldowns.Fields.CooldownBlocks.Name} `+ 
        `+ ${mapped.BlockNumber} FROM ${schema.Tables.Cooldowns.Name} WHERE ID=${cooldownIndex}`;
        set = `${schema.Tables.Kitties.Fields.NextActionAt.Name}=(${value})`;
        let patronUpdate = sqlClient.getUpdateStatement(schema.Tables.Kitties.Name, set, where);
        await sqlClient.runStatements([matronUpdate, patronUpdate]);
    }

    async function updateKittyOwner(data) {
        let mapped = mapper.mapData("Transfer", data);

        let ownerId = await getOrAddOwner(mapped.To);
        let where = `${schema.Tables.Kitties.Fields.ID.Name}=${mapped.ID}`;
        let set = `${schema.Tables.Kitties.Fields.Owner.Name}=${ownerId}`;

        await sqlClient.update(schema.Tables.Kitties.Name, set, where);
    }

    async function getTraits() {
        let res = await sqlClient.all(
            schema.Tables.Traits.Name,
            [
                schema.Tables.Traits.Fields.ID.Name,
                schema.Tables.Traits.Fields.Name.Name,
                schema.Tables.Traits.Fields.TraitTypeID.Name,
                schema.Tables.Traits.Fields.DominantGen0.Name
            ]
        );
        return res;
    }

    async function getKitties(query, limit) {
        let fields = schema.getFieldsOfTable(schema.Tables.Kitties);
        let res = await sqlClient.all(
            schema.Tables.Kitties.Name,
            fields,
            query
        );
        return res;
        
    }

    this.open = open;
    this.close = close;
    this.getEventLastSync = getEventLastSync;
    this.addKitty = addKitty;
    this.updateKittyCooldown = updateKittyCooldown;
    this.updateEventLastSync = updateEventLastSync;
    this.updateKittyOwner = updateKittyOwner;
    this.getTraits = getTraits;
    this.getKitties = getKitties
}

module.exports = Database;
