let electron = require("electron");
let configuration = require("./configuration");
let Logger = require("../providers/log/logger");

let config = configuration.read();
if(config.logger) {
    let logger = new Logger(config.logger, true);
    logger.on('line', line => {
        let logLine = document.createElement('div');
        logLine.innerText = `${line.date} ${line.levelString} ${line.msg}`;
        document.getElementById('log').appendChild(logLine);
    });
}
