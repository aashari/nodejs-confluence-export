// src/controllers/export.controller.ts
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ControllerResponse } from '../types/common.types.js';
import confluenceService from '../services/vendor.atlassian.confluence.service.js';
import { formatExportSummary, ExportSummary } from './export.formatter.js';
import { formatDate } from '../utils/formatter.util.js'; // For date formatting in content
import { createSlug } from '../utils/slugify.util.js';
import fs from 'fs-extra'; // For file system operations
import path from 'path'; // For joining paths
import { convertStorageToMarkdown } from '../utils/confluence-content.util.js'; // NEW
import { ConfluencePageV2 } from '../services/vendor.atlassian.confluence.types.js';

const logger = Logger.forContext('controllers/export.controller.ts');
logger.debug('Export controller initialized');

// Define export space options interface
interface ExportSpaceOptions {
	spaceKey: string;
	outputDir: string;
	format?: string; // Added back for compatibility with CLI
	ignoreFilters?: string[]; // Format: type:value (e.g., parent:123456, title:^TeamName)
}

// Interface for page map relationships
interface PageMap {
	[pageId: string]: {
		title: string;
		parentId: string | null;
	};
}

// New mapping of page IDs to titles and parentIDs for building breadcrumbs

// Function to build breadcrumbs using page relationships
function buildBreadcrumbs(
	pageId: string,
	pageMap: PageMap,
	spaceName: string,
): string {
	const breadcrumbParts: string[] = [];
	let currentId = pageId;

	// Prevent infinite loops (in case of circular references)
	const maxDepth = 20;
	let depth = 0;

	// Start with the current page
	if (pageMap[currentId]) {
		breadcrumbParts.unshift(
			`${pageMap[currentId].title} (id:${currentId})`,
		);
		currentId = pageMap[currentId].parentId || '';
	}

	// Add parent pages up to the root level
	while (currentId && pageMap[currentId] && depth < maxDepth) {
		const part = `${pageMap[currentId].title} (id:${currentId})`;
		breadcrumbParts.unshift(part);

		currentId = pageMap[currentId].parentId || '';
		depth++;
	}

	// Add space as first part if not already included
	if (
		breadcrumbParts.length === 0 ||
		!breadcrumbParts[0].includes(spaceName)
	) {
		breadcrumbParts.unshift(`${spaceName} (id:${pageId})`);
	}

	return breadcrumbParts.join(' > ');
}

// Function to build a complete set of page IDs to skip based on filters
async function buildSkipList(
	allPages: ConfluencePageV2[],
	ignoreFilters: string[],
	pageMap: PageMap,
	spaceName: string,
): Promise<Set<string>> {
	const skipList = new Set<string>();

	// Extract parent IDs to ignore
	const ignoredParentIds: string[] = [];
	const titlePatterns: RegExp[] = [];

	// Process ignore filters
	for (const filter of ignoreFilters) {
		if (!filter || !filter.includes(':')) continue;

		const [type, value] = filter.split(':', 2);

		if (type === 'parent') {
			const parentIdToIgnore = value;
			ignoredParentIds.push(parentIdToIgnore);
			logger.debug(
				`Will ignore pages with parent ID: ${parentIdToIgnore}`,
			);

			// First, add the parent itself to the skip list
			skipList.add(parentIdToIgnore);

			// For each page, build its breadcrumb path and check if it contains the ignored parent ID
			for (const page of allPages) {
				if (skipList.has(page.id)) continue; // Skip if already in list

				// Build breadcrumbs for this page
				const breadcrumbs = buildBreadcrumbs(
					page.id,
					pageMap,
					spaceName,
				);

				// Check if breadcrumbs contain the ignored parent ID pattern
				const parentIdPattern = `(id:${parentIdToIgnore})`;
				if (breadcrumbs.includes(parentIdPattern)) {
					skipList.add(page.id);
					logger.debug(
						`Skipping page: ${page.id} - "${page.title}" (breadcrumb path contains ignored parent ${parentIdToIgnore})`,
					);
				}
			}
		} else if (type === 'title') {
			try {
				const regex = new RegExp(value);
				titlePatterns.push(regex);
				logger.debug(
					`Will ignore pages with title matching pattern: ${value}`,
				);

				allPages.forEach((page) => {
					if (regex.test(page.title)) {
						skipList.add(page.id);
						logger.debug(
							`Skipping page: ${page.id} - "${page.title}" (matched title pattern "${value}")`,
						);
					}
				});
			} catch {
				// If regex is invalid, log warning but continue
				logger.warn(
					`Invalid title regex pattern: "${value}". Skipping this filter.`,
				);
			}
		}
	}

	logger.info(`Built skip list with ${skipList.size} pages to ignore`);
	return skipList;
}

async function exportSpace(
	options: ExportSpaceOptions,
): Promise<ControllerResponse> {
	const methodLogger = logger.forMethod('exportSpace');
	methodLogger.debug('Exporting space', options);

	let pagesExported = 0;
	let pagesSkipped = 0;
	const errorsEncountered: string[] = [];
	const startTime = Date.now();

	try {
		// Clean the output directory if it exists, then ensure it exists
		fs.emptyDirSync(options.outputDir);
		fs.ensureDirSync(options.outputDir);

		console.log(`🔍 Getting details for space: ${options.spaceKey}...`);
		// First, get space details to verify it exists and get its name
		methodLogger.info(`Getting details for space ${options.spaceKey}`);
		const spaceDetails = await confluenceService.getSpaceDetails(
			options.spaceKey,
		);

		// Now list all pages in the space
		methodLogger.info(`Listing all pages in space ${options.spaceKey}`);
		const allPages = await confluenceService.listAllPagesInSpace(
			String(spaceDetails.id), // Use numeric space ID instead of key
		);

		methodLogger.info(
			`Found ${allPages.length} pages in space ${options.spaceKey}`,
		);

		// Create a map of pages for looking up page titles by ID
		const pageMap: PageMap = {};
		for (const page of allPages) {
			pageMap[page.id] = {
				title: page.title,
				parentId: page.parentId || null,
			};
		}

		// Build skip list based on ignore filters
		const skipList = await buildSkipList(
			allPages,
			options.ignoreFilters || [],
			pageMap,
			spaceDetails.name,
		);

		// Export each page
		for (const page of allPages) {
			try {
				// Check if we should skip this page
				if (skipList.has(page.id)) {
					logger.debug(
						`Skipping page: ${page.id} - "${page.title}" (in skip list)`,
					);
					pagesSkipped++;
					continue;
				}

				methodLogger.info(
					`Exporting page: ${page.id} - "${page.title}"`,
				);

				// Get full page details including content
				const pageDetails = await confluenceService.getPageDetails(
					page.id,
				);

				// Create the page content with frontmatter
				// Create breadcrumbs-style path
				const breadcrumbs = buildBreadcrumbs(
					page.id,
					pageMap,
					spaceDetails.name,
				);

				// Set up metadata and content
				let content = `# ${pageDetails.title}\n\n`;
				content += `**Path:** ${breadcrumbs}\n`;
				content += `**Created:** ${formatDate(pageDetails.createdAt)}\n`;
				content += `**Updated:** ${formatDate(pageDetails.version.createdAt)}\n`;
				content += '---\n';

				// Convert page body from Confluence storage format to Markdown
				if (pageDetails.body?.storage?.value) {
					const bodyMarkdown = await convertStorageToMarkdown(
						pageDetails.body.storage.value,
					);
					content += bodyMarkdown;
				} else {
					methodLogger.warn(
						`Page body content not found for page ${page.id}`,
					);
				}

				// Create output filename based on page ID and slug of title
				const slug = createSlug(pageDetails.title);
				const filename = `${page.id}-${slug}.md`;
				const outputPath = path.join(options.outputDir, filename);

				// Write the file
				fs.writeFileSync(outputPath, content, 'utf8');
				pagesExported++;
			} catch (err) {
				// Log the error but continue with other pages
				const errorMessage = `Error exporting page ${page.id} - "${page.title}": ${err}`;
				methodLogger.error(errorMessage);
				errorsEncountered.push(errorMessage);
			}
		}

		process.stdout.write('\n\n');

		const endTime = Date.now();
		const totalTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);

		// Prepare summary
		const summary: ExportSummary = {
			spaceKey: options.spaceKey,
			spaceName: spaceDetails.name,
			pagesFound: allPages.length,
			pagesExported,
			pagesSkipped,
			outputDir: options.outputDir,
			format: 'markdown',
			errors: errorsEncountered,
			totalTimeSeconds: parseFloat(totalTimeInSeconds),
		};

		// Add ignore filters to summary if any were used
		if (options.ignoreFilters && options.ignoreFilters.length > 0) {
			summary.ignoredFilters = options.ignoreFilters;
		}

		// Format summary for output
		const formattedSummary = formatExportSummary(summary);

		return {
			content: formattedSummary,
		};
	} catch (error) {
		throw handleControllerError(error as Error, {
			entityType: 'Space',
			operation: 'export',
			source: 'controllers/export.controller.ts@exportSpace',
			additionalInfo: options as unknown as Record<string, unknown>,
		});
	}
}

export default { exportSpace };
