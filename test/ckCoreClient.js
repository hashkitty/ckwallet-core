let assert = require('assert');
let CryptoKittiesClient = require('../ethereum/cryptokitties-client');

describe('keymanager', function() {
    it('should create CK core client with provided configuration', function(done) {
        let config = require("../config/ethereum-config.json");
        let client = new CryptoKittiesClient(config);
        done();
    });
})