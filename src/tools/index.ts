import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGenerateFontTool } from './generate-font';
import { registerExtendFontTool } from './extend-font';
import { registerExtendFontAdvancedTool } from './extend-font-advanced';
import { registerListSvgsTool } from './list-svg';

export function registerAllTools(server: McpServer): void {
  registerGenerateFontTool(server);
  registerExtendFontTool(server);
  registerExtendFontAdvancedTool(server);
  registerListSvgsTool(server);
}