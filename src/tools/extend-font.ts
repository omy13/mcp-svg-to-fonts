import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FontConfig, ExistingIcon } from '../types/font.js';
import { generateFont } from '../services/font-generator';
import { findSvgFiles, parseExistingFont } from '../services/file-handler';
import { generateCSS, generateTypeScript } from '../services/template-generator';
import { getNextUnicodeValue } from '../utils/unicode-utils';
import fs from 'fs-extra';
import * as path from 'path';

const extendFontSchema = z.object({
  existingFontDir: z.string().describe('Directory containing existing font files (.css and font files)'),
  originalSvgDirectory: z.string().describe('Directory containing the original SVG files used to create the existing font'),
  newSvgDirectory: z.string().describe('Directory containing new SVG files to add'),
  fontName: z.string().optional().describe('Font name (will be detected from existing files if not provided)'),
  outputDir: z.string().optional().describe('Output directory (default: same as existing font)'),
  cssPrefix: z.string().optional().describe('CSS class prefix (will be detected from existing CSS if not provided)'),
  generateTypes: z.boolean().optional().describe('Generate TypeScript types (default: true)'),
});

export function registerExtendFontTool(server: McpServer): void {
  server.tool(
    'extend-existing-font',
    'Add new SVG icons to an existing font while preserving existing icons and unicode values',
    extendFontSchema.shape,
    async ({ existingFontDir, originalSvgDirectory, newSvgDirectory, fontName, outputDir, cssPrefix, generateTypes = true }) => {
      try {
        if (!(await fs.pathExists(existingFontDir))) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Existing font directory ${existingFontDir} does not exist`,
              },
            ],
          };
        }

        if (!(await fs.pathExists(newSvgDirectory))) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ New SVG directory ${newSvgDirectory} does not exist`,
              },
            ],
          };
        }

        if (!(await fs.pathExists(originalSvgDirectory))) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Original SVG directory ${originalSvgDirectory} does not exist`,
              },
            ],
          };
        }

        const existingFiles = await fs.readdir(existingFontDir);
        const cssFile = existingFiles.find((file) => file.endsWith('.css'));

        if (!cssFile) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No CSS file found in ${existingFontDir}. Cannot determine existing icons.`,
              },
            ],
          };
        }

        const cssPath = path.join(existingFontDir, cssFile);

        if (!fontName) {
          fontName = path.basename(cssFile, '.css');
        }

        if (!outputDir) {
          outputDir = existingFontDir;
        }

        const existingIcons = await parseExistingFont(path.join(existingFontDir, `${fontName}.ttf`), cssPath);

        if (!cssPrefix && existingIcons.length > 0) {
          const cssContent = await import('fs-extra').then((fs) => fs.readFile(cssPath, 'utf8'));
          const prefixMatch = cssContent.match(/\.([\w-]+)-[\w-]+:before/);
          cssPrefix = prefixMatch ? prefixMatch[1] : 'icon';
        } else if (!cssPrefix) {
          cssPrefix = 'icon';
        }

        const originalSvgFiles = await findSvgFiles(originalSvgDirectory);
        const newSvgFiles = await findSvgFiles(newSvgDirectory);

        if (newSvgFiles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No SVG files found in ${newSvgDirectory}`,
              },
            ],
          };
        }

        const existingIconNames = existingIcons.map((icon) => icon.name);
        const newIconNames = newSvgFiles.map((file) => path.basename(file, '.svg'));
        const originalIconNames = originalSvgFiles.map((file) => path.basename(file, '.svg'));

        const conflicts = newIconNames.filter((name) => existingIconNames.includes(name));
        const missingOriginalSvgs = existingIconNames.filter((name) => !originalIconNames.includes(name));

        if (conflicts.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Icon name conflicts detected: ${conflicts.join(', ')}. Please rename these SVG files to avoid overwriting existing icons.`,
              },
            ],
          };
        }

        const unicodeMap = new Map<string, string>();
        existingIcons.forEach((icon) => {
          unicodeMap.set(icon.name, icon.unicode);
        });

        let nextUnicodeValue = getNextUnicodeValue(existingIcons);
        newIconNames.forEach((iconName) => {
          unicodeMap.set(iconName, String.fromCharCode(nextUnicodeValue));
          nextUnicodeValue++;
        });

        const allSvgFiles = [...originalSvgFiles, ...newSvgFiles];
        const uniqueSvgFiles = Array.from(new Set(allSvgFiles));

        await fs.ensureDir(outputDir);

        const config: FontConfig = {
          fontName,
          formats: ['woff2', 'woff', 'ttf'],
          cssPrefix,
          outputDir,
        };

        const result = await generateFont(uniqueSvgFiles, config, unicodeMap);
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

        const css = generateCSS(config, result.glyphsData || [], existingIcons);
        const newCssPath = path.join(outputDir, `${fontName}.css`);
        await fs.writeFile(newCssPath, css);
        savedFiles.push(newCssPath);

        if (generateTypes && result.glyphsData) {
          const typescript = generateTypeScript(config, result.glyphsData, existingIcons);
          const tsPath = path.join(outputDir, `${fontName}.types.ts`);
          await fs.writeFile(tsPath, typescript);
          savedFiles.push(tsPath);
        }

        const allIconNames = result.glyphsData?.map((glyph: any) => path.basename(glyph.metadata?.path || '', '.svg')) || [];
        const preservedIconCount = originalIconNames.filter((name) => allIconNames.includes(name)).length;

        const report = `✅ Font extended successfully!

📊 Statistics:
- Original icons preserved: ${preservedIconCount}
- New SVGs added: ${newSvgFiles.length}
- Total icons in font: ${allIconNames.length}
- Unicode values preserved: ✅

📁 Updated files:
${savedFiles.map((file) => `   • ${file}`).join('\n')}

🔄 Preserved icons:
${originalIconNames.map((name) => `   • ${cssPrefix}-${name}`).join('\n')}

🆕 New icons added:
${newIconNames.map((name) => `   • ${cssPrefix}-${name}`).join('\n')}

💡 HTML usage:
<i class="${cssPrefix} ${cssPrefix}-icon-name"></i>

💡 Import CSS:
<link rel="stylesheet" href="${outputDir}/${fontName}.css">

⚠️  Note: Existing projects using this font will continue to work without changes.`;

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
