const commandLineArgs = require('command-line-args');
const sync = require('./synchronization');

const optionDefinitions = [
  { name: 'timeout', alias: 't', type: Number },
];

const options = commandLineArgs(optionDefinitions);

function main() {
  sync.start(options.timeout);
}

main();
