# MCP SVG to Font

A Model Context Protocol (MCP) server for generating icon fonts from SVG files. This tool converts your SVG icons into a full icon font family in multiple formats (TTF, WOFF, WOFF2) with accompanying CSS and TypeScript type definitions.

## Features

- Convert SVG icons to font formats (TTF, WOFF, WOFF2)
- Generate CSS with font-face declarations and icon classes
- Create TypeScript type definitions for type-safe icon usage
- List all available SVG files in a directory
- Compatible with the Model Context Protocol for AI agent integration

## Prerequisites

- Node.js 20.x or later
- pnpm 10.x or later (recommended)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd mcpFonts
```

2. Install dependencies:

```bash
pnpm install
```

## Development Mode

To run the MCP server in development mode:

```bash
pnpm dev
```

This will start the server using `tsx` to execute TypeScript files directly.

To test the MCP server with the Model Context Protocol Inspector:

```bash
npx -y @modelcontextprotocol/inspector npx tsx main.ts
```

This will launch the MCP Inspector interface in your browser, allowing you to interact with your MCP server and test its tools.

## Building the Project

To compile TypeScript to JavaScript:

```bash
pnpm build
```

This will generate JavaScript files in the `dist` directory.

## Using the MCP Server

### As a Local Development Tool

You can use the server's tools directly by calling the `main.ts` file with the appropriate input:

1. List SVG files in a directory:

```bash
echo '{"type":"tool_call","data":{"name":"list-svgs","params":{"directory":"./src/assets/icons"}}}' | pnpm dev
```

2. Generate font from SVG files:

```bash
echo '{"type":"tool_call","data":{"name":"generate-font-from-svgs","params":{"directory":"./src/assets/icons","fontName":"IconFont","outputDir":"./fonts","formats":["woff2","woff","ttf"],"cssPrefix":"icon","generateTypes":true}}}' | pnpm dev
```

### Connecting to an AI Agent

This MCP server can be connected to compatible AI agents that support the Model Context Protocol. Here's how to connect it:

#### With OpenAI's API

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Generate an icon font from my SVG files' }],
  tools: [
    {
      type: 'mcp_server',
      config: {
        path: 'npx tsx /path/to/mcpFonts/main.ts',
      },
    },
  ],
  tool_choice: 'auto',
});
```

#### With Microsoft Copilot

If using Microsoft Copilot in VS Code or GitHub Copilot, you can connect the MCP server through the appropriate extension settings.

## Using the Generated Font

After generating the font, you can use it in your web projects:

1. Import the CSS in your HTML file:

```html
<link rel="stylesheet" href="./fonts/IconFont.css" />
```

2. Use the icons with the provided classes:

```html
<span class="icon icon-instagram"></span> <span class="icon icon-typescript"></span>
```

### Using with TypeScript

If you've generated TypeScript types, you can import them for type-safe usage:

```typescript
import { IconName, getIconClass } from './fonts/IconFont.types';

// Type-safe icon name
const iconName: IconName = 'instagram';
const className = getIconClass(iconName); // returns "icon-instagram"
```

## Testing Icons

A test HTML file is included to help you preview all generated icons:

```bash
# Open the test file in your browser
open ./fonts/test.html
```

## Available Tools

The MCP server provides the following tools:

1. `list-svgs`: Lists all SVG files in a specified directory
2. `generate-font-from-svgs`: Generates a font from SVG files with the following options:
   - `directory`: Directory containing SVG files
   - `fontName`: Font name (default: "IconFont")
   - `outputDir`: Output directory (default: "./fonts")
   - `formats`: Font formats to generate (default: ["woff2", "woff", "ttf"])
   - `cssPrefix`: CSS class prefix (default: "icon")
   - `generateTypes`: Whether to generate TypeScript types (default: true)

## License

ISC
