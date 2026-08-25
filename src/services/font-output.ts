import fs from 'fs-extra';
import * as path from 'path';
import { FontConfig, ExistingIcon } from '../types/font.js';
import { generateCSS, generateTypeScript } from './template-generator.js';

type FontResult = {
  woff2?: Buffer;
  woff?: Buffer;
  ttf?: Buffer;
  glyphsData?: any[];
};

export async function saveFontOutput(
  result: FontResult,
  config: FontConfig,
  options: {
    generateTypes?: boolean;
    existingIcons?: ExistingIcon[];
  } = {}
): Promise<string[]> {
  const { fontName, outputDir } = config;
  const { generateTypes = true, existingIcons } = options;
  const savedFiles: string[] = [];

  const formats = [
    { key: 'woff2' as const, ext: 'woff2' },
    { key: 'woff' as const, ext: 'woff' },
    { key: 'ttf' as const, ext: 'ttf' },
  ];

  for (const { key, ext } of formats) {
    const data = result[key];
    if (data) {
      const filePath = path.join(outputDir, `${fontName}.${ext}`);
      await fs.writeFile(filePath, data);
      savedFiles.push(filePath);
    }
  }

  const css = generateCSS(config, result.glyphsData || [], existingIcons);
  const cssPath = path.join(outputDir, `${fontName}.css`);
  await fs.writeFile(cssPath, css);
  savedFiles.push(cssPath);

  if (generateTypes && result.glyphsData) {
    const typescript = generateTypeScript(config, result.glyphsData, existingIcons);
    const tsPath = path.join(outputDir, `${fontName}.types.ts`);
    await fs.writeFile(tsPath, typescript);
    savedFiles.push(tsPath);
  }

  return savedFiles;
}

export function getIconNamesFromGlyphs(glyphsData?: any[]): string[] {
  return glyphsData?.map((glyph: any) => path.basename(glyph.metadata?.path || '', '.svg')) || [];
}
