const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const util = require('util');

function SqlClient(config) {
  let db;

  async function run(statement) {
    if (!db) {
      throw new Error('Not connected');
    }
    await (util.promisify(c => db.run(statement, c)))();
  }

  async function exec(statement) {
    if (!db) {
      throw new Error('Not connected');
    }
    await (util.promisify(c => db.exec(statement, c)))();
  }

  async function runScript(filename) {
    const scriptPath = path.join(__dirname, 'queries', filename);
    const data = await util.promisify(fs.readFile)(scriptPath, { encoding: 'utf8' });
    await exec(data);
  }

  function open(fast, readOnly) {
    if (db) {
      throw new Error('Already connected');
    }
    const exists = fs.existsSync(config.filename);
    return new Promise(((resolve, reject) => {
      const mode = readOnly ?
        sqlite3.OPEN_READONLY :
        (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE); // eslint-disable-line no-bitwise
      db = new sqlite3.Database(
        config.filename,
        mode,
        ((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }),
      );
    })).then(() => {
      if (fast) {
        // take the risk with non-synchronous mode
        // http://www.sqlite.org/pragma.html#pragma_synchronous
        return Promise.all([run('PRAGMA synchronous = OFF'), run('PRAGMA journal_mode = MEMORY')]);
      }
      return true;
    }).then(() => {
      if (!exists) {
        return runScript('createDatabase.sql');
      }
      return null;
    });
  }

  async function close() {
    if (db) {
      await util.promisify(db.close)();
      db = null;
    }
  }

  function checkOrderBy(orderBy) {
    return orderBy && (orderBy instanceof Array) &&
      orderBy.every(v => /^[a-zA-Z0-9\s.]+$/.test(v));
  }
  // return single row
  function get(tableName, fieldNames, where, orderBy, join = null, leftJoin = null) {
    if (orderBy && !checkOrderBy(orderBy)) {
      throw new Error('Invalid arg: orderBy');
    }
    if (!db) {
      throw new Error('Not connected');
    }
    let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`;
    if (join) {
      sql += `${leftJoin ? ' LEFT' : ''} JOIN ${join}`;
    }
    if (where) {
      sql += ` WHERE ${where}`;
    }
    if (orderBy) {
      sql += ` ORDER BY ${orderBy.join(',')}`;
    }
    return new Promise(((resolve, reject) => {
      db.get(sql, [], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    }));
  }

  // return all rows
  function all(tableName, fieldNames, where, orderBy, limit = null, join = null, leftJoin = null) {
    if (orderBy && !checkOrderBy(orderBy)) {
      throw new Error('Invalid arg: orderBy');
    }

    if (!db) {
      throw new Error('Not connected');
    }
    let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`;
    if (join) {
      sql += `${leftJoin ? ' LEFT' : ''} JOIN ${join}`;
    }
    if (where) {
      sql += ` WHERE ${where}`;
    }
    if (orderBy) {
      sql += ` ORDER BY ${orderBy.join(',')}`;
    }
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    return new Promise(((resolve, reject) => {
      db.all(sql, [], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    }));
  }

  function update(tableName, set, where) {
    const sql = `UPDATE ${tableName} SET ${set} WHERE ${where}`;
    return new Promise(((resolve, reject) => {
      db.run(sql, [], (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    }));
  }

  function insert(tableName, row) {
    const params = [];
    const values = [];
    const fields = Object.keys(row);
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      params.push(`?${i + 1}`);
      values.push(row[field]);
    }
    const sql = `INSERT INTO ${tableName}(${fields.join(',')}) VALUES(${params.join(',')})`;
    return new Promise(((resolve, reject) => {
      db.run(sql, values, function onExecuted(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    }));
  }

  function getUpdateStatement(tableName, set, where) {
    const sql = `UPDATE ${tableName} SET ${set} WHERE ${where}`;
    return db.prepare(sql);
  }

  function runStatements(statements) {
    return new Promise(((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', error => !error || reject(error));
        for (let i = 0; i < statements.length; i += 1) {
          // resolve when all statements are executed
          statements[i].run([], (function onExecuted(error) {
            const cnt = this + 1;
            if (error) {
              reject(error);
            } else if (cnt === statements.length) {
              resolve();
            }
          }).bind(i));
        }
        db.run('COMMIT', error => !error || reject(error));
      });
    }));
  }

  async function runStatementParallel(statement, values) {
    return new Promise(((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.parallelize(() => {
          values.forEach(v => statement.run(v));
        });
        db.run('COMMIT', [], (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }));
  }

  async function runStatementsParallel(statements) {
    return new Promise(((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.parallelize(() => {
          statements.forEach(s => s.run());
        });
        db.run('COMMIT', [], (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }));
  }

  async function bulkInsert(tableName, rows) {
    const params = [];
    const values = [];
    const fields = Object.keys(rows[0]);
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      params.push(`?${i + 1}`);
      for (let j = 0; j < rows.length; j += 1) {
        values[j] = values[j] || [];
        values[j].push(rows[j][field]);
      }
    }
    const sql = `INSERT INTO ${tableName}(${fields.join(',')}) VALUES(${params.join(',')})`;

    const statement = db.prepare(sql);
    await runStatementParallel(statement, values);
  }

  function prepareUpdateStatement(tableName, row) {
    const set = [];
    const values = [];
    const fields = Object.keys(row);
    let keys = [];
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      if (field !== 'key') {
        set.push(`${field}=?${i + 1}`);
        values.push(row[field]);
      } else {
        const key = row[field];
        keys = Object.keys(key).map(k => `${k}=${key[k]}`);
      }
    }
    const sql = `UPDATE ${tableName} SET ${set.join(',')} WHERE ${keys.join(' AND ')}`;
    return db.prepare(sql, values);
  }

  async function bulkUpdate(tableName, updates) {
    const statements = updates.map(u => prepareUpdateStatement(tableName, u));
    await runStatementsParallel(statements);
  }

  this.open = open;
  this.close = close;
  this.get = get;
  this.all = all;
  this.run = run;
  this.insert = insert;
  this.getUpdateStatement = getUpdateStatement;
  this.runStatements = runStatements;
  this.update = update;
  this.bulkInsert = bulkInsert;
  this.bulkUpdate = bulkUpdate;
}


module.exports = SqlClient;
