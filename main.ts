import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { glob } from 'glob';
import fs from 'fs-extra';
import * as path from 'path';
import { webfont } from 'webfont';

const server = new McpServer({
  name: 'SVG-to-Font',
  version: '1.1.0',
  description: 'MCP server for generating fonts from SVG files',
});

interface FontConfig {
  fontName: string;
  formats: string[];
  cssPrefix: string;
  outputDir: string;
}

interface ExistingIcon {
  name: string;
  unicode: string;
  svgPath?: string;
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

async function generateFont(svgFiles: string[], config: FontConfig, unicodeMap?: Map<string, string>) {
  try {
    const webfontConfig: any = {
      files: svgFiles,
      fontName: config.fontName,
      formats: ['woff', 'woff2', 'ttf'],
      fontHeight: 1000,
      normalize: true,
      centerHorizontally: true,
      descent: 0,
      verbose: false,
    };

    // If we have a unicode map, apply it to preserve existing codes
    if (unicodeMap) {
      webfontConfig.glyphTransformFn = (obj: any) => {
        const iconName = path.basename(obj.path, '.svg');
        if (unicodeMap.has(iconName)) {
          obj.unicode = [unicodeMap.get(iconName)];
        }
        return obj;
      };
    }

    const result = await webfont(webfontConfig);
    return result;
  } catch (error) {
    throw new Error(`Error generating font: ${error}`);
  }
}

function generateCSS(config: FontConfig, glyphs: any[], existingIcons?: ExistingIcon[]): string {
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

  // Create a map of all icons with their unicode values
  const allIcons = new Map<string, string>();

  // Add existing icons first (to maintain order)
  if (existingIcons) {
    existingIcons.forEach((icon) => {
      const unicode = icon.unicode.charCodeAt(0).toString(16);
      allIcons.set(icon.name, unicode);
    });
  }

  // Add new icons from glyphs
  glyphs.forEach((glyph) => {
    const iconName = path.basename(glyph.metadata.path, '.svg');
    const unicode = glyph.metadata.unicode[0].charCodeAt(0).toString(16);
    allIcons.set(iconName, unicode);
  });

  // Generate CSS classes for all icons
  const iconClasses = Array.from(allIcons.entries())
    .map(([iconName, unicode]) => {
      return `.${config.cssPrefix}-${iconName}:before { content: "\\${unicode}"; }`;
    })
    .join('\n');

  return fontFace + '\n' + iconClasses;
}

function generateTypeScript(config: FontConfig, glyphs: any[], existingIcons?: ExistingIcon[]): string {
  const allIconNames = new Set<string>();

  // Add existing icon names first
  if (existingIcons) {
    existingIcons.forEach((icon) => allIconNames.add(icon.name));
  }

  // Add new icon names from glyphs
  glyphs.forEach((glyph) => {
    const iconName = path.basename(glyph.metadata.path, '.svg');
    allIconNames.add(iconName);
  });

  const iconNamesArray = Array.from(allIconNames).map((name) => `'${name}'`);

  return `
export type IconName = ${iconNamesArray.join(' | ')};

export const ICON_NAMES: IconName[] = [${iconNamesArray.join(', ')}];

export const ICON_PREFIX = '${config.cssPrefix}';

export function getIconClass(iconName: IconName): string {
    return \`\${ICON_PREFIX}-\${iconName}\`;
}
`;
}

async function parseExistingFont(fontPath: string, cssPath: string): Promise<ExistingIcon[]> {
  try {
    const cssContent = await fs.readFile(cssPath, 'utf8');
    const icons: ExistingIcon[] = [];

    // Parse CSS to extract icon names and unicode values
    const iconRegex = new RegExp(`\\.(\\w+)-(\\w+):before\\s*{\\s*content:\\s*"\\\\([0-9a-fA-F]+)"`, 'g');
    let match;

    while ((match = iconRegex.exec(cssContent)) !== null) {
      const [, prefix, iconName, unicode] = match;
      icons.push({
        name: iconName,
        unicode: String.fromCharCode(parseInt(unicode, 16)),
      });
    }

    return icons;
  } catch (error) {
    throw new Error(`Error parsing existing font: ${error}`);
  }
}

function getNextUnicodeValue(existingIcons: ExistingIcon[]): number {
  if (existingIcons.length === 0) {
    return 0xe000; // Start of Private Use Area
  }

  const unicodeCodes = existingIcons.map((icon) => icon.unicode.charCodeAt(0));
  const maxCode = Math.max(...unicodeCodes);
  return maxCode + 1;
}

server.tool(
  'extend-existing-font',
  'Add new SVG icons to an existing font while preserving existing icons and unicode values',
  {
    existingFontDir: z.string().describe('Directory containing existing font files (.css and font files)'),
    originalSvgDirectory: z.string().describe('Directory containing the original SVG files used to create the existing font'),
    newSvgDirectory: z.string().describe('Directory containing new SVG files to add'),
    fontName: z.string().optional().describe('Font name (will be detected from existing files if not provided)'),
    outputDir: z.string().optional().describe('Output directory (default: same as existing font)'),
    cssPrefix: z.string().optional().describe('CSS class prefix (will be detected from existing CSS if not provided)'),
    generateTypes: z.boolean().optional().describe('Generate TypeScript types (default: true)'),
  },
  async ({ existingFontDir, originalSvgDirectory, newSvgDirectory, fontName, outputDir, cssPrefix, generateTypes = true }) => {
    try {
      // Check if directories exist
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

      // Find existing CSS file to parse current icons
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

      // Detect font name from CSS file if not provided
      if (!fontName) {
        fontName = path.basename(cssFile, '.css');
      }

      // Set output directory to existing font directory if not specified
      if (!outputDir) {
        outputDir = existingFontDir;
      }

      // Parse existing font to get current icons and unicode values
      const existingIcons = await parseExistingFont(path.join(existingFontDir, `${fontName}.ttf`), cssPath);

      // Detect CSS prefix from existing CSS if not provided
      if (!cssPrefix && existingIcons.length > 0) {
        const cssContent = await fs.readFile(cssPath, 'utf8');
        const prefixMatch = cssContent.match(/\.([\w-]+)-[\w-]+:before/);
        cssPrefix = prefixMatch ? prefixMatch[1] : 'icon';
      } else if (!cssPrefix) {
        cssPrefix = 'icon';
      }

      // Find original SVG files (the ones used to create the existing font)
      const originalSvgFiles = await findSvgFiles(originalSvgDirectory);

      // Find new SVG files
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

      // Check for name conflicts
      const existingIconNames = existingIcons.map((icon) => icon.name);
      const newIconNames = newSvgFiles.map((file) => path.basename(file, '.svg'));
      const originalIconNames = originalSvgFiles.map((file) => path.basename(file, '.svg'));

      // Check for conflicts between new icons and existing ones
      const conflicts = newIconNames.filter((name) => existingIconNames.includes(name));

      // Verify that original SVGs match existing icons (for consistency check)
      const missingOriginalSvgs = existingIconNames.filter((name) => !originalIconNames.includes(name));
      if (missingOriginalSvgs.length > 0) {
        console.warn(`⚠️  Warning: Some existing icons don't have corresponding SVG files in the original directory: ${missingOriginalSvgs.join(', ')}`);
      }

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

      // Create unicode map for existing icons
      const unicodeMap = new Map<string, string>();
      existingIcons.forEach((icon) => {
        unicodeMap.set(icon.name, icon.unicode);
      });

      // Assign new unicode values for new icons
      let nextUnicodeValue = getNextUnicodeValue(existingIcons);
      newIconNames.forEach((iconName) => {
        unicodeMap.set(iconName, String.fromCharCode(nextUnicodeValue));
        nextUnicodeValue++;
      });

      // Combine ALL SVG files: original + new
      // This ensures we regenerate the font with all icons, not just the new ones
      const allSvgFiles = [...originalSvgFiles, ...newSvgFiles];

      // Remove duplicates in case there are any
      const uniqueSvgFiles = Array.from(new Set(allSvgFiles));

      await fs.ensureDir(outputDir);

      const config: FontConfig = {
        fontName,
        formats: ['woff2', 'woff', 'ttf'],
        cssPrefix,
        outputDir,
      };

      // Generate font with preserved unicode mapping
      const result = await generateFont(uniqueSvgFiles, config, unicodeMap);

      const savedFiles: string[] = [];

      // Save font files
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

      // Generate updated CSS with ALL icons (existing + new)
      const css = generateCSS(config, result.glyphsData || [], existingIcons);
      const newCssPath = path.join(outputDir, `${fontName}.css`);
      await fs.writeFile(newCssPath, css);
      savedFiles.push(newCssPath);

      // Generate TypeScript types if requested (with ALL icons)
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
