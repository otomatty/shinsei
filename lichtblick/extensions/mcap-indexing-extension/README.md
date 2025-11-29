# MCAP Indexing Tool Extension

A Lichtblick extension that provides a tool for creating indexed versions of MCAP files to improve playback performance.

## 🎯 Overview

This extension adds a panel to Lichtblick that allows users to select MCAP files and create indexed versions for better seek performance and reduced memory usage during playback.

## ✨ Features

- **File Selection**: Simple interface to select multiple MCAP files
- **File Information**: Display file names and sizes
- **Ready for Processing**: Visual indication of files ready for indexing
- **Clean UI**: Dark theme integration with Lichtblick

## 🚀 Installation

### Option 1: Local Development Installation

1. Clone or download this extension
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and install locally:
   ```bash
   npm run local-install
   ```
4. Restart Lichtblick

### Option 2: Package Installation

1. Build the extension package:
   ```bash
   npm run package
   ```
2. In Lichtblick, go to Extensions and install the generated `.foxe` file

## 📖 Usage

1. Open Lichtblick
2. Add a new panel
3. Select "mcap-indexing" from the panel types
4. Use the file input to select MCAP files
5. View selected files and their information

## 🛠️ Development

### Current Implementation

This is a **demonstration version** that provides:

- File selection interface
- File information display
- Basic UI integration with Lichtblick

### Future Enhancements

For a production-ready version, the following features could be added:

- **Web Worker Processing**: Background MCAP file processing
- **Progress Tracking**: Real-time progress bars and status updates
- **Download Feature**: Download indexed MCAP files
- **Error Handling**: Comprehensive error reporting
- **Batch Processing**: Process multiple files simultaneously
- **Memory Optimization**: Handle large files efficiently

### Development Commands

```bash
# Build extension
npm run build

# Build in watch mode
npm run build:watch

# Install locally for testing
npm run local-install

# Create package for distribution
npm run package

# Lint code
npm run lint
```

## 🏗️ Architecture

```
src/
├── index.ts          # Extension entry point and panel registration
└── ...               # Additional implementation files (future)
```

### Extension Registration

The extension registers a panel using the Lichtblick Extension API:

```typescript
extensionContext.registerPanel({
  name: "mcap-indexing",
  initPanel: (context) => {
    // Panel initialization and HTML rendering
  },
});
```

## 📋 Requirements

- **Lichtblick**: Version 1.19.0 or higher
- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher

## 🔧 Technical Details

### Panel Implementation

The current implementation uses direct DOM manipulation for simplicity:

- HTML content is generated dynamically
- Event listeners handle file selection
- Styling matches Lichtblick's dark theme

### File Processing (Future)

For the full implementation, the architecture would include:

1. **Main Thread**: UI and user interaction
2. **Web Worker**: MCAP file processing using `@mcap/core`
3. **IndexedDB**: Temporary storage for processed files
4. **Download API**: File download functionality

## 📄 License

MPL-2.0 License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Lichtblick
5. Submit a pull request

## 📚 Related Documentation

- [Lichtblick Extension Development Guide](https://github.com/lichtblick-suite/lichtblick)
- [MCAP File Format Specification](https://mcap.dev/)
- [Extension API Reference](https://suite.lichtblick.org/docs/extensions/)

---

**Note**: This is a demonstration implementation. For production use, additional development is needed to implement the full MCAP indexing functionality with Web Workers and file processing capabilities.
