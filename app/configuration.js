function read() {
    let config = require("../config/config.local.json");
    return config;
}

function write(config) {

}

exports.read = read;
exports.write = write;