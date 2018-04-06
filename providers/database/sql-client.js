const sqlite3 = require('sqlite3');

function SqlClient(config) {
  let db;

  function run(statement) {
    if (!db) {
      throw new Error('Not connected');
    }
    return new Promise((resolve, reject) => {
      db.run(statement, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function open(fast, readOnly) {
    if (db) {
      throw new Error('Already connected');
    }
    return new Promise(((resolve, reject) => {
      const mode = readOnly ?
        sqlite3.OPEN_READONLY :
        (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE); // eslint-disable-line no-bitwise
      db = new sqlite3.Database(
        `${config.filename}`,
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
        return run('PRAGMA synchronous = OFF');
      }
      return true;
    });
  }

  function close() {
    return new Promise(((resolve, reject) => {
      if (db) {
        db.close((error) => {
          if (error) {
            reject(error);
          } else {
            db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    }));
  }

  function checkOrderBy(orderBy) {
    return orderBy && (orderBy instanceof Array) &&
    orderBy.every(v => /^[a-zA-Z0-9\s]+$/.test(v));
  }
  // return single row
  function get(tableName, fieldNames, where, orderBy) {
    if (orderBy && !checkOrderBy(orderBy)) {
      throw new Error('Invalid arg: orderBy');
    }
    if (!db) {
      throw new Error('Not connected');
    }
    let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`;
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
  function all(tableName, fieldNames, where, orderBy, limit = null) {
    if (orderBy && !checkOrderBy(orderBy)) {
      throw new Error('Invalid arg: orderBy');
    }

    if (!db) {
      throw new Error('Not connected');
    }
    let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`;
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

  this.open = open;
  this.close = close;
  this.get = get;
  this.all = all;
  this.insert = insert;
  this.getUpdateStatement = getUpdateStatement;
  this.runStatements = runStatements;
  this.update = update;
}


module.exports = SqlClient;
