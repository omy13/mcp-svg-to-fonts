import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGenerateFontTool } from './generate-font.js';
import { registerExtendFontTool } from './extend-font.js';
import { registerExtendFontAdvancedTool } from './extend-font-advanced.js';
import { registerListSvgsTool } from './list-svg.js';

export function registerAllTools(server: McpServer): void {
  registerGenerateFontTool(server);
  registerExtendFontTool(server);
  registerExtendFontAdvancedTool(server);
  registerListSvgsTool(server);
}
