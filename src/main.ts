#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'module';
import { registerAllTools } from './tools/index.js';

const { version } = createRequire(import.meta.url)('../package.json');

async function main() {
  const server = new McpServer({
    name: 'SVG-to-Font',
    version,
    description: 'MCP server for generating fonts from SVG files',
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
