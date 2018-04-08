function tableField(name, nullable) {
  return {
    Name: name,
    Nullable: nullable,
  };
}

exports.AuctionTypes = {
  Sales: 1,
  Sire: 2,
};

exports.Tables = {
  Kitties: {
    Name: 'Kitties',
    Fields: {
      ID: tableField('ID', false),
      GenesBody: tableField('GenesBody', false),
      GenesPattern: tableField('GenesPattern', false),
      GenesEyeColor: tableField('GenesEyeColor', false),
      GenesEyeType: tableField('GenesEyeType', false),
      GenesBodyColor: tableField('GenesBodyColor', false),
      GenesPatternColor: tableField('GenesPatternColor', false),
      GenesAccentColor: tableField('GenesAccentColor', false),
      GenesWild: tableField('GenesWild', false),
      GenesMouth: tableField('GenesMouth', false),
      GenesUnknown1: tableField('GenesUnknown1', false),
      GenesUnknown2: tableField('GenesUnknown2', false),
      GenesUnknown3: tableField('GenesUnknown3', false),
      Generation: tableField('Generation', false),
      MatronId: tableField('MatronId', false),
      PatronId: tableField('PatronId', false),
      BirthBlock: tableField('BirthBlock', false),
      Breeder: tableField('Breeder', false),
      Owner: tableField('Owner', false),
      ChildrenCount: tableField('ChildrenCount', true),
      NextActionAt: tableField('NextActionAt', true),
    },
  },
  Owners: {
    Name: 'Owners',
    Fields: {
      ID: tableField('ID', false),
      Address: tableField('Address', false),
    },
  },
  Auctions: {
    Name: 'Auctions',
    Fields: {
      ID: tableField('ID', false),
      KittyId: tableField('KittyId', false),
      Seller: tableField('Seller', false),
      StartedBlock: tableField('StartedBlock', false),
      Type: tableField('Type', false),
      Status: tableField('Status', false),
      EndedBlock: tableField('EndedBlock', false),
      StartPrice: tableField('StartPrice', false),
      EndPrice: tableField('EndPrice', false),
      BuyPrice: tableField('BuyPrice', false),
      Duration: tableField('Duration', false),
      Buyer: tableField('Buyer', false),
      BuyBlock: tableField('BuyBlock', false),
    },
  },
  ImportHistory: {
    Name: 'ImportHistory',
    Fields: {
      EventName: tableField('EventName', false),
      BlockNumber: tableField('BlockNumber', false),
    },
  },
  Cooldowns: {
    Name: 'Cooldowns',
    Fields: {
      ID: tableField('ID', false),
      CooldownBlocks: tableField('CooldownBlocks', false),
    },
  },
  PregnantEvents: {
    Name: 'PregnantEvents',
    Fields: {
      MatronId: tableField('MatronId', false),
      PatronId: tableField('PatronId', false),
      NextActionAt: tableField('NextActionAt', false),
      BlockNumber: tableField('BlockNumber', false),
    },
  },
  Transfers: {
    Name: 'Transfer',
    Fields: {
      ID: tableField('ID', false),
      From: tableField('From', false),
      To: tableField('To', false),
      BlockNumber: tableField('BlockNumber', false),
    },
  },
  Traits: {
    Name: 'Traits',
    Fields: {
      ID: tableField('ID', false),
      TraitTypeID: tableField('TraitTypeID', false),
      Name: tableField('Name', false),
      DominantGen0: tableField('DominantGen0', false),
    },
  },
  TraitTypes: {
    Name: 'TraitTypes',
    Fields: {
      ID: tableField('ID', false),
      Name: tableField('Name', false),
    },
  },
};

function getFieldsOfTable(table) {
  const res = Object.values(table.Fields);
  return res;
}
exports.getFieldsOfTable = getFieldsOfTable;
