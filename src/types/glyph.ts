export interface ExtractedGlyph {
  name: string;
  unicode: number;
  unicodeChar: string;
  pathData?: string;
  advanceWidth?: number;
}

export interface FontMetadata {
  fontFamily: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphs: ExtractedGlyph[];
}
