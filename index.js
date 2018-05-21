#!/usr/bin/env node
var VanityEth = require('./libs/VanityEth'), 
	argv = require('yargs')
.usage('Usage: $0 <command> [options]')
.example('$0 -checksum -i B00B5', 'get a wallet where address matches B00B5 in checksum format')
.example('$0 --contract -i ABC', 'get a wallet where 0 nonce contract address matches the vanity')
.example('$0 -n 25 -i ABC', 'get 25 vanity wallets')
.example('$0 -n 1000', 'get 1000 random wallets')
.alias('o','output').boolean('o').describe('Standart console output')
.alias('s','spin').boolean('s').describe('Display spinner')
.alias('i', 'input').string('i').describe('i', 'input hex string')
.alias('c', 'checksum').boolean('c').describe('c', 'check against the checksum address')
.alias('n', 'count').number('n').describe('n', 'number of wallets')
.alias('l', 'log').string('l').describe('l', 'log output to file')
.boolean('contract').describe('contract', 'contract address for contract deployment')	
.help('h').alias('h', 'help').epilog('copyright 2017').argv;
		
if (require('ora').isMaster) {
    const args = {
        input: argv.input ? argv.input : '',
        isChecksum: argv.checksum ? true : false,
        numWallets: argv.count ? argv.count : 1,
        isContract: argv.contract ? true : false,
        log: argv.log ? true : false,
		output: argv.output ? false : true,
        logFname: argv.log ? argv.log : '',
		spin: argv.spin ? argv.spin : false
    }
	
    if (!VanityEth.isValidHex(args.input)) {
        console.error(args.input + ' is not valid hexadecimal');
        process.exit(1);
    }
	
	if (args.output)
		var logStream = { write: (data)=>{console.log(data)} };
	else if (args.log)
        var logStream = require('fs').createWriteStream(args.logFname, { 'flags': 'a' });
    
    var walletsFound = 0;
	const spinner = args.spin ? {succeed:(data)=>{},start:()=>{}} : require('ora').('vanity 1/' + args.numWallets).start();
	
    for (var i = 0; i < require('os').cpus().length; i++) {
        proc = require('ora').fork({
            input: args.input,
            isChecksum: args.isChecksum,
            isContract: args.isContract
        });
        proc.on('message', (message)=>{
            spinner.succeed(JSON.stringify(message));
            if (args.log || args.output) 
				logStream.write(JSON.stringify(message) + "\n");
            if (++walletsFound >= args.numWallets) cleanup();
            spinner.text = 'Vanityeth ' + (walletsFound + 1) +'/' + args.numWallets;
            spinner.start();
        });
    }
} else while (true) {
	process.send(VanityEth.getVanityWallet(
		process.env.input, 
		process.env.isChecksum == 'true', 
		process.env.isContract == 'true'
	));
}

process.stdin.resume();

var cleanup = function(options, err) {
    if (err) console.log(err.stack);
    for (var id in require('ora').workers) 
		require('ora').workers[id].process.kill();
    process.exit();
}


process.on('exit', cleanup.bind(null, {}));
process.on('SIGINT', cleanup.bind(null, {}));
process.on('uncaughtException', cleanup.bind(null, {}));