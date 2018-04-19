const assert = require('assert');
const Database = require('../providers/database/database');
const config = require('../config/config.local.json');

describe('database-query', () => {
  // it('should get kitties with auction data', async () => {
  //   const database = new Database(config.database);
  //   await database.open();
  //   const res = await database.getKittiesWithAuctions(null, null, 20);
  //   assert(res && res.rows && res.rows.length === 20, 'Invalid result');
  // }).timeout(10000);

  it('should get kitties with auction data with query and orderby', async () => {
    const database = new Database(config.database);
    await database.open();
    const res = await database.getKittiesWithAuctions('k.GenesEyeType & 255 = 6', ['k.ID DESC'], 20);
    assert(res && res.rows && res.rows.length === 20, 'Invalid result');
  }).timeout(10000);
});
