# Git Code Author

A VS Code extension that annotates the left editor gutter with the Git author, date, and summary for each line—similar to the "Annotate with Git Blame" feature in JetBrains IDEs.

> [中文版说明](./README.zh-CN.md)

## Features

- Display Git commit information for each line in the editor gutter
- Automatically switches between Chinese and English based on system locale
- Compact display style that doesn't interfere with code reading
- Hover to view detailed commit information
- Quick toggle on/off functionality

## Demo

![Demo Screenshot](./screenshot.gif)

## Installation

Search for **Git Code Author** in the VS Code Extensions Marketplace and install it.

Or visit [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hlgmyl.git-code-author) to download and install.

## Usage

1. Open any file in a Git-managed project
2. Right-click in the editor gutter area and select **"Annotate with Git Code Author"** to enable
3. Click again to disable (a ✓ indicates the feature is enabled)
4. You can also use the Command Palette (`Ctrl/Cmd+Shift+P`) and search for "Git Code Author" to toggle

## Features in Detail

- When enabled, each line shows:
  - Commit date (format: YYYY/MM/DD)
  - Author name
  - Commit summary (truncated for display)
- Hover over any line to see complete commit details:
  - Author name and email
  - Full commit timestamp
  - Commit hash
  - Full commit summary
- Annotations are automatically cleared when a file is closed; re-enable when reopening

## Requirements

- VS Code version >= 1.84.0
- Project must be managed by Git
- Git command-line tool must be installed

## License

MIT License

## Feedback

For issues or suggestions, please visit the [GitHub repository](https://github.com/dev4java/git-code-author) and submit an issue.
