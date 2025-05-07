// src/services/vendor.atlassian.confluence.service.ts
import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import { createAuthMissingError, createApiError } from '../utils/error.util.js';
import {
	ConfluenceSpaceDetailed,
	ConfluenceSpaceDetailedSchema,
	ConfluencePageV2,
	ConfluencePageV2Schema, // Using V2 for page listing
	ConfluencePageDetailedV2,
	ConfluencePageDetailedV2Schema,
	PaginatedResponseSchema, // Generic for pagination handling
	ConfluenceSpaceSchema, // For paginated response
} from './vendor.atlassian.confluence.types.js';
import { z } from 'zod';

const logger = Logger.forContext(
	'services/vendor.atlassian.confluence.service.ts',
);
logger.debug('Confluence service initialized');

// TODO: Implement functions like:
// async function getSpaceDetails(spaceKey: string): Promise<ConfluenceSpace> { ... }
// async function listPagesInSpace(spaceKey: string, paginationOptions?: any): Promise<PaginatedResponse<ConfluencePage>> { ... }
// async function getPageContent(pageId: string, format: string): Promise<string> { ... }
// async function listAttachments(pageId: string): Promise<any[]> { ... }
// async function downloadAttachment(url: string): Promise<Buffer> { ... }

async function getSpaceDetails(
	spaceKey: string,
): Promise<ConfluenceSpaceDetailed> {
	const methodLogger = logger.forMethod('getSpaceDetails');
	methodLogger.debug(`Fetching details for space: ${spaceKey}`);
	const credentials = getAtlassianCredentials();
	if (!credentials) throw createAuthMissingError('Confluence space lookup');

	// Step 1: First get the space ID using the space key
	const listPath = `/wiki/api/v2/spaces?keys=${spaceKey}`;
	const PaginatedSpacesSchema = PaginatedResponseSchema(
		ConfluenceSpaceSchema,
	);

	try {
		// First request to get the space ID from the key
		const listResponse = await fetchAtlassian<unknown>(
			credentials,
			listPath,
		);
		const validatedListResponse = PaginatedSpacesSchema.parse(listResponse);

		if (
			!validatedListResponse.results ||
			validatedListResponse.results.length === 0
		) {
			throw createApiError(
				`Confluence space with key "${spaceKey}" not found.`,
				404,
			);
		}

		// Extract the space ID from the list response
		const spaceId = validatedListResponse.results[0].id;
		methodLogger.debug(`Found space ID: ${spaceId} for key: ${spaceKey}`);

		// Step 2: Now get the detailed space information using the ID
		const detailPath = `/wiki/api/v2/spaces/${spaceId}`;
		const detailResponse = await fetchAtlassian<unknown>(
			credentials,
			detailPath,
		);
		const detailedSpace =
			ConfluenceSpaceDetailedSchema.parse(detailResponse);

		methodLogger.debug(
			'Successfully fetched and validated detailed space information',
			detailedSpace,
		);
		return detailedSpace;
	} catch (error) {
		methodLogger.error(
			`Failed to get space details for ${spaceKey}`,
			error,
		);
		if (error instanceof z.ZodError) {
			throw createApiError(
				'Invalid response structure from Confluence API for space details.',
				500,
				error,
			);
		}
		throw error; // Rethrow original McpError or other errors
	}
}

async function listAllPagesInSpace(
	spaceId: string, // Assuming numeric space ID for v2 API
	status: string[] = ['current'],
): Promise<ConfluencePageV2[]> {
	const methodLogger = logger.forMethod('listAllPagesInSpace');
	methodLogger.debug(
		`Listing all pages for space ID: ${spaceId} with status: ${status.join(',')}`,
	);
	const credentials = getAtlassianCredentials();
	if (!credentials) throw createAuthMissingError('Confluence page listing');

	const allPages: ConfluencePageV2[] = [];
	const limit = 50; // Max limit for v2 pages API

	// Schema for paginated V2 pages
	const PaginatedPagesV2Schema = PaginatedResponseSchema(
		ConfluencePageV2Schema,
	);

	// Start with no cursor for the first page
	let nextUrl: string | null =
		`/wiki/api/v2/spaces/${spaceId}/pages?limit=${limit}&status=${status.join(',')}`;

	// Continue fetching pages until there's no next URL
	while (nextUrl) {
		methodLogger.debug(`Fetching pages from: ${nextUrl}`);

		try {
			const response = await fetchAtlassian<unknown>(
				credentials,
				nextUrl,
			);
			const validatedResponse = PaginatedPagesV2Schema.parse(response);

			if (validatedResponse.results) {
				allPages.push(...validatedResponse.results);
				methodLogger.debug(
					`Fetched batch of ${validatedResponse.results.length} pages. Total so far: ${allPages.length}`,
				);
			}

			// The next URL could be in different places depending on API version
			nextUrl = null; // Reset for this iteration

			// Check for next cursor in standard response format
			if (validatedResponse.next?.cursor) {
				nextUrl = `/wiki/api/v2/spaces/${spaceId}/pages?limit=${limit}&status=${status.join(',')}&cursor=${validatedResponse.next.cursor}`;
				methodLogger.debug(
					`Found next cursor in response body: ${validatedResponse.next.cursor}`,
				);
			}
			// Check if there's a next link in the _links object
			else if (validatedResponse._links?.next) {
				nextUrl = validatedResponse._links.next;
				methodLogger.debug(`Found next link in _links: ${nextUrl}`);
			}
			// Otherwise, we've reached the end
			else {
				methodLogger.debug(
					'No more pages to fetch (no next cursor or link found)',
				);
			}
		} catch (error) {
			methodLogger.error(
				`Failed to list pages for space ID ${spaceId}`,
				error,
			);
			if (error instanceof z.ZodError) {
				throw createApiError(
					'Invalid response structure from Confluence API for page listing.',
					500,
					error,
				);
			}
			throw error; // Rethrow original McpError or other errors
		}
	}

	methodLogger.info(
		`Successfully fetched ${allPages.length} pages in total for space ID ${spaceId}`,
	);
	return allPages;
}

async function getPageDetails(
	pageId: string,
): Promise<ConfluencePageDetailedV2> {
	const methodLogger = logger.forMethod('getPageDetails');
	methodLogger.debug(`Fetching details for page ID: ${pageId}`);
	const credentials = getAtlassianCredentials();
	if (!credentials)
		throw createAuthMissingError('Confluence page details lookup');

	// Using v2 API with storage body format and ancestors
	const path = `/wiki/api/v2/pages/${pageId}?body-format=storage&include-ancestors=true`;
	try {
		const response = await fetchAtlassian<unknown>(credentials, path);
		const validatedPage = ConfluencePageDetailedV2Schema.parse(response);
		methodLogger.debug(
			'Successfully fetched and validated page details',
			validatedPage.title,
		);
		return validatedPage;
	} catch (error) {
		methodLogger.error(`Failed to get page details for ${pageId}`, error);
		if (error instanceof z.ZodError) {
			throw createApiError(
				'Invalid response structure from Confluence API for page details.',
				500,
				error,
			);
		}
		throw error; // Rethrow original McpError or other errors
	}
}

export default { getSpaceDetails, listAllPagesInSpace, getPageDetails };
