let assert = require('assert');
let CryptoKittiesClient = require('../providers/ethereum/cryptokitties-client');

describe('keymanager', function() {
    it('should create CK core client with provided configuration', function(done) {
        let config = require("../config/config.local.json");
        let client = new CryptoKittiesClient(config);
        done();
    });
});