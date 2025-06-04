import fs from 'fs-extra';
import opentype from 'opentype.js';
import { ExtractedGlyph, FontMetadata } from '../types/glyph';

export async function extractGlyphsFromTTF(fontPath: string): Promise<FontMetadata> {
  try {
    const fontBuffer = await fs.readFile(fontPath);
    const font = opentype.parse(fontBuffer.buffer);

    const extractedGlyphs: ExtractedGlyph[] = [];

    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);

      if (glyph.unicode !== undefined && glyph.unicode > 32) {
        const pathData = glyph.path ? glyph.path.toPathData(10) : undefined;

        let glyphName = glyph.name || `glyph_${glyph.unicode}`;

        if (glyphName.startsWith('uni') && glyphName.length === 7) {
          glyphName = `icon_${glyph.unicode.toString(16)}`;
        }

        extractedGlyphs.push({
          name: glyphName,
          unicode: glyph.unicode,
          unicodeChar: String.fromCharCode(glyph.unicode),
          pathData: pathData,
          advanceWidth: glyph.advanceWidth,
        });
      }
    }

    return {
      fontFamily: font.names.fontFamily?.en || 'Unknown',
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      glyphs: extractedGlyphs,
    };
  } catch (error) {
    throw new Error(`Error extracting glyphs from TTF: ${error}`);
  }
}

export async function mapGlyphNamesWithCSS(extractedGlyphs: ExtractedGlyph[], cssPath: string): Promise<ExtractedGlyph[]> {
  try {
    const cssContent = await fs.readFile(cssPath, 'utf8');
    const iconMap = new Map<number, string>();

    const iconRegex = /\.([\w-]+)-([\w-]+):before\s*{\s*content:\s*"\\([0-9a-fA-F]+)"/g;
    let match;

    while ((match = iconRegex.exec(cssContent)) !== null) {
      const [, prefix, iconName, unicodeHex] = match;
      const unicode = parseInt(unicodeHex, 16);
      iconMap.set(unicode, iconName);
    }

    const mappedGlyphs = extractedGlyphs.map((glyph) => ({
      ...glyph,
      name: iconMap.get(glyph.unicode) || glyph.name,
    }));

    return mappedGlyphs;
  } catch (error) {
    throw new Error(`Error mapping glyph names with CSS: ${error}`);
  }
}
