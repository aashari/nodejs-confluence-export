# nodejs-confluence-export

CLI tool to export Confluence pages by space with flexible filtering options.

## Features

- Export Confluence spaces to Markdown or HTML
- Hierarchical directory structure based on page ancestry
- Flexible ignore filters to exclude specific pages and their descendants
- Breadcrumb path information in exported files
- Handles Confluence macros, tables, images, and formatting

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables by copying `.env.example` to `.env` and filling in your Atlassian details:
    - `ATLASSIAN_SITE_NAME`: Your Confluence site name (e.g., `mycompany` for `mycompany.atlassian.net`)
    - `ATLASSIAN_USER_EMAIL`: Your email address used for Confluence
    - `ATLASSIAN_API_TOKEN`: Your Atlassian API token

## Usage

Build the tool:

```bash
npm run build
```

Export a space:

```bash
node dist/index.js export --space <SPACE_KEY> [options]
```

Or using the NPM script:

```bash
npm run start:cli -- export --space <SPACE_KEY> [options]
```

For development (watches changes):

```bash
npm run dev:cli -- export --space <SPACE_KEY> [options]
```

### Options

- `-s, --space <spaceKey>`: (Required) The key of the Confluence space to export
- `-o, --output-dir <path>`: Directory to save exported files (default: `./output`)
- `-f, --format <format>`: Export format - markdown or html (default: `markdown`)
- `--ignore <filter...>`: Pages to ignore. Format: "parent:ID" to ignore a page and all children, or "title:REGEX" to ignore pages matching regex pattern. Can be used multiple times.

### Examples

Export a space to a custom directory:

```bash
npm run dev:cli -- export --space DEV --output-dir ./my-exports
```

Export a space and ignore a specific page and all its children:

```bash
npm run dev:cli -- export --space DEV --ignore parent:12345678
```

Export a space and ignore all pages containing "DRAFT" in the title:

```bash
npm run dev:cli -- export --space DEV --ignore title:DRAFT
```

Use multiple ignore filters:

```bash
npm run dev:cli -- export --space DEV --ignore parent:12345678 --ignore title:DRAFT
```

## Development

- Run tests: `npm test`
- Format code: `npm run format`
- Lint code: `npm run lint`
