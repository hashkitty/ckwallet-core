const assert = require('assert');
const QueryParser = require('../providers/database/query-parser');
const Database = require('../providers/database/database');
const config = require('../config/config.local.json');

describe('query-parser', () => {
  it('should produce valid virgin query', (done) => {
    const parser = new QueryParser();
    const res = parser.translateUserInput('virgin');
    assert(res.toLowerCase() === 'k.childrencount=0', `invalid result ${res}`);
    done();
  });
  it('should produce valid generation query', (done) => {
    const parser = new QueryParser();
    let res = parser.translateUserInput('gen:0');
    assert(res.toLowerCase() === 'k.generation=0', `invalid result ${res}`);
    res = parser.translateUserInput('gen:100');
    assert(res.toLowerCase() === 'k.generation=100', `invalid result ${res}`);
    done();
  });

  it('should make valid query composition if no operator', (done) => {
    const parser = new QueryParser();
    const res = parser.translateUserInput('virgin gen:0');
    assert(res.toLowerCase() === 'k.childrencount=0 and k.generation=0', `invalid result ${res}`);
    done();
  });

  it('should make valid query composition with AND operation', (done) => {
    const parser = new QueryParser();
    const res = parser.translateUserInput('virgin and gen:0 and gen:1');
    assert(res.toLowerCase() === 'k.childrencount=0 and k.generation=0 and k.generation=1', `invalid result ${res}`);
    done();
  });

  it('should make valid query composition with OR operation', (done) => {
    const parser = new QueryParser();
    const res = parser.translateUserInput('virgin or gen:0 or gen:1');
    assert(res.toLowerCase() === 'k.childrencount=0 or k.generation=0 or k.generation=1', `invalid result ${res}`);
    done();
  });

  it('should make valid query composition with combination of operations', (done) => {
    const parser = new QueryParser();
    let res = parser.translateUserInput('virgin or gen:0 and gen:1 gen:2');
    assert(res.toLowerCase() === 'k.childrencount=0 or k.generation=0 and k.generation=1 and k.generation=2', `invalid result ${res}`);
    res = parser.translateUserInput('virgin or gen:0 gen:1 and gen:2');
    assert(res.toLowerCase() === 'k.childrencount=0 or k.generation=0 and k.generation=1 and k.generation=2', `invalid result ${res}`);
    res = parser.translateUserInput('virgin gen:0 or gen:1 and gen:2');
    assert(res.toLowerCase() === 'k.childrencount=0 and k.generation=0 or k.generation=1 and k.generation=2', `invalid result ${res}`);
    res = parser.translateUserInput('virgin gen:0 gen:1 or gen:2');
    assert(res.toLowerCase() === 'k.childrencount=0 and k.generation=0 and k.generation=1 or k.generation=2', `invalid result ${res}`);
    done();
  });
  it('should make valid trait query', async () => {
    const database = new Database(config.database);
    await database.open();
    const parser = new QueryParser(database);
    await parser.initialize();
    const res = parser.translateUserInput('crazy');
    assert(res.toUpperCase() === 'K.GENESEYETYPE & 255 = 6', `invalid result ${res}`);
  });

  it('should make valid trait query to select from DB', async () => {
    const database = new Database(config.database);
    await database.open();
    const query = database.queryParser.translateUserInput('mainecoon crazy gen:1 tongue');
    const res = await database.getKitties(query);
    assert(res && res.rows && res.rows.length === 1 && res.total === 1, `invalid result ${res.rows.length}`);
  }).timeout(5000);

  it('should make valid recessive trait query to select from DB', async () => {
    const database = new Database(config.database);
    await database.open();
    const query = database.queryParser.translateUserInput('r1:crazy');
    const res = await database.getKitties(query);
    assert(res && res.rows && res.rows.length > 0 && res.total > 10000, `invalid result ${res.rows.length}`);
  }).timeout(5000);

  it('should make valid trait query to select from DB with limit', async () => {
    const database = new Database(config.database);
    await database.open();
    const query = database.queryParser.translateUserInput('crazy gen:1');
    const res = await database.getKitties(query);
    assert(res && res.rows && res.rows.length === 100 && res.total > 5000, `invalid result ${res.rows.length}`);
  }).timeout(5000);

  it('should make valid hex trait type query', async () => {
    const database = new Database(config.database);
    await database.open();
    let res = database.queryParser.translateUserInput('body:0x01');
    assert(res.toUpperCase() === 'K.GENESBODY & 0XFF = 1', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('mouth:0x0101');
    assert(res.toUpperCase() === 'K.GENESMOUTH & 0XFFFF = 257', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('pattern:0x010101');
    assert(res.toUpperCase() === 'K.GENESPATTERN & 0XFFFFFF = 65793', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('eyecolor:0x01010101');
    assert(res.toUpperCase() === 'K.GENESEYECOLOR & 0XFFFFFFFF = 16843009', `invalid result ${res}`);
  });

  it('should make valid kai trait type query', async () => {
    const database = new Database(config.database);
    await database.open();
    let res = database.queryParser.translateUserInput('body:2');
    assert(res.toUpperCase() === 'K.GENESBODY & 0XFF = 1', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('mouth:22');
    assert(res.toUpperCase() === 'K.GENESMOUTH & 0XFFFF = 257', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('pattern:222');
    assert(res.toUpperCase() === 'K.GENESPATTERN & 0XFFFFFF = 65793', `invalid result ${res}`);

    res = database.queryParser.translateUserInput('eyecolor:2222');
    assert(res.toUpperCase() === 'K.GENESEYECOLOR & 0XFFFFFFFF = 16843009', `invalid result ${res}`);
  });

  it('should return input suggestions', async () => {
    const database = new Database(config.database);
    await database.open();
    const res = database.queryParser.getInputSuggestions();
    assert(res && res.length >= 158);
  });
});
