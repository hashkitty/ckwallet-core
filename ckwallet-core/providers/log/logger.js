const fs = require('fs');
const Log = require('log');

function Logger(config, listen) {
  const stream = listen ? fs.createReadStream(config.filename) : fs.createWriteStream(config.filename, { flags: 'a' });
  const logger = new Log((config && config.level) || 'Debug', stream);

  function log(msg) {
    logger.info(msg);
  }

  function debug(msg) {
    logger.debug(msg);
  }
  function error(err) {
    logger.error(err);
  }
  function on(type, callback) {
    return logger.on(type, callback);
  }

  this.log = log;
  this.debug = debug;
  this.error = error;
  this.on = on;
}

module.exports = Logger;
