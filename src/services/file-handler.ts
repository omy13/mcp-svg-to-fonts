import { glob } from 'glob';
import fs from 'fs-extra';
import { ExistingIcon } from '../types/font';
import * as path from 'path';

export async function findSvgFiles(directory: string): Promise<string[]> {
  try {
    const svgPattern = path.join(directory, '**/*.svg');
    const files = await glob(svgPattern);
    return files;
  } catch (error) {
    throw new Error(`Error finding SVG files: ${error}`);
  }
}

export async function parseExistingFont(fontPath: string, cssPath: string): Promise<ExistingIcon[]> {
  try {
    const cssContent = await fs.readFile(cssPath, 'utf8');
    const icons: ExistingIcon[] = [];

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
