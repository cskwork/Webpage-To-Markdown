# Webpage to Markdown Chrome Extension

A simple Chrome extension that converts any webpage to Markdown format with a single click.

## Features

- **One-Click Conversion**: Convert the current webpage to clean Markdown format
- **Smart Content Extraction**: Automatically detects and extracts main content while filtering out navigation, ads, and other unwanted elements
- **Iframe Support**: Extracts and includes content from embedded iframes when accessible
- **Copy to Clipboard**: Instantly copy the converted Markdown to your clipboard
- **Download as File**: Save the Markdown as a `.md` file with timestamp
- **Clean Output**: Removes scripts, styles, and other non-content elements for clean conversion

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. The extension icon will appear in your Chrome toolbar

## Usage

1. Navigate to any webpage you want to convert
2. Click the "Webpage to Markdown" extension icon in your toolbar
3. Click the "Convert Page" button
4. The webpage content will be converted to Markdown and displayed in the text area
5. Use "Copy to Clipboard" or "Download .md" to save your converted content

## How It Works

The extension uses:
- **Chrome Scripting API** to extract content from the active webpage
- **Turndown.js** library to convert HTML to Markdown
- **Smart content detection** to find main article/content areas
- **Content filtering** to remove navigation, ads, and other non-essential elements
- **Iframe processing** to include embedded content when possible

## Supported Content

- Articles and blog posts
- Documentation pages  
- News articles
- Social media posts
- Forum discussions
- Embedded content (iframes when accessible)

## Technical Details

- Built with Chrome Extensions Manifest V3
- Uses modern JavaScript with ES6+ features
- Implements comprehensive error handling
- Stores last conversion in Chrome local storage
- Clean, semantic HTML to Markdown conversion

## Permissions

The extension requires these permissions:
- `activeTab`: To access the current webpage content
- `scripting`: To inject content extraction scripts
- `storage`: To save conversion history

## Browser Support

- Chrome (Manifest V3 compatible)
- Chromium-based browsers (Edge, Brave, etc.)

## License

This project is open source and available under the MIT License.
