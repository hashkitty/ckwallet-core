let fs = require('fs');
let Log = require('log');

function Logger(config, listen) {
    let stream = listen ? fs.createReadStream(config.filename) : fs.createWriteStream(config.filename, {'flags': 'a'});
    let logger = new Log(config.level, stream);

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