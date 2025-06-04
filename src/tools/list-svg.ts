import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findSvgFiles } from '../services/file-handler';
import fs from 'fs-extra';
import * as path from 'path';

const listSvgsSchema = z.object({
  directory: z.string().describe('Directory to explore'),
});

export function registerListSvgsTool(server: McpServer): void {
  server.tool('list-svgs', 'List all SVG files in a directory', listSvgsSchema.shape, async ({ directory }) => {
    try {
      if (!(await fs.pathExists(directory))) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Directory ${directory} does not exist`,
            },
          ],
        };
      }

      const svgFiles = await findSvgFiles(directory);

      if (svgFiles.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No SVG files found in ${directory}`,
            },
          ],
        };
      }

      const fileList = svgFiles
        .map((file) => {
          const relativePath = path.relative(directory, file);
          const filename = path.basename(file, '.svg');
          return `• ${filename} (${relativePath})`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📁 SVG files found in ${directory}:\n\n${fileList}\n\nTotal: ${svgFiles.length} files`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: ${error}`,
          },
        ],
      };
    }
  });
}
