# Confluence Export CLI

A powerful Node.js/TypeScript command-line tool for exporting Confluence pages with advanced filtering capabilities, preserving page relationships and content formatting.

---

# Overview

This CLI tool enables you to export entire Confluence spaces to your local filesystem while maintaining hierarchical structure and page relationships. It converts Confluence's complex storage format into clean Markdown or HTML files with proper formatting for macros, tables, code blocks, and other Confluence elements.

## Key Features

- **Complete Space Export**: Export an entire Confluence space with a single command
- **Hierarchical Organization**: Preserves page ancestry and relationships in folder structure
- **Flexible Filtering**: Exclude specific pages or entire branches with parent-based or title pattern filters
- **Content Preservation**: Properly renders Confluence macros, tables, code blocks, info/note panels, and more
- **Metadata Retention**: Includes page metadata (created date, updated date, path/breadcrumbs) in exports
- **Progress Indicators**: Shows real-time progress during export with clear summaries

---

# Getting Started

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **Confluence Cloud Account** with API access

---

## Installation

### Option 1: Global Installation

```bash
npm install -g nodejs-confluence-export
```

This makes the `confluence-export` command available globally.

### Option 2: npx Usage

Use without installing:

```bash
npx nodejs-confluence-export [commands]
```

---

## Authentication

Create an Atlassian API token from [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

Configure your credentials using one of these methods:

### Method 1: Environment Variables

Set these environment variables:

```bash
export ATLASSIAN_SITE_NAME="yourcompany"        # For yourcompany.atlassian.net
export ATLASSIAN_USER_EMAIL="your.email@example.com"
export ATLASSIAN_API_TOKEN="your-api-token"
```

### Method 2: .env File

Create a `.env` file in your project directory:

```
ATLASSIAN_SITE_NAME=yourcompany
ATLASSIAN_USER_EMAIL=your.email@example.com
ATLASSIAN_API_TOKEN=your-api-token
```

---

# Usage Examples

## Basic Space Export

Export a space to the default output directory (`./output`):

```bash
confluence-export export --space SPACEKEY
```

Using inline environment variables:

```bash
ATLASSIAN_SITE_NAME=yourcompany ATLASSIAN_USER_EMAIL=your.email@example.com ATLASSIAN_API_TOKEN=your-api-token confluence-export export --space SPACEKEY
```

With npx:

```bash
ATLASSIAN_SITE_NAME=yourcompany ATLASSIAN_USER_EMAIL=your.email@example.com ATLASSIAN_API_TOKEN=your-api-token npx nodejs-confluence-export export --space SPACEKEY
```

## Custom Output Directory

```bash
confluence-export export --space SPACEKEY --output-dir ./my-exports
```

## Choose Format (Markdown or HTML)

```bash
confluence-export export --space SPACEKEY --format html
```

## Filter Pages to Exclude

Exclude a specific page and all its children:

```bash
confluence-export export --space SPACEKEY --ignore parent:12345678
```

Exclude pages matching a title pattern:

```bash
confluence-export export --space SPACEKEY --ignore title:DRAFT
```

Use multiple filters:

```bash
confluence-export export --space SPACEKEY --ignore parent:12345678 --ignore title:"Internal Only"
```

---

# Command Reference

## Main Commands

```
confluence-export export [options]  Export Confluence pages from a specified space
```

## Export Options

- `-s, --space <spaceKey>`: (Required) The key of the Confluence space to export
- `-o, --output-dir <path>`: Directory to save exported files (default: `./output`)
- `-f, --format <format>`: Export format - markdown or html (default: `markdown`)
- `--ignore <filter...>`: Pages to ignore. Format: "parent:ID" to ignore a page and all children, or "title:REGEX" to ignore pages matching regex pattern. Can be used multiple times.

---

# Output Structure

The exported content will be organized as follows:

```
output/
├── space-name/
│   ├── page-title-1/
│   │   ├── child-page-1.md
│   │   └── child-page-2.md
│   ├── page-title-2/
│   │   └── ...
│   └── ...
└── ...
```

Each Markdown/HTML file includes:

1. Title as heading
2. Metadata section with:
    - Path/breadcrumbs
    - Created date
    - Updated date
3. Page content with properly rendered Confluence elements
4. Footer with export timestamp

---

# Troubleshooting

If you encounter issues with the export:

1. Verify your Atlassian credentials are correct
2. Ensure you have appropriate permissions for the space
3. Check for rate limiting if exporting large spaces
4. Use the `DEBUG=true` environment variable for detailed logs:

```bash
DEBUG=true confluence-export export --space SPACEKEY
```

---

# Development

- Build: `npm run build`
- Test: `npm test`
- Format code: `npm run format`
- Lint code: `npm run lint`

---

# License

MIT
