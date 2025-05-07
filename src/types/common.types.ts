/**
 * Common type definitions shared across controllers.
 * These types provide a standard interface for controller interactions.
 * Centralized here to ensure consistency across the codebase.
 */

/**
 * Common response structure for controller operations.
 * All controller methods should return this structure.
 */
export interface ControllerResponse {
	/**
	 * Formatted content to be displayed to the user.
	 * Usually a Markdown-formatted string.
	 */
	content: string;

	/**
	 * Optional metadata for any extra information associated with the response.
	 */
	metadata?: Record<string, unknown>;
}
