import { webfont } from 'webfont';
import fs from 'fs-extra';

import { FontConfig } from '../types/font';
import { ExtractedGlyph, FontMetadata } from '../types/glyph';
import { createTempSVGsFromGlyphs } from '../utils/svg-utils';
import * as path from 'path';

export async function generateFont(svgFiles: string[], config: FontConfig, unicodeMap?: Map<string, string>) {
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

export async function generateAdvancedFont(existingGlyphs: ExtractedGlyph[], newSvgFiles: string[], config: FontConfig, fontMetadata: FontMetadata): Promise<any> {
  try {
    const tempDir = path.join(config.outputDir, '.temp_glyphs');

    const existingGlyphSVGs = await createTempSVGsFromGlyphs(existingGlyphs, tempDir, fontMetadata.unitsPerEm);

    const allSvgFiles = [...existingGlyphSVGs, ...newSvgFiles];

    const unicodeMap = new Map<string, string>();

    existingGlyphs.forEach((glyph) => {
      unicodeMap.set(glyph.name, glyph.unicodeChar);
    });

    const existingUnicodes = existingGlyphs.map((g) => g.unicode);
    let nextUnicodeValue = existingUnicodes.length > 0 ? Math.max(...existingUnicodes) + 1 : 0xe000;

    newSvgFiles.forEach((svgFile) => {
      const iconName = path.basename(svgFile, '.svg');
      if (!unicodeMap.has(iconName)) {
        unicodeMap.set(iconName, String.fromCharCode(nextUnicodeValue));
        nextUnicodeValue++;
      }
    });

    const webfontConfig: any = {
      files: allSvgFiles,
      fontName: config.fontName,
      formats: ['woff', 'woff2', 'ttf'],
      fontHeight: fontMetadata.unitsPerEm || 1000,
      normalize: true,
      centerHorizontally: true,
      descent: fontMetadata.descender || 0,
      verbose: false,
      glyphTransformFn: (obj: any) => {
        const iconName = path.basename(obj.path, '.svg');
        if (unicodeMap.has(iconName)) {
          obj.unicode = [unicodeMap.get(iconName)];
        }
        return obj;
      },
    };

    const result = await webfont(webfontConfig);

    await fs.remove(tempDir);

    return result;
  } catch (error) {
    throw new Error(`Error generating advanced font: ${error}`);
  }
}
