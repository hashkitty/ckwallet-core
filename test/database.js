const assert = require('assert');
const Database = require('../providers/database/database');
const config = require('../config/config.local.json');

async function throwsAsync(block, expectedMessage) {
  try {
    await block();
    assert(0, 'No error when expected');
  } catch (e) {
    assert(e.message.includes(expectedMessage));
  }
}


describe('database', () => {
  it('should throw errros when invalid orderBy argument', async () => {
    const database = new Database(config.database);
    await database.open();
    // test positive
    await database.getKitties();

    await throwsAsync(async () => {
      await database.getKitties(null, 'test');
    }, 'Invalid arg');

    await throwsAsync(async () => {
      await database.getKitties(null, ['test', ';--test']);
    }, 'Invalid arg');
  }).timeout(5000);
});
