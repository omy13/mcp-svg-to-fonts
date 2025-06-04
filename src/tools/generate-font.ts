import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FontConfig } from '../types/font';
import { generateFont } from '../services/font-generator';
import { findSvgFiles } from '../services/file-handler';
import { generateCSS, generateTypeScript } from '../services/template-generator';
import fs from 'fs-extra';
import * as path from 'path';

const generateFontSchema = z.object({
  directory: z.string().describe('Directory containing SVG files'),
  fontName: z.string().optional().describe('Font name (default: "IconFont")'),
  outputDir: z.string().optional().describe('Output directory (default: "./fonts")'),
  formats: z.array(z.string()).optional().describe('Font formats to generate'),
  cssPrefix: z.string().optional().describe('CSS class prefix (default: "icon")'),
  generateTypes: z.boolean().optional().describe('Generate TypeScript types (default: true)'),
});

export function registerGenerateFontTool(server: McpServer): void {
  server.tool(
    'generate-font-from-svgs',
    'Generate an icon font from SVG files in a directory',
    generateFontSchema.shape,
    async ({ directory, fontName = 'IconFont', outputDir = './fonts', formats = ['woff2', 'woff', 'ttf'], cssPrefix = 'icon', generateTypes = true }) => {
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
                text: `❌ No SVG files found in ${directory}`,
              },
            ],
          };
        }

        await fs.ensureDir(outputDir);

        const config: FontConfig = {
          fontName,
          formats,
          cssPrefix,
          outputDir,
        };

        const result = await generateFont(svgFiles, config);
        const savedFiles: string[] = [];

        if (result.woff2) {
          const woff2Path = path.join(outputDir, `${fontName}.woff2`);
          await fs.writeFile(woff2Path, result.woff2);
          savedFiles.push(woff2Path);
        }

        if (result.woff) {
          const woffPath = path.join(outputDir, `${fontName}.woff`);
          await fs.writeFile(woffPath, result.woff);
          savedFiles.push(woffPath);
        }

        if (result.ttf) {
          const ttfPath = path.join(outputDir, `${fontName}.ttf`);
          await fs.writeFile(ttfPath, result.ttf);
          savedFiles.push(ttfPath);
        }

        const css = generateCSS(config, result.glyphsData || []);
        const cssPath = path.join(outputDir, `${fontName}.css`);
        await fs.writeFile(cssPath, css);
        savedFiles.push(cssPath);

        if (generateTypes && result.glyphsData) {
          const typescript = generateTypeScript(config, result.glyphsData);
          const tsPath = path.join(outputDir, `${fontName}.types.ts`);
          await fs.writeFile(tsPath, typescript);
          savedFiles.push(tsPath);
        }

        const iconNames = result.glyphsData?.map((glyph: any) => path.basename(glyph.metadata?.path || '', '.svg')) || [];

        const report = `✅ Font generated successfully!

📊 Statistics:
• SVGs processed: ${svgFiles.length}
• Icons generated: ${iconNames.length}
• Formats: ${formats.join(', ')}

📁 Generated files:
${savedFiles.map((file) => `   • ${file}`).join('\n')}

🎨 Available icons:
${iconNames.map((name) => `   • ${cssPrefix}-${name}`).join('\n')}

💡 HTML usage:
<i class="${cssPrefix} ${cssPrefix}-icon-name"></i>

💡 Import CSS:
<link rel="stylesheet" href="${outputDir}/${fontName}.css">`;

        return {
          content: [
            {
              type: 'text',
              text: report,
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
    }
  );
}
