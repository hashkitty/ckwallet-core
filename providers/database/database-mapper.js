let schema = require("./database-schema");
let {BigInteger} = require("BigNumber");

function DatabaseMapper() {
    let tableNameMapping = {};
    let tableFieldMapping = {};

    //map owner from address string
    addTableMapping(schema.Tables.Owners, "Owner");
    addFieldMapping(schema.Tables.Owners, schema.Tables.Owners.Fields.Address, v => toHexString(v));

    //map kitty from Birth event data
    addTableMapping(schema.Tables.Kitties, "Birth");
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.ID, v => parseInt(v.returnValues["kittyId"]));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesBody, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 0));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesPattern, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 4));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesEyeColor, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 8));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesEyeType, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 12));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesBodyColor, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 16));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesPatternColor, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 20));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesAccentColor, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 24));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesWild, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 28));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesMouth, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 32));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesUnknown1, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 36));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesUnknown2, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 40));
    addFieldMapping(schema.Tables.Kitties, schema.Tables.Kitties.Fields.GenesUnknown3, v => genesToInt(v.genes || (v.genes = new BigInteger(v.returnValues["genes"])), 44));
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
    
    function genesToInt(bn, start) {
        //convert each gen to its own byte for ease of query
        let res = 0;
        for(var i = start; i < start + 4; i++) {
            let gen =  bn.shiftRight(i * 5).modInt(32);
            res |= gen << 8*i;
        }
        return res;
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