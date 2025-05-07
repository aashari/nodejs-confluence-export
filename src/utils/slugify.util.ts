export function createSlug(title: string): string {
	if (!title) return 'untitled';
	return title
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-') // Replace spaces with -
		.replace(/[^\w-]+/g, '') // Remove all non-word chars
		.replace(/--+/g, '-') // Replace multiple - with single -
		.substring(0, 75); // Truncate
}
