import {
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';

export interface ExportSummary {
	spaceKey: string;
	spaceName?: string;
	pagesFound: number;
	pagesExported: number;
	pagesSkipped?: number;
	outputDir: string;
	format: string;
	ignoredFilters?: string[];
	errors: string[];
	totalTimeSeconds?: number;
	// Add other summary details
}

export function formatExportSummary(summary: ExportSummary): string {
	const lines: string[] = [];
	lines.push(
		formatHeading(
			`Confluence Export Summary for Space: ${summary.spaceKey} (${summary.spaceName || 'N/A'})`,
			1,
		),
	);
	lines.push('');

	const details: Record<string, unknown> = {
		'Space Key': summary.spaceKey,
		'Space Name': summary.spaceName || 'N/A',
		'Pages Found': summary.pagesFound,
		'Pages Exported': summary.pagesExported,
		'Pages Skipped': summary.pagesSkipped || 0,
		'Output Directory': summary.outputDir,
		'Export Format': summary.format,
		// Add more details as implemented
	};

	if (summary.totalTimeSeconds !== undefined) {
		details['Total Time'] = `${summary.totalTimeSeconds} seconds`;
	}

	lines.push(formatBulletList(details));
	lines.push('');

	if (summary.ignoredFilters && summary.ignoredFilters.length > 0) {
		lines.push(formatHeading('Applied Filters:', 2));
		lines.push(
			...summary.ignoredFilters.map((filter) => `- \`${filter}\``),
		);
		lines.push('');
	}

	if (summary.errors && summary.errors.length > 0) {
		lines.push(formatHeading('Errors Encountered:', 2));
		lines.push(...summary.errors.map((e) => `- ${e}`));
		lines.push('');
	}

	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Export process finished at: ${formatDate(new Date())}*`);
	return lines.join('\n');
}
