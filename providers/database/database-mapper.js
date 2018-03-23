let schema = require("./database-schema");
let BN = require("BigNumber");

function DatabaseMapper() {
    let tableNameMapping = {};
    let tableFieldMapping = {};

    //map owner from address string
    addTableMapping(schema.Tables.Owners, "Owner");
    addFieldMapping(schema.Tables.Owners, schema.Tables.Owners.Fields.Address, v => toHexString(v));

    //map kitty from Birth event data
    addTableMapping(schema.Tables.Kitties, "Birth");
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.ID, v => parseInt(v.returnValues["kittyId"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.Genes, v => genesToBuffer(v.returnValues["genes"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.Generation, v => 0);
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.MatronId, v => parseInt(v.returnValues["matronId"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.PatronId, v => parseInt(v.returnValues["sireId"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.BirthBlock, v => parseInt(v.blockNumber));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.Owner,  v => addressToBuffer(v.returnValues["owner"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.ChildrenCount, v => 0);
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.NextActionAt, v => 0);

    //map kitty from Pregnant event data
    addTableMapping(schema.Tables.PregnantEvents, "Pregnant");
    addFieldMapping(schema.Tables.PregnantEvents, schema.Tables.PregnantEvents.Fields.MatronId, v => parseInt(v.returnValues["matronId"]));
    addFieldMapping(schema.Tables.PregnantEvents, schema.Tables.PregnantEvents.Fields.PatronId, v => parseInt(v.returnValues["sireId"]));
    addFieldMapping(schema.Tables.PregnantEvents, schema.Tables.PregnantEvents.Fields.NextActionAt, v => parseInt(v.returnValues["cooldownEndBlock"]));
    addFieldMapping(schema.Tables.PregnantEvents, schema.Tables.PregnantEvents.Fields.BlockNumber, v =>  parseInt(v.blockNumber));

    //map kitty from Pregnant event data
    addTableMapping(schema.Tables.Transfers, "Transfer");
    addFieldMapping(schema.Tables.Transfers, schema.Tables.Transfers.Fields.From, v => addressToBuffer(v.returnValues["from"]));
    addFieldMapping(schema.Tables.Transfers, schema.Tables.Transfers.Fields.To, v => addressToBuffer(v.returnValues["to"]));
    addFieldMapping(schema.Tables.Transfers, schema.Tables.Transfers.Fields.ID, v => parseInt(v.returnValues["tokenId"]));
    addFieldMapping(schema.Tables.Transfers, schema.Tables.Transfers.Fields.BlockNumber, v =>  parseInt(v.blockNumber));
    
    function addTableMapping(table, eventName) {
        tableNameMapping[eventName] = table;
    }

    function addFieldMapping(tableName, fieldName, func) {
        tableFieldMapping[tableName.Name] = tableFieldMapping[tableName.Name] || {};
        tableFieldMapping[tableName.Name][fieldName.Name] = func
    }
    function toHexString(buffer) {
        let res = "0x";
        for(let i=0; i < buffer.length; i++) {
            res += buffer[i].toString(16);
        }
        return res;
    }
    function addressToBuffer(value) {
        res = [];
        if(value.startsWith("0x")) {
            value = value.substring(2);
        }
        if(value.length != 40) {
            throw new Error("invalid address string length");
        }
        for(let i=0; i < 39; i += 2) {
            let byte = parseInt(value.substring(i, i + 2), 16);
            res.push(byte);
        }
        return new Buffer(res);
    }
    
    function genesToBuffer(value) {
        let res = []
        let bn = new BN.BigInteger(value);
        for(var i=0; i < 32; i++) {
            let gen = bn.shiftRight(i * 8).modInt(256);
            res.push(gen);
        }
        return new Buffer(res);
    }
    function priceToEther(value) {
        let price = utils.fromWei(value, "ether");
        return parseFloat(price);
    }

    function mapData(objectName, data) {
        let tableName = tableNameMapping[objectName].Name;
        let res = {};
        let fieldMappings = tableFieldMapping[tableName];
        for(var fieldName in fieldMappings) {
            let mapping = fieldMappings[fieldName];
            res[fieldName] = mapping(data);
        }
        return res;
    }

    this.mapData  = mapData;
    this.toHexString = toHexString;
}

module.exports = DatabaseMapper;