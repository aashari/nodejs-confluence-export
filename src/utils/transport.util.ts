import { Logger } from './logger.util.js';
import { config } from './config.util.js';
import {
	createAuthInvalidError,
	createApiError,
	createUnexpectedError,
	createNotFoundError,
	McpError,
} from './error.util.js';

/**
 * Interface for Atlassian API credentials
 */
export interface AtlassianCredentials {
	siteName: string;
	userEmail: string;
	apiToken: string;
}

/**
 * Interface for HTTP request options
 */
export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: unknown;
}

// Create a logger for the utility
const utilLogger = Logger.forContext('utils/transport.util.ts');

/**
 * Get Atlassian credentials from environment variables
 * @returns AtlassianCredentials object or null if credentials are missing
 */
export function getAtlassianCredentials(): AtlassianCredentials | null {
	const siteName = config.get('ATLASSIAN_SITE_NAME');
	const userEmail = config.get('ATLASSIAN_USER_EMAIL');
	const apiToken = config.get('ATLASSIAN_API_TOKEN');

	if (!siteName || !userEmail || !apiToken) {
		utilLogger.warn(
			'Missing Atlassian credentials. Please set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables.',
		);
		return null;
	}

	return {
		siteName,
		userEmail,
		apiToken,
	};
}

/**
 * Fetch data from Atlassian API
 * @param credentials Atlassian API credentials
 * @param path API endpoint path (without base URL)
 * @param options Request options
 * @returns Response data
 */
export async function fetchAtlassian<T>(
	credentials: AtlassianCredentials,
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const fetchLogger = Logger.forContext(
		'utils/transport.util.ts',
		'fetchAtlassian',
	);
	const { siteName, userEmail, apiToken } = credentials;

	// Ensure path starts with a slash
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	// Construct the full URL
	const baseUrl = `https://${siteName}.atlassian.net`;
	const url = `${baseUrl}${normalizedPath}`;

	// Set up authentication and headers
	const headers = {
		Authorization: `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`,
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...options.headers,
	};

	// Prepare request options
	const requestOptions: RequestInit = {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	};

	fetchLogger.debug(`Calling Atlassian API: ${url}`);

	// Track API call performance
	const startTime = performance.now();
	let endTime: number;

	try {
		const response = await fetch(url, requestOptions);
		endTime = performance.now();
		const requestDuration = (endTime - startTime).toFixed(2);

		// Log successful API call duration at info level for significant operations
		if (parseFloat(requestDuration) > 1000) {
			// If request took more than 1 second, log at warn level
			fetchLogger.warn(`API call to ${path} took ${requestDuration}ms`);
		} else if (options.method && options.method !== 'GET') {
			// For non-GET operations, log at info level
			fetchLogger.info(
				`${options.method} operation to ${path} completed in ${requestDuration}ms`,
			);
		} else {
			// For regular GET operations, log at debug level
			fetchLogger.debug(`API call completed in ${requestDuration}ms`);
		}

		// Log the raw response status and headers
		fetchLogger.debug(
			`Raw response received: ${response.status} ${response.statusText}`,
			{
				url,
				status: response.status,
				statusText: response.statusText,
				headers: (() => {
					const h: Record<string, string> = {};
					response.headers.forEach((value, key) => {
						h[key] = value;
					});
					return h;
				})(),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			fetchLogger.error(
				`API error: ${response.status} ${response.statusText}`,
				errorText,
			);

			// Try to parse the error response
			let errorMessage = `${response.status} ${response.statusText}`;
			let parsedError = null;

			try {
				if (
					errorText &&
					(errorText.startsWith('{') || errorText.startsWith('['))
				) {
					parsedError = JSON.parse(errorText);

					// Extract specific error details from Atlassian API response formats
					if (
						parsedError.errors &&
						Array.isArray(parsedError.errors) &&
						parsedError.errors.length > 0
					) {
						// Format: {"errors":[{"status":400,"code":"INVALID_REQUEST_PARAMETER","title":"..."}]}
						const atlassianError = parsedError.errors[0];
						if (atlassianError.title) {
							errorMessage = atlassianError.title;
						}
					} else if (parsedError.message) {
						// Format: {"message":"Some error message"}
						errorMessage = parsedError.message;
					}
				}
			} catch (parseError) {
				fetchLogger.debug(`Error parsing error response:`, parseError);
				// Fall back to the default error message
			}

			// Classify HTTP errors based on status code
			if (response.status === 401 || response.status === 403) {
				throw createAuthInvalidError('Invalid Atlassian credentials');
			} else if (response.status === 404) {
				throw createNotFoundError(`Resource not found`, errorText);
			} else {
				// For other API errors, preserve the original error message from Atlassian API
				throw createApiError(errorMessage, response.status, errorText);
			}
		}

		// Clone the response to log its content without consuming it
		const clonedResponse = response.clone();
		const responseJson = await clonedResponse.json();
		fetchLogger.debug(`Response body:`, responseJson);

		return response.json() as Promise<T>;
	} catch (error) {
		endTime = performance.now();
		const failedRequestDuration = (endTime - startTime).toFixed(2);

		fetchLogger.error(
			`Request failed after ${failedRequestDuration}ms`,
			error,
		);

		// If it's already an McpError, just rethrow it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle network or parsing errors
		if (error instanceof TypeError || error instanceof SyntaxError) {
			throw createApiError(
				`Network or parsing error: ${error instanceof Error ? error.message : String(error)}`,
				500,
				error,
			);
		}

		throw createUnexpectedError(
			`Unexpected error while calling Atlassian API: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}
