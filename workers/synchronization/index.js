const commandLineArgs = require('command-line-args');
const DatabaseSync = require('./database-sync');
const config = require('../../config/config.local.json');

const databaseSync = new DatabaseSync(config);

async function start(fast, interval) {
  await databaseSync.run(fast);
  if (interval) {
    setTimeout(async () => start(fast, interval), interval);
  }
}

const optionDefinitions = [
  { name: 'timeout', alias: 't', type: Number },
  { name: 'fast', alias: 'f', type: Boolean },
];

const options = commandLineArgs(optionDefinitions);

function main() {
  start(options.fast, options.timeout);
}

main();
