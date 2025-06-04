export interface FontConfig {
  fontName: string;
  formats: string[];
  cssPrefix: string;
  outputDir: string;
}

export interface ExistingIcon {
  name: string;
  unicode: string;
  svgPath?: string;
}
