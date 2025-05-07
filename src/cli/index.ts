import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { CLI_NAME, VERSION } from '../utils/constants.util.js';
import exportCli from './export.cli.js';

/**
 * CLI entry point for the Boilerplate MCP Server
 * Handles command registration, parsing, and execution
 */

// Package description
const DESCRIPTION = 'CLI tool for exporting Confluence content.';

/**
 * Run the CLI with the provided arguments
 *
 * @param args Command line arguments to process
 * @returns Promise that resolves when CLI command execution completes
 */
export async function runCli(args: string[]): Promise<void> {
	const cliLogger = Logger.forContext('cli/index.ts');
	cliLogger.debug('Initializing CLI with arguments', args);

	const program = new Command();

	program.name(CLI_NAME).version(VERSION).description(DESCRIPTION);

	// Register CLI commands
	cliLogger.debug('Registering CLI commands...');
	exportCli.register(program);
	cliLogger.debug('CLI commands registered successfully');

	try {
		await program.parseAsync(args, { from: 'user' });
		cliLogger.debug('CLI arguments parsed and command executed');
	} catch (error) {
		cliLogger.error('Error during CLI execution', error);
		// Commander already handles displaying errors, so we might not need to do more here
		// unless we want custom global error handling for CLI.
		process.exit(1); // Ensure non-zero exit code on error
	}
}
