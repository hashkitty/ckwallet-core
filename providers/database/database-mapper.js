const { Tables } = require('./database-schema');
const utils = require('web3-utils');

function DatabaseMapper() {
  const tableFieldMapping = {};

  function addFieldMapping(name, field, func) {
    tableFieldMapping[name] = tableFieldMapping[name] || {};
    tableFieldMapping[name][field.Name] = func;
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

  function mapData(name, data) {
    const res = {};
    const fieldMappings = tableFieldMapping[name];
    const fieldNames = Object.keys(fieldMappings);
    fieldNames.forEach((fieldName) => {
      const mapping = fieldMappings[fieldName];
      res[fieldName] = mapping(data);
    });
    return res;
  }

  function priceToEther(value) {
    const price = utils.fromWei(value, 'ether');
    return parseFloat(price);
  }
  // map owner from address string
  addFieldMapping('Owner', Tables.Owners.Fields.Address, v => toHexString(v));

  // map kitty from Birth event data
  const kitties = Tables.Kitties;
  addFieldMapping('Birth', kitties.Fields.ID, v => parseInt(v.returnValues.kittyId, 10));
  addFieldMapping('Birth', kitties.Fields.GenesBody, v => genesToInt(v.genes, 0));
  addFieldMapping('Birth', kitties.Fields.GenesPattern, v => genesToInt(v.genes, 4));
  addFieldMapping('Birth', kitties.Fields.GenesEyeColor, v => genesToInt(v.genes, 8));
  addFieldMapping('Birth', kitties.Fields.GenesEyeType, v => genesToInt(v.genes, 12));
  addFieldMapping('Birth', kitties.Fields.GenesBodyColor, v => genesToInt(v.genes, 16));
  addFieldMapping('Birth', kitties.Fields.GenesPatternColor, v => genesToInt(v.genes, 20));
  addFieldMapping('Birth', kitties.Fields.GenesAccentColor, v => genesToInt(v.genes, 24));
  addFieldMapping('Birth', kitties.Fields.GenesWild, v => genesToInt(v.genes, 28));
  addFieldMapping('Birth', kitties.Fields.GenesMouth, v => genesToInt(v.genes, 32));
  addFieldMapping('Birth', kitties.Fields.GenesUnknown1, v => genesToInt(v.genes, 36));
  addFieldMapping('Birth', kitties.Fields.GenesUnknown2, v => genesToInt(v.genes, 40));
  addFieldMapping('Birth', kitties.Fields.GenesUnknown3, v => genesToInt(v.genes, 44));
  addFieldMapping('Birth', kitties.Fields.Generation, () => 0);
  addFieldMapping('Birth', kitties.Fields.MatronId, v => parseInt(v.returnValues.matronId, 10));
  addFieldMapping('Birth', kitties.Fields.PatronId, v => parseInt(v.returnValues.sireId, 10));
  addFieldMapping('Birth', kitties.Fields.BirthBlock, v => parseInt(v.blockNumber, 10));
  addFieldMapping('Birth', kitties.Fields.Owner, v => addressToBuffer(v.returnValues.owner));
  addFieldMapping('Birth', kitties.Fields.ChildrenCount, () => 0);
  addFieldMapping('Birth', kitties.Fields.NextActionAt, () => 0);

  // map kitty from Pregnant event data
  const pregnant = Tables.PregnantEvents;
  addFieldMapping('Pregnant', pregnant.Fields.MatronId, v => parseInt(v.returnValues.matronId, 10));
  addFieldMapping('Pregnant', pregnant.Fields.PatronId, v => parseInt(v.returnValues.sireId, 10));
  addFieldMapping(
    'Pregnant',
    pregnant.Fields.NextActionAt,
    v => parseInt(v.returnValues.cooldownEndBlock, 10),
  );
  addFieldMapping('Pregnant', pregnant.Fields.BlockNumber, v => parseInt(v.blockNumber, 10));

  // map kitty from Pregnant event data
  const transfer = Tables.Transfers;
  addFieldMapping('Transfer', transfer.Fields.From, v => addressToBuffer(v.returnValues.from));
  addFieldMapping('Transfer', transfer.Fields.To, v => addressToBuffer(v.returnValues.to));
  addFieldMapping('Transfer', transfer.Fields.ID, v => parseInt(v.returnValues.tokenId, 10));
  addFieldMapping('Transfer', transfer.Fields.BlockNumber, v => parseInt(v.blockNumber, 10));

  // map auction from AuctionCreated event data
  const auctions = Tables.Auctions;
  addFieldMapping('AuctionCreated', auctions.Fields.KittyId, v => parseInt(v.returnValues.tokenId, 10));
  addFieldMapping('AuctionCreated', auctions.Fields.Status, () => 1);
  addFieldMapping('AuctionCreated', auctions.Fields.Duration, v => parseInt(v.returnValues.duration, 10));
  addFieldMapping('AuctionCreated', auctions.Fields.StartedBlock, v => parseInt(v.blockNumber, 10));
  addFieldMapping(
    'AuctionCreated', auctions.Fields.StartPrice,
    v => priceToEther(v.returnValues.startingPrice),
  );
  addFieldMapping(
    'AuctionCreated', auctions.Fields.EndPrice,
    v => priceToEther(v.returnValues.endingPrice),
  );

  // map auction from AuctionCancelled event data
  addFieldMapping('AuctionCancelled', auctions.Fields.KittyId, v => parseInt(v.returnValues.tokenId, 10));
  addFieldMapping('AuctionCancelled', auctions.Fields.Status, () => 3);
  addFieldMapping('AuctionCancelled', auctions.Fields.EndedBlock, v => parseInt(v.blockNumber, 10));

  // map auction from AuctionSuccessful event data
  addFieldMapping('AuctionSuccessful', auctions.Fields.KittyId, v => parseInt(v.returnValues.tokenId, 10));
  addFieldMapping('AuctionSuccessful', auctions.Fields.Status, () => 2);
  addFieldMapping('AuctionSuccessful', auctions.Fields.EndedBlock, v => parseInt(v.blockNumber, 10));
  addFieldMapping('AuctionSuccessful', auctions.Fields.BuyPrice, v => priceToEther(v.returnValues.totalPrice));
  addFieldMapping('AuctionSuccessful', auctions.Fields.Buyer, v => addressToBuffer(v.returnValues.winner));

  this.mapData = mapData;
  this.toHexString = toHexString;
}

module.exports = DatabaseMapper;
