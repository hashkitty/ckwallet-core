const assert = require('assert');
const CryptoKittiesClient = require('../providers/ethereum/cryptokitties-client');
const config = require('../config/config.local.json');

describe('keymanager', () => {
  it('should create CK core client with provided configuration', (done) => {
    const client = new CryptoKittiesClient(config);
    assert(client);
    done();
  });
});
