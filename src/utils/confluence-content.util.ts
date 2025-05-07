import TurndownService from 'turndown';
import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/confluence-content.util.ts');
const turndownService = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	emDelimiter: '_',
	strongDelimiter: '**',
});

// Basic rule to handle Confluence user mentions <ac:link><ri:user ... /></ac:link>
turndownService.addRule('confluenceUserMention', {
	filter: (node: HTMLElement) => {
		return (
			node.nodeName === 'AC:LINK' &&
			node.querySelector('RI\\:USER') !== null
		);
	},
	replacement: (_content: string, node: Node) => {
		const htmlNode = node as HTMLElement;
		const userNode = htmlNode.querySelector('RI\\:USER');
		const username = userNode?.getAttribute('RI:USERKEY');
		return username ? `@[${username}]` : '[user]';
	},
});

// Basic handling for <ac:structured-macro ac:name="code">
turndownService.addRule('confluenceCodeMacro', {
	filter: (node: HTMLElement) => {
		return (
			node.nodeName === 'AC:STRUCTURED-MACRO' &&
			node.getAttribute('AC:NAME') === 'code'
		);
	},
	replacement: (_content: string, node: Node) => {
		const htmlNode = node as HTMLElement;
		const codeContentNode = htmlNode.querySelector('AC\\:PLAIN-TEXT-BODY');
		const codeContent = codeContentNode ? codeContentNode.textContent : '';
		let language = '';
		const params = htmlNode.querySelectorAll('AC\\:PARAMETER');
		params.forEach((param: Element) => {
			if (param.getAttribute('AC:NAME') === 'language') {
				language = param.textContent || '';
			}
		});
		return '```' + language + '\n' + codeContent + '\n```';
	},
});

// Handle info panels (info, note, warning, tip)
turndownService.addRule('confluenceInfoPanel', {
	filter: (node: HTMLElement) => {
		return (
			node.nodeName === 'AC:STRUCTURED-MACRO' &&
			['info', 'note', 'warning', 'tip'].includes(
				node.getAttribute('AC:NAME') || '',
			)
		);
	},
	replacement: (_content: string, node: Node) => {
		const htmlNode = node as HTMLElement;
		const macroName = htmlNode.getAttribute('AC:NAME') || 'info';
		const panelBody = htmlNode.querySelector('AC\\:RICH-TEXT-BODY');

		let panelContent = '';
		if (panelBody && panelBody.innerHTML) {
			panelContent = turndownService.turndown(panelBody.innerHTML);
		}

		// Use appropriate icon for panel type
		let icon = 'ℹ️';
		let title = 'Info';
		switch (macroName) {
			case 'note':
				icon = '📝';
				title = 'Note';
				break;
			case 'warning':
				icon = '⚠️';
				title = 'Warning';
				break;
			case 'tip':
				icon = '💡';
				title = 'Tip';
				break;
		}

		// Format as blockquote
		return `> **${icon} ${title}**\n> ${panelContent.replace(/\n/g, '\n> ')}\n`;
	},
});

// Handle expand macros
turndownService.addRule('confluenceExpandMacro', {
	filter: (node: HTMLElement) => {
		return (
			node.nodeName === 'AC:STRUCTURED-MACRO' &&
			node.getAttribute('AC:NAME') === 'expand'
		);
	},
	replacement: (_content: string, node: Node) => {
		const htmlNode = node as HTMLElement;
		const titleNode = htmlNode.querySelector(
			'AC\\:PARAMETER[AC\\:NAME="title"]',
		);
		const title = titleNode
			? titleNode.textContent || 'Details'
			: 'Details';

		const bodyNode = htmlNode.querySelector('AC\\:RICH-TEXT-BODY');
		let bodyContent = '';
		if (bodyNode && bodyNode.innerHTML) {
			bodyContent = turndownService.turndown(bodyNode.innerHTML);
		}

		// Format as summary/details
		return `<details>\n<summary>${title}</summary>\n\n${bodyContent}\n</details>\n`;
	},
});

// Handle images
turndownService.addRule('confluenceImage', {
	filter: (node: HTMLElement) => {
		return (
			node.nodeName === 'AC:IMAGE' ||
			(node.nodeName === 'AC:STRUCTURED-MACRO' &&
				node.getAttribute('AC:NAME') === 'image')
		);
	},
	replacement: (_content: string, node: Node) => {
		const htmlNode = node as HTMLElement;

		// Handle direct ac:image
		if (htmlNode.nodeName === 'AC:IMAGE') {
			const riAttachment = htmlNode.querySelector('RI\\:ATTACHMENT');
			if (riAttachment) {
				const filename =
					riAttachment.getAttribute('RI:FILENAME') || 'image';
				return `![${filename}](attachment:${filename})`;
			}
		}

		// Handle image macro
		if (htmlNode.nodeName === 'AC:STRUCTURED-MACRO') {
			// Try to find the image attachment reference
			const riAttachment = htmlNode.querySelector('RI\\:ATTACHMENT');
			if (riAttachment) {
				const filename =
					riAttachment.getAttribute('RI:FILENAME') || 'image';
				return `![${filename}](attachment:${filename})`;
			}

			// Check for external image URL
			const urlParam = htmlNode.querySelector(
				'AC\\:PARAMETER[AC\\:NAME="url"]',
			);
			if (urlParam && urlParam.textContent) {
				return `![Image](${urlParam.textContent})`;
			}
		}

		return '[Image]';
	},
});

// Handle tables with improved formatting
turndownService.addRule('confluenceTable', {
	filter: 'table',
	replacement: function (content, node) {
		const tableNode = node as HTMLElement;
		// Check if empty table
		if (!content.trim()) {
			return '';
		}

		// Generate a Markdown table
		const rows = tableNode.querySelectorAll('tr');
		if (rows.length === 0) return '';

		const markdownRows: string[] = [];
		const headerRow = rows[0];
		const headerCells = Array.from(headerRow.querySelectorAll('th'));

		// Create header row
		const headerMarkdown: string[] = [];
		headerCells.forEach((cell) => {
			headerMarkdown.push(cell.textContent?.trim() || '');
		});

		if (headerMarkdown.length === 0) {
			// If no TH cells, use first TD row as header
			const firstRowCells = Array.from(rows[0].querySelectorAll('td'));
			firstRowCells.forEach((cell) => {
				headerMarkdown.push(cell.textContent?.trim() || '');
			});
		}

		if (headerMarkdown.length > 0) {
			markdownRows.push(`| ${headerMarkdown.join(' | ')} |`);
			markdownRows.push(
				`| ${headerMarkdown.map(() => '---').join(' | ')} |`,
			);
		}

		// Skip the first row if it was used as header
		const startRowIndex = headerCells.length > 0 ? 1 : 1;

		// Process data rows
		for (let i = startRowIndex; i < rows.length; i++) {
			const rowCells = Array.from(rows[i].querySelectorAll('td'));
			const rowMarkdown: string[] = [];
			rowCells.forEach((cell) => {
				// Process cell content
				let cellContent = '';
				if (cell.innerHTML) {
					cellContent = turndownService
						.turndown(cell.innerHTML)
						.replace(/\n/g, ' ');
				}
				rowMarkdown.push(cellContent || '');
			});

			if (rowMarkdown.length > 0) {
				markdownRows.push(`| ${rowMarkdown.join(' | ')} |`);
			}
		}

		return markdownRows.join('\n') + '\n\n';
	},
});

// Handle list items
turndownService.addRule('listItems', {
	filter: ['ul', 'ol'],
	replacement: function (_content, node) {
		const listNode = node as HTMLElement;
		const isOrdered = listNode.nodeName === 'OL';
		const listItems = Array.from(listNode.querySelectorAll('li'));
		const result: string[] = [];

		let index = 1; // For ordered lists
		listItems.forEach((item) => {
			const prefix = isOrdered ? `${index}. ` : '- ';
			let itemContent = '';

			if (item.innerHTML) {
				itemContent = turndownService.turndown(item.innerHTML);
				// Handle nested lists - ensure proper indentation
				itemContent = itemContent.replace(/\n/g, '\n   ');
			}

			result.push(`${prefix}${itemContent}`);
			index++;
		});

		return result.join('\n') + '\n\n';
	},
});

export function convertStorageToMarkdown(storageXml: string): string {
	if (!storageXml) return '';
	try {
		logger.debug(
			'Attempting to convert Confluence storage XML to Markdown...',
		);
		const markdown = turndownService.turndown(storageXml);
		logger.debug('Turndown conversion successful.');
		return markdown;
	} catch (error) {
		logger.error('Error converting Confluence storage to Markdown', error);
		return `<!-- Error converting content: ${error instanceof Error ? error.message : 'Unknown error'} -->\n\n${storageXml}`;
	}
}
