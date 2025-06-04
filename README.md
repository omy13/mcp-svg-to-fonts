# MCP SVG to Font

A Model Context Protocol (MCP) server for generating and managing icon fonts from SVG files. This tool provides comprehensive font generation capabilities with backward compatibility and advanced glyph extraction features.

## ✨ Features

- **🎨 SVG to Font Conversion**: Convert SVG icons to multiple font formats (TTF, WOFF, WOFF2)
- **📝 CSS Generation**: Automatic CSS generation with font-face declarations and icon classes
- **🔷 TypeScript Support**: Generate type definitions for type-safe icon usage
- **🔄 Font Extension**: Add new icons to existing fonts while preserving backward compatibility
- **🔍 Advanced Glyph Extraction**: Extract existing glyphs from TTF files without requiring original SVGs
- **📁 Directory Scanning**: List and analyze SVG files in directories
- **🤖 AI Integration**: Full Model Context Protocol compatibility for AI agent integration

## 📋 Prerequisites

- **Node.js**: 20.x or later
- **pnpm**: 10.x or later (recommended)

## 🚀 Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd mcp-svg-to-font
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Build the project:**

```bash
pnpm build
```

## 🛠️ Development

### Development Mode

```bash
pnpm dev
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx src/main.ts
```

### Build for Production

```bash
pnpm build
```

## 🔧 MCP Configuration

Add this configuration to your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "svg-to-font": {
      "command": "npx",
      "args": ["tsx", "src/main.ts"],
      "cwd": "/path/to/mcp-svg-to-font"
    }
  }
}
```

For production (compiled version):

```json
{
  "mcpServers": {
    "svg-to-font": {
      "command": "node",
      "args": ["./dist/main.js"],
      "cwd": "/path/to/mcp-svg-to-font"
    }
  }
}
```

## 🛠️ Available Tools

### 1. `list-svgs`

**Purpose**: Scan and list all SVG files in a directory

**Parameters**:

- `directory` (string, required): Directory path to scan for SVG files

**Use Case**:

- Inventory available icons before font generation
- Verify SVG file structure and naming
- Quality assurance before batch processing

**Example**:

```json
{
  "directory": "./icons"
}
```

### 2. `generate-font-from-svgs`

**Purpose**: Create a brand new icon font from a collection of SVG files

**Parameters**:

- `directory` (string, required): Directory containing SVG files
- `fontName` (string, optional): Font family name (default: "IconFont")
- `outputDir` (string, optional): Output directory (default: "./fonts")
- `formats` (array, optional): Font formats to generate (default: ["woff2", "woff", "ttf"])
- `cssPrefix` (string, optional): CSS class prefix (default: "icon")
- `generateTypes` (boolean, optional): Generate TypeScript types (default: true)

**Use Case**:

- Initial font creation from scratch
- Complete icon system setup
- Migrating from icon libraries to custom fonts

**Generated Files**:

- `FontName.ttf`, `FontName.woff`, `FontName.woff2`
- `FontName.css` with font-face and icon classes
- `FontName.types.ts` with TypeScript definitions

### 3. `extend-existing-font`

**Purpose**: Add new icons to an existing font while preserving all existing icons and their Unicode values

**Parameters**:

- `existingFontDir` (string, required): Directory with existing font files (.css and font files)
- `originalSvgDirectory` (string, required): Directory with original SVG files used to create the existing font
- `newSvgDirectory` (string, required): Directory with new SVG files to add
- `fontName` (string, optional): Font name (auto-detected if not provided)
- `outputDir` (string, optional): Output directory (default: same as existing font)
- `cssPrefix` (string, optional): CSS class prefix (auto-detected if not provided)
- `generateTypes` (boolean, optional): Generate TypeScript types (default: true)

**Use Case**:

- Adding new icons to established icon systems
- Maintaining backward compatibility with existing applications
- Incremental icon library expansion

**Requirements**:

- Access to original SVG files used in the existing font
- Existing CSS file for Unicode mapping detection

**Compatibility**:
✅ **100% Backward Compatible** - Existing projects continue to work without changes

### 4. `extend-font-advanced`

**Purpose**: Add new icons to an existing font by extracting original glyphs directly from the TTF file, without requiring original SVG files

**Parameters**:

- `existingFontDir` (string, required): Directory containing existing font files (.css and .ttf files)
- `newSvgDirectory` (string, required): Directory containing new SVG files to add
- `fontName` (string, optional): Font name (auto-detected from files)
- `outputDir` (string, optional): Output directory (default: same as existing font)
- `cssPrefix` (string, optional): CSS class prefix (auto-detected from CSS)
- `generateTypes` (boolean, optional): Generate TypeScript types (default: true)
- `preserveMetrics` (boolean, optional): Preserve original font metrics (default: true)

**Use Case**:

- Extending third-party icon fonts
- Working with legacy fonts where SVG sources are unavailable
- Reverse-engineering and enhancing existing font assets

**Advanced Features**:

- **Glyph Extraction**: Uses OpenType.js to extract vector paths from TTF files
- **Unicode Preservation**: Maintains all original Unicode mappings
- **Font Metrics Preservation**: Keeps original font dimensions and spacing
- **CSS Integration**: Maps extracted glyphs with CSS class names

**Requirements**:

- Original TTF font file
- CSS file with Unicode mappings (for glyph name detection)
- **Format**: CSS classes like `.icon-name:before { content: "\\e001"; }`

**Technical Process**:

1. Parse TTF file to extract glyph vector data
2. Map glyph Unicode values to CSS class names
3. Convert extracted glyphs back to temporary SVG files
4. Combine extracted glyphs with new SVG files
5. Generate new font with preserved Unicode values

**Compatibility**:
✅ **100% Backward Compatible** - All original icons maintain their Unicode values

## 📁 Generated Font Structure

After font generation, you'll get:

```
fonts/
├── IconFont.css          # CSS with font-face and icon classes
├── IconFont.ttf          # TrueType font
├── IconFont.woff         # Web Open Font Format
├── IconFont.woff2        # Web Open Font Format 2.0
└── IconFont.types.ts     # TypeScript type definitions
```

## 💻 Usage Examples

### Basic HTML Usage

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="./fonts/IconFont.css" />
  </head>
  <body>
    <i class="icon icon-home"></i>
    <i class="icon icon-user"></i>
    <i class="icon icon-settings"></i>
  </body>
</html>
```

### CSS Styling

```css
.icon {
  font-family: 'IconFont';
  font-size: 24px;
  color: #333;
}

.icon-home:before {
  content: '\e001';
}
```

### TypeScript Integration

```typescript
import { IconName, getIconClass, ICON_NAMES } from './fonts/IconFont.types';

// Type-safe icon usage
const iconName: IconName = 'home';
const className = getIconClass(iconName); // Returns "icon-home"

// Get all available icons
const allIcons = ICON_NAMES; // ['home', 'user', 'settings', ...]
```

### React Component Example

```tsx
import { IconName, getIconClass } from './fonts/IconFont.types';

interface IconProps {
  name: IconName;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = '' }) => {
  return <i className={`icon ${getIconClass(name)} ${className}`} />;
};

// Usage
<Icon name="home" className="text-blue-500" />;
```

## 🔄 Workflow Examples

### Scenario 1: Creating a New Icon System

1. Prepare SVG icons in a directory
2. Use `list-svgs` to verify files
3. Use `generate-font-from-svgs` to create the font
4. Integrate generated CSS and fonts into your project

### Scenario 2: Adding Icons to Your Existing Font

1. Place new SVG files in a directory
2. Use `extend-existing-font` with original SVGs
3. Replace old font files with new ones
4. Existing code continues to work + new icons available

### Scenario 3: Extending a Third-Party Font

1. Obtain the TTF file and CSS from the third-party font
2. Create new SVG icons
3. Use `extend-font-advanced` to merge them
4. Get a new font with both original and new icons

## ⚠️ Important Notes

### Font Extension Requirements

- **For `extend-existing-font`**: Requires original SVG files
- **For `extend-font-advanced`**: Requires TTF file and CSS with Unicode mappings

### CSS Format for Advanced Extension

Your CSS file must include Unicode mappings in this format:

```css
.icon-home:before {
  content: '\e001';
}
.icon-user:before {
  content: '\e002';
}
.icon-settings:before {
  content: '\e003';
}
```

### Best Practices

- Use consistent SVG dimensions (preferably square)
- Optimize SVGs before font generation
- Test fonts across different browsers
- Keep backup of original SVG files
- Use semantic icon names

## 🐛 Troubleshooting

### Common Issues

**"No SVG files found"**

- Verify directory path
- Ensure SVG files have `.svg` extension
- Check file permissions

**"Icon name conflicts detected"**

- Rename conflicting SVG files
- Avoid duplicate icon names

**"No TTF file found"**

- Ensure TTF file exists in the specified directory
- Check file extension (.ttf)

**"Cannot parse existing font"**

- Verify CSS file format
- Ensure Unicode mappings are present
