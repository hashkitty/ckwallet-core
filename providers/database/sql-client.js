let sqlite3 = require("sqlite3");
let fs = require("fs");

function SqlClient(config) {
    let db;
    function open(fast) {
        if(db) {
            throw new Error("Already connected")
        }
        return new Promise(function(resolve, reject) {
            db = new sqlite3.Database(`${config.filename}`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function(error) {
                if(error) {
                    reject(error);
                }
                else {
                    if(fast) {
                        //take the ris with non synchronous mode
                        //http://www.sqlite.org/pragma.html#pragma_synchronous
                        db.run("PRAGMA synchronous = OFF", function(error) {
                            if(error) {
                                reject(error);
                            }
                            else {
                                resolve();
                            }
                        });
                    }
                    else {
                        resolve();
                    }
                }
            });
        });
    }
    
    function close() {
        return new Promise(function(resolve, reject) {
            if(db) {
                db.close(function(error) {
                    if(error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                    delete db;
                });
            }
            else {
                resolve();
            }
        });
    }

    //return single row
    function get(tableName, fieldNames, where, orderBy) {
        if(!db) {
            throw new Error("Not connected");
        }
        let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`
        if(where) {
            sql += ` WHERE ${where}`;
        }
        if(orderBy) {
            sql += ` ORDER BY ${orderBy.join(',')}`;
        }
        return new Promise(function(resolve, reject) {
            db.get(sql, [], function(error, row) {
                if(error) {
                    reject(error);
                }
                else {
                    resolve(row);
                }
            })
        });
    }

    //return all rows
    function all(tableName, fieldNames, where, orderBy) {
        if(!db) {
            throw new Error("Not connected");
        }
        let sql = `SELECT ${fieldNames.join(',')} FROM ${tableName}`
        if(where) {
            sql += ` WHERE ${where}`;
        }
        if(orderBy) {
            sql += ` ORDER BY ${orderBy.join(',')}`;
        }
        return new Promise(function(resolve, reject) {
            db.all(sql, [], function(error, rows) {
                if(error) {
                    reject(error);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }

    function update(tableName, set, where) {
        let sql = `UPDATE ${tableName} SET ${set} WHERE ${where}`;
        return new Promise(function(resolve, reject) {
            db.run(sql, [], function(error) {
                if(error) {
                    reject(error);
                }
                else {
                    resolve(this.lastID);
                }
            })
        });
    }

    function insert(tableName, row) {
        let fields = [];
        let params = [];
        let values = [];
        let i = 1;
        for(var key in row) {
            fields.push(key);
            params.push("?" + i++);
            values.push(row[key]);
        }
        let sql = `INSERT INTO ${tableName}(${fields.join(',')}) VALUES(${params.join(',')})`;
        return new Promise(function(resolve, reject) {
            db.run(sql, values, function(error) {
                if(error) {
                    reject(error);
                }
                else {
                    resolve(this.lastID);
                }
            })
        });
    }

    function getUpdateStatement(tableName, set, where) {
        let sql = `UPDATE ${tableName} SET ${set} WHERE ${where}`;
        return db.prepare(sql);
    }

    function runStatements(statements) {
        return new Promise(function(resolve, reject) {
            db.serialize(function() {
                var cnt = 1;
                db.run("BEGIN TRANSACTION", (error) => !error || reject(error));
                for (var i = 0; i < statements.length; i++) {
                    //resolve when all statements are executed
                    statements[i].run([], (function(error) {
                        let cnt = this + 1;
                        if(error) {
                            reject(error);
                        }
                        else if(cnt == statements.length) {
                            resolve();
                        }
                    }).bind(i));
                }
                db.run("COMMIT", (error) => !error || reject(error));
            });
        });
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