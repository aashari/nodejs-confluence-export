#!/usr/bin/env node
import { Logger } from './utils/logger.util.js';
import { config } from './utils/config.util.js';
import { runCli } from './cli/index.js';

const indexLogger = Logger.forContext('index.ts');
indexLogger.debug('Confluence Export CLI tool module loaded');

async function main() {
	const mainLogger = Logger.forContext('index.ts', 'main');
	config.load(); // Load configuration

	mainLogger.debug(`DEBUG environment variable: ${process.env.DEBUG}`);
	// Add any Confluence specific config checks here if needed
	// e.g., mainLogger.debug(`ATLASSIAN_API_TOKEN exists: ${Boolean(process.env.ATLASSIAN_API_TOKEN)}`);

	// Always run in CLI mode
	mainLogger.info('Starting in CLI mode');
	await runCli(process.argv.slice(2)); // Pass all args after 'node' and 'index.js'
	mainLogger.info('CLI execution completed');
}

if (require.main === module) {
	main().catch((err) => {
		indexLogger.error('Unhandled error in main process', err);
		process.exit(1);
	});
}
