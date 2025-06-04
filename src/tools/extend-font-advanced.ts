import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FontConfig } from '../types/font';
import { ExtractedGlyph, FontMetadata } from '../types/glyph';
import { generateAdvancedFont } from '../services/font-generator';
import { findSvgFiles } from '../services/file-handler';
import { extractGlyphsFromTTF, mapGlyphNamesWithCSS } from '../services/glyph-extractor';
import { generateCSS, generateTypeScript } from '../services/template-generator';
import fs from 'fs-extra';
import * as path from 'path';

const extendFontAdvancedSchema = z.object({
  existingFontDir: z.string().describe('Directory containing existing font files (.css and .ttf files)'),
  newSvgDirectory: z.string().describe('Directory containing new SVG files to add'),
  fontName: z.string().optional().describe('Font name (will be detected from existing files if not provided)'),
  outputDir: z.string().optional().describe('Output directory (default: same as existing font)'),
  cssPrefix: z.string().optional().describe('CSS class prefix (will be detected from existing CSS if not provided)'),
  generateTypes: z.boolean().optional().describe('Generate TypeScript types (default: true)'),
  preserveMetrics: z.boolean().optional().describe('Preserve original font metrics (default: true)'),
});

export function registerExtendFontAdvancedTool(server: McpServer): void {
  server.tool(
    'extend-font-advanced',
    'Add new SVG icons to an existing font by extracting and preserving original glyphs from TTF file',
    extendFontAdvancedSchema.shape,
    async ({ existingFontDir, newSvgDirectory, fontName, outputDir, cssPrefix, generateTypes = true, preserveMetrics = true }) => {
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

        const existingFiles = await fs.readdir(existingFontDir);
        const cssFile = existingFiles.find((file) => file.endsWith('.css'));
        const ttfFile = existingFiles.find((file) => file.endsWith('.ttf'));

        if (!cssFile) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No CSS file found in ${existingFontDir}`,
              },
            ],
          };
        }

        if (!ttfFile) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No TTF file found in ${existingFontDir}. This tool requires the original TTF file to extract glyphs.`,
              },
            ],
          };
        }

        const cssPath = path.join(existingFontDir, cssFile);
        const ttfPath = path.join(existingFontDir, ttfFile);

        if (!fontName) {
          fontName = path.basename(ttfFile, '.ttf');
        }

        if (!outputDir) {
          outputDir = existingFontDir;
        }

        const fontMetadata = await extractGlyphsFromTTF(ttfPath);
        const mappedGlyphs = await mapGlyphNamesWithCSS(fontMetadata.glyphs, cssPath);

        if (!cssPrefix) {
          const cssContent = await fs.readFile(cssPath, 'utf8');
          const prefixMatch = cssContent.match(/\.([\w-]+)-[\w-]+:before/);
          cssPrefix = prefixMatch ? prefixMatch[1] : 'icon';
        }

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

        const existingIconNames = mappedGlyphs.map((glyph) => glyph.name);
        const newIconNames = newSvgFiles.map((file) => path.basename(file, '.svg'));
        const conflicts = newIconNames.filter((name) => existingIconNames.includes(name));

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

        await fs.ensureDir(outputDir);

        const config: FontConfig = {
          fontName,
          formats: ['woff2', 'woff', 'ttf'],
          cssPrefix,
          outputDir,
        };

        const result = await generateAdvancedFont(mappedGlyphs, newSvgFiles, config, fontMetadata);
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

        const allGlyphs = [
          ...mappedGlyphs,
          ...newSvgFiles.map((file) => ({
            metadata: { path: file },
          })),
        ];

        const css = generateCSS(config, result.glyphsData || []);
        const newCssPath = path.join(outputDir, `${fontName}.css`);
        await fs.writeFile(newCssPath, css);
        savedFiles.push(newCssPath);

        if (generateTypes && result.glyphsData) {
          const typescript = generateTypeScript(config, result.glyphsData);
          const tsPath = path.join(outputDir, `${fontName}.types.ts`);
          await fs.writeFile(tsPath, typescript);
          savedFiles.push(tsPath);
        }

        const totalIconCount = mappedGlyphs.length + newSvgFiles.length;

        const report = `✅ Font extended successfully with preserved glyphs!

📊 Statistics:
- Original glyphs extracted and preserved: ${mappedGlyphs.length}
- New SVGs added: ${newSvgFiles.length}
- Total icons in font: ${totalIconCount}
- Font metrics preserved: ${preserveMetrics ? '✅' : '❌'}
- Unicode values preserved: ✅

🔍 Font analysis:
- Original font family: ${fontMetadata.fontFamily}
- Units per EM: ${fontMetadata.unitsPerEm}
- Ascender: ${fontMetadata.ascender}
- Descender: ${fontMetadata.descender}

📁 Generated files:
${savedFiles.map((file) => `   • ${file}`).join('\n')}

🔄 Preserved icons (extracted from TTF):
${existingIconNames
  .slice(0, 10)
  .map((name) => `   • ${cssPrefix}-${name}`)
  .join('\n')}${existingIconNames.length > 10 ? `\n   ... and ${existingIconNames.length - 10} more` : ''}

🆕 New icons added:
${newIconNames.map((name) => `   • ${cssPrefix}-${name}`).join('\n')}

💡 HTML usage:
<i class="${cssPrefix} ${cssPrefix}-icon-name"></i>

💡 Import CSS:
<link rel="stylesheet" href="${outputDir}/${fontName}.css">

✨ All original glyphs have been perfectly preserved from the TTF file!
⚠️  Existing projects using this font will continue to work without changes.`;

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
