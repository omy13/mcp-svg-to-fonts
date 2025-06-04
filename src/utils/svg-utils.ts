import { ExtractedGlyph } from '../types/glyph';
import fs from 'fs-extra';
import * as path from 'path';

export function pathDataToSVG(pathData: string, unitsPerEm: number = 1000): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${unitsPerEm} ${unitsPerEm}">
  <path d="${pathData}" transform="scale(1,-1) translate(0,-${unitsPerEm})"/>
</svg>`;
}

export async function createTempSVGsFromGlyphs(glyphs: ExtractedGlyph[], tempDir: string, unitsPerEm: number = 1000): Promise<string[]> {
  await fs.ensureDir(tempDir);
  const svgPaths: string[] = [];

  for (const glyph of glyphs) {
    if (glyph.pathData) {
      const svgContent = pathDataToSVG(glyph.pathData, unitsPerEm);
      const svgPath = path.join(tempDir, `${glyph.name}.svg`);
      await fs.writeFile(svgPath, svgContent);
      svgPaths.push(svgPath);
    }
  }

  return svgPaths;
}
