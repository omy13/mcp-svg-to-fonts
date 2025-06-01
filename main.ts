import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { glob } from 'glob';
import fs from 'fs-extra';
import * as path from 'path';
import { webfont } from 'webfont';

const server = new McpServer({
  name: 'SVG-to-Font',
  version: '1.0.0',
  description: 'MCP server for generating fonts from SVG files',
});

interface FontConfig {
  fontName: string;
  formats: string[];
  cssPrefix: string;
  outputDir: string;
}

async function findSvgFiles(directory: string): Promise<string[]> {
  try {
    const svgPattern = path.join(directory, '**/*.svg');
    const files = await glob(svgPattern);
    return files;
  } catch (error) {
    throw new Error(`Error finding SVG files: ${error}`);
  }
}

async function generateFont(svgFiles: string[], config: FontConfig) {
  try {
    const result = await webfont({
      files: svgFiles,
      fontName: config.fontName,
      formats: ['woff', 'woff2', 'ttf'],
      fontHeight: 1000,
      normalize: true,
      centerHorizontally: true,
      descent: 0,
      verbose: false,
    });

    return result;
  } catch (error) {
    throw new Error(`Error generating font: ${error}`);
  }
}

function generateCSS(config: FontConfig, glyphs: any[]): string {
  const fontFace = `
@font-face {
    font-family: '${config.fontName}';
    src: url('./${config.fontName}.woff2') format('woff2'),
         url('./${config.fontName}.woff') format('woff'),
         url('./${config.fontName}.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

.${config.cssPrefix} {
    font-family: '${config.fontName}';
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
`;

  const iconClasses = glyphs
    .map((glyph) => {
      const iconName = path.basename(glyph.metadata.path, '.svg');
      const unicode = glyph.metadata.unicode[0];
      return `.${config.cssPrefix}-${iconName}:before { content: "\\${unicode.charCodeAt(0).toString(16)}"; }`;
    })
    .join('\n');

  return fontFace + '\n' + iconClasses;
}

function generateTypeScript(config: FontConfig, glyphs: any[]): string {
  const iconNames = glyphs.map((glyph) => {
    const iconName = path.basename(glyph.metadata.path, '.svg');
    return `'${iconName}'`;
  });

  return `
export type IconName = ${iconNames.join(' | ')};

export const ICON_NAMES: IconName[] = [${iconNames.join(', ')}];

export const ICON_PREFIX = '${config.cssPrefix}';

export function getIconClass(iconName: IconName): string {
    return \`\${ICON_PREFIX}-\${iconName}\`;
}
`;
}

server.tool(
  'generate-font-from-svgs',
  'Generate an icon font from SVG files in a directory',
  {
    directory: z.string().describe('Directory containing SVG files'),
    fontName: z.string().optional().describe('Font name (default: "IconFont")'),
    outputDir: z.string().optional().describe('Output directory (default: "./fonts")'),
    formats: z.array(z.string()).optional().describe('Font formats to generate'),
    cssPrefix: z.string().optional().describe('CSS class prefix (default: "icon")'),
    generateTypes: z.boolean().optional().describe('Generate TypeScript types (default: true)'),
  },
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

server.tool(
  'list-svgs',
  'List all SVG files in a directory',
  {
    directory: z.string().describe('Directory to explore'),
  },
  async ({ directory }) => {
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
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
