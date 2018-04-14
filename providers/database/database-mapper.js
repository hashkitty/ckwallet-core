const { Tables } = require('./database-schema');

function DatabaseMapper() {
  const tableNameMapping = {};
  const tableFieldMapping = {};

  function addTableMapping(table, eventName) {
    tableNameMapping[eventName] = table;
  }

  function addFieldMapping(tableName, fieldName, func) {
    tableFieldMapping[tableName.Name] = tableFieldMapping[tableName.Name] || {};
    tableFieldMapping[tableName.Name][fieldName.Name] = func;
  }
  function toHexString(buffer) {
    let res = '0x';
    for (let i = 0; i < buffer.length; i += 1) {
      res += buffer[i].toString(16);
    }
    return res;
  }
  function addressToBuffer(value) {
    const res = [];
    let hex = value;
    if (hex.startsWith('0x')) {
      hex = value.substring(2);
    }
    if (hex.length !== 40) {
      throw new Error('invalid address string length');
    }
    for (let i = 0; i < 39; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16);
      res.push(byte);
    }
    return Buffer.from(res);
  }

  function genesToInt(bn, start) {
    // convert each gen to its own byte for ease of query
    let res = 0;
    for (let i = start; i < start + 4; i += 1) {
      const gen = bn.shiftRight(i * 5).modInt(32);
      res |= gen << 8 * i;// eslint-disable-line no-bitwise
    }
    return res;
  }

  function mapData(objectName, data) {
    const tableName = tableNameMapping[objectName].Name;
    const res = {};
    const fieldMappings = tableFieldMapping[tableName];
    const fieldNames = Object.keys(fieldMappings);
    fieldNames.forEach((fieldName) => {
      const mapping = fieldMappings[fieldName];
      res[fieldName] = mapping(data);
    });
    return res;
  }

  // map owner from address string
  addTableMapping(Tables.Owners, 'Owner');
  addFieldMapping(Tables.Owners, Tables.Owners.Fields.Address, v => toHexString(v));

  // map kitty from Birth event data
  const kitties = Tables.Kitties;
  addTableMapping(kitties, 'Birth');
  addFieldMapping(kitties, kitties.Fields.ID, v => parseInt(v.returnValues.kittyId, 10));
  addFieldMapping(kitties, kitties.Fields.GenesBody, v => genesToInt(v.genes, 0));
  addFieldMapping(kitties, kitties.Fields.GenesPattern, v => genesToInt(v.genes, 4));
  addFieldMapping(kitties, kitties.Fields.GenesEyeColor, v => genesToInt(v.genes, 8));
  addFieldMapping(kitties, kitties.Fields.GenesEyeType, v => genesToInt(v.genes, 12));
  addFieldMapping(kitties, kitties.Fields.GenesBodyColor, v => genesToInt(v.genes, 16));
  addFieldMapping(kitties, kitties.Fields.GenesPatternColor, v => genesToInt(v.genes, 20));
  addFieldMapping(kitties, kitties.Fields.GenesAccentColor, v => genesToInt(v.genes, 24));
  addFieldMapping(kitties, kitties.Fields.GenesWild, v => genesToInt(v.genes, 28));
  addFieldMapping(kitties, kitties.Fields.GenesMouth, v => genesToInt(v.genes, 32));
  addFieldMapping(kitties, kitties.Fields.GenesUnknown1, v => genesToInt(v.genes, 36));
  addFieldMapping(kitties, kitties.Fields.GenesUnknown2, v => genesToInt(v.genes, 40));
  addFieldMapping(kitties, kitties.Fields.GenesUnknown3, v => genesToInt(v.genes, 44));
  addFieldMapping(kitties, kitties.Fields.Generation, () => 0);
  addFieldMapping(kitties, kitties.Fields.MatronId, v => parseInt(v.returnValues.matronId, 10));
  addFieldMapping(kitties, kitties.Fields.PatronId, v => parseInt(v.returnValues.sireId, 10));
  addFieldMapping(kitties, kitties.Fields.BirthBlock, v => parseInt(v.blockNumber, 10));
  addFieldMapping(kitties, kitties.Fields.Owner, v => addressToBuffer(v.returnValues.owner));
  addFieldMapping(kitties, kitties.Fields.ChildrenCount, () => 0);
  addFieldMapping(kitties, kitties.Fields.NextActionAt, () => 0);

  // map kitty from Pregnant event data
  const pregnant = Tables.PregnantEvents;
  addTableMapping(pregnant, 'Pregnant');
  addFieldMapping(pregnant, pregnant.Fields.MatronId, v => parseInt(v.returnValues.matronId, 10));
  addFieldMapping(pregnant, pregnant.Fields.PatronId, v => parseInt(v.returnValues.sireId, 10));
  addFieldMapping(
    pregnant,
    pregnant.Fields.NextActionAt,
    v => parseInt(v.returnValues.cooldownEndBlock, 10),
  );
  addFieldMapping(pregnant, pregnant.Fields.BlockNumber, v => parseInt(v.blockNumber, 10));

  // map kitty from Pregnant event data
  const transfer = Tables.Transfers;
  addTableMapping(transfer, 'Transfer');
  addFieldMapping(transfer, transfer.Fields.From, v => addressToBuffer(v.returnValues.from));
  addFieldMapping(transfer, transfer.Fields.To, v => addressToBuffer(v.returnValues.to));
  addFieldMapping(transfer, transfer.Fields.ID, v => parseInt(v.returnValues.tokenId, 10));
  addFieldMapping(transfer, transfer.Fields.BlockNumber, v => parseInt(v.blockNumber, 10));

  this.mapData = mapData;
  this.toHexString = toHexString;
}

module.exports = DatabaseMapper;
