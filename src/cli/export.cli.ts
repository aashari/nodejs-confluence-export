// src/cli/export.cli.ts
import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import exportController from '../controllers/export.controller.js'; // Will create this next

const logger = Logger.forContext('cli/export.cli.ts');

function register(program: Command) {
	const methodLogger = logger.forMethod('register');
	methodLogger.debug('Registering Confluence export CLI commands...');

	program
		.command('export')
		.description('Export Confluence pages from a specified space.')
		.requiredOption(
			'-s, --space <spaceKey>',
			'The key of the Confluence space to export.',
		)
		.option(
			'-o, --output-dir <path>',
			'Directory to save exported files.',
			'./confluence_export',
		)
		.option(
			'-f, --format <format>',
			'Export format (e.g., markdown, html). Default: markdown',
			'markdown',
		)
		.option(
			'--ignore <filter...>',
			'Pages to ignore. Format: "parent:ID" to ignore a page and all children, or "title:REGEX" to ignore pages matching regex pattern. Can be used multiple times.',
		)
		// Add more options as needed (e.g., --include-attachments, --flat-structure)
		.action(async (options) => {
			const actionLogger = logger.forMethod('action:export');
			try {
				actionLogger.debug('CLI export called', options);

				// Validate format option
				const supportedFormats = ['markdown', 'html']; // Add 'storage' or others if supported
				if (!supportedFormats.includes(options.format.toLowerCase())) {
					actionLogger.error(
						`Unsupported format: ${options.format}. Supported formats are: ${supportedFormats.join(', ')}.`,
					);
					console.error(
						`Error: Unsupported format "${options.format}". Supported: ${supportedFormats.join(', ')}.`,
					);
					process.exit(1);
				}

				// Convert single ignore to array, if provided
				const ignoreFilters: string[] = [];
				if (options.ignore) {
					if (Array.isArray(options.ignore)) {
						ignoreFilters.push(...options.ignore);
					} else {
						ignoreFilters.push(options.ignore);
					}
				}

				// Validate ignore filters
				for (const filter of ignoreFilters) {
					if (!filter.match(/^(parent|title):.+$/)) {
						actionLogger.error(
							`Invalid ignore filter: "${filter}". Format should be "parent:ID" or "title:REGEX".`,
						);
						console.error(
							`Error: Invalid ignore filter "${filter}". Format should be "parent:ID" or "title:REGEX".`,
						);
						process.exit(1);
					}
				}

				const result = await exportController.exportSpace({
					spaceKey: options.space,
					outputDir: options.outputDir,
					format: options.format.toLowerCase(), // Pass lowercase format
					ignoreFilters,
				});
				console.log(result.content); // For success/summary message
			} catch (error) {
				handleCliError(error);
			}
		});
	methodLogger.debug('Confluence export CLI command registered.');
}
export default { register };
