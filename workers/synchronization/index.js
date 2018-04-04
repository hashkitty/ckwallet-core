const commandLineArgs = require('command-line-args');
const sync = require('./synchronization');

const optionDefinitions = [
  { name: 'timeout', alias: 't', type: Number },
  { name: 'fast', alias: 'f', type: Boolean },
];

const options = commandLineArgs(optionDefinitions);

function main() {
  sync.start(options.fast, options.timeout);
}

main();
