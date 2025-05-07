// src/services/vendor.atlassian.confluence.types.ts
import { z } from 'zod';

// Generic Paginated Response
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
	itemSchema: T,
) =>
	z.object({
		results: z.array(itemSchema),
		start: z.number().optional(), // v1
		limit: z.number().optional(), // v1
		size: z.number().optional(), // v1
		_links: z
			.object({
				// v1
				next: z.string().optional(),
				base: z.string().optional(),
				context: z.string().optional(),
			})
			.optional(),
		// For v2 pagination (cursor-based)
		next: z
			.object({
				// Partial, add more from actual API as needed for v2
				cursor: z.string(),
				_links: z.object({
					next: z.string(),
				}),
			})
			.optional(),
	});
export type PaginatedResponse<T> = z.infer<
	ReturnType<typeof PaginatedResponseSchema<z.ZodType<T>>>
>;

// Confluence Space (for listing results from /api/v2/spaces?keys=...)
export const ConfluenceSpaceSchema = z.object({
	id: z.string().describe('ID of the space'), // v2 API uses string IDs for spaces
	key: z.string().describe('Key of the space'),
	name: z.string().describe('Name of the space'),
	type: z.string().optional(),
	status: z.string().optional(),
	// Add other relevant fields from the v2 space list item if needed
});
export type ConfluenceSpace = z.infer<typeof ConfluenceSpaceSchema>;

// Confluence Space Detailed (from /api/v2/spaces/{id} or expanded from list)
export const ConfluenceSpaceDetailedSchema = ConfluenceSpaceSchema.extend({
	description: z.any().nullish().optional(), // Allow any type for description or null/undefined
	homepageId: z
		.string()
		.nullish()
		.optional()
		.describe('ID of the space homepage (string in v2)'),
	// icon: z.string().optional(), // URL to the space icon
	// Look for description structure in v2, it might be an object like { plain: { value: ..., representation: ... } }
	// For simplicity, keeping as string for now, assuming it might be plain text or needs processing.
});
export type ConfluenceSpaceDetailed = z.infer<
	typeof ConfluenceSpaceDetailedSchema
>;

// Confluence Page Body Content
export const ConfluencePageBodyStorageSchema = z.object({
	value: z.string(),
	representation: z.literal('storage'),
});
export type ConfluencePageBodyStorage = z.infer<
	typeof ConfluencePageBodyStorageSchema
>;

export const ConfluencePageBodyViewSchema = z.object({
	value: z.string(),
	representation: z.literal('view'),
});
export type ConfluencePageBodyView = z.infer<
	typeof ConfluencePageBodyViewSchema
>;

// Confluence Page Version
export const ConfluenceVersionSchema = z.object({
	number: z.number(),
	createdAt: z.string().datetime().optional(), // ISO 8601 date-time string, used in v2 API
	when: z.string().datetime().optional(), // ISO 8601 date-time string, used in v1 API
	message: z.string().optional(),
	minorEdit: z.boolean().optional(),
	authorId: z.string().optional(), // In v2 API
	by: z.object({ accountId: z.string() }).optional(), // In v1 API, simplified author
	ncsStepVersion: z.string().nullish().optional(), // Allow null values
});
export type ConfluenceVersion = z.infer<typeof ConfluenceVersionSchema>;

// Confluence Page Ancestor (Simplified)
export const ConfluencePageAncestorSchema = z.object({
	id: z.string(), // Page IDs are strings in content API, numbers in v2 pages API
	title: z.string(),
});
export type ConfluencePageAncestor = z.infer<
	typeof ConfluencePageAncestorSchema
>;

// Confluence Page (for listing results from v2 API)
export const ConfluencePageV2Schema = z.object({
	id: z.string().describe('ID of the page'),
	spaceId: z.string().describe('ID of the space the page belongs to'),
	status: z.string(),
	title: z.string(),
	parentId: z.string().nullish().optional(),
	position: z.number().optional(),
	createdAt: z.string().datetime().describe('Creation timestamp of the page'),
	version: z
		.object({
			number: z.number(),
			message: z.string().optional(),
			minorEdit: z.boolean().optional(),
			authorId: z.string().optional(),
			createdAt: z.string().datetime().optional(),
			ncsStepVersion: z.string().nullish().optional(), // Allow null values
		})
		.optional(), // Updated to match actual API response
	// _links: z.any().optional(), // For HATEOAS links
});
export type ConfluencePageV2 = z.infer<typeof ConfluencePageV2Schema>;

// Confluence Page Detailed (from v2 API)
export const ConfluencePageDetailedV2Schema = ConfluencePageV2Schema.extend({
	body: z.object({
		storage: ConfluencePageBodyStorageSchema.optional(),
		view: ConfluencePageBodyViewSchema.optional(), // If ever needed
		// raw: ... if ever needed
	}),
	version: ConfluenceVersionSchema, // Full version details
	ancestors: z.array(ConfluencePageAncestorSchema).optional(),
	// authors: z.any().optional(),
	// labels: z.any().optional(),
});
export type ConfluencePageDetailedV2 = z.infer<
	typeof ConfluencePageDetailedV2Schema
>;

// Using a generic for content because v1 content can be page, comment, attachment etc.
export const BaseConfluenceContentSchema = z.object({
	id: z.string(),
	type: z.string(), // e.g. 'page', 'comment', 'attachment'
	status: z.string(),
	title: z.string().optional(), // Not present for all content types
});

export const ConfluencePageContentSchema = BaseConfluenceContentSchema.extend({
	type: z.literal('page'),
	title: z.string(), // Title is mandatory for pages
	_expandable: z
		.object({
			ancestors: z.string().optional(),
			body: z.string().optional(),
			version: z.string().optional(),
		})
		.optional(),
	body: z
		.object({
			storage: ConfluencePageBodyStorageSchema.optional(),
			view: ConfluencePageBodyViewSchema.optional(),
		})
		.optional(),
	version: ConfluenceVersionSchema.optional(),
	ancestors: z.array(ConfluencePageAncestorSchema).optional(),
});
export type ConfluencePage = z.infer<typeof ConfluencePageContentSchema>;
