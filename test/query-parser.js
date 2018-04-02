let assert = require('assert');
let QueryParser = require('../providers/database/query-parser');
let Database = require("../providers/database/database");

describe('query-parser', function() {
    it('should produce valid virgin query', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("virgin");
        assert(res.toLowerCase() == "childrencount=0", `invalid result ${res}`);
        done();
    });
    it('should produce valid generation query', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("gen:0");
        assert(res.toLowerCase() == "generation=0", `invalid result ${res}`);
        res = parser.translateUserInput("gen:100");
        assert(res.toLowerCase() == "generation=100", `invalid result ${res}`);
        done();
    });

    it('should make valid query composition if no operator', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("virgin gen:0");
        assert(res.toLowerCase() == "childrencount=0 and generation=0", `invalid result ${res}`);
        done();
    });

    it('should make valid query composition with AND operation', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("virgin and gen:0 and gen:1");
        assert(res.toLowerCase() == "childrencount=0 and generation=0 and generation=1", `invalid result ${res}`);
        done();
    });

    it('should make valid query composition with OR operation', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("virgin or gen:0 or gen:1");
        assert(res.toLowerCase() == "childrencount=0 or generation=0 or generation=1", `invalid result ${res}`);
        done();
    });

    it('should make valid query composition with combination of operations', function(done) {
        let parser = new QueryParser();
        let res = parser.translateUserInput("virgin or gen:0 and gen:1 gen:2");
        assert(res.toLowerCase() == "childrencount=0 or generation=0 and generation=1 and generation=2", `invalid result ${res}`);
        res = parser.translateUserInput("virgin or gen:0 gen:1 and gen:2");
        assert(res.toLowerCase() == "childrencount=0 or generation=0 and generation=1 and generation=2", `invalid result ${res}`);
        res = parser.translateUserInput("virgin gen:0 or gen:1 and gen:2");
        assert(res.toLowerCase() == "childrencount=0 and generation=0 or generation=1 and generation=2", `invalid result ${res}`);
        res = parser.translateUserInput("virgin gen:0 gen:1 or gen:2");
        assert(res.toLowerCase() == "childrencount=0 and generation=0 and generation=1 or generation=2", `invalid result ${res}`);
        done();
    });
    it('should make valid trait query', async function() {
        let config = require("../config/config.local.json");
        let database = new Database(config.database);
        await database.open();
        let parser = new QueryParser(database);
        await parser.initialize();
        let res = parser.translateUserInput("crazy");
        assert(res.toUpperCase() == "GENESEYETYPE & 255 = 6", `invalid result ${res}`);
    });

    it('should make valid trait query to select from DB', async function() {
        let config = require("../config/config.local.json");
        let database = new Database(config.database);
        await database.open();
        let parser = new QueryParser(database);
        await parser.initialize();
        let query = parser.translateUserInput("mainecoon crazy gen:1 tongue");
        let res = await database.getKitties(query);
        assert(res.length == 1, `invalid result ${res.length}`);
    });
});