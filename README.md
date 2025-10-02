# Git Code Author

VS Code extension that annotates the left editor gutter with the Git author, date, and summary for each line—similar to the “Annotate with Git Blame” feature in JetBrains IDEs.

## Getting Started

1. Install dependencies inside VS Code (or Cursor’s VS Code debugger): `npm install`.
2. Build the extension output with `npm run compile` (generates `out/extension.js`).
3. Launch the extension in debug mode via the VS Code `Run Extension` configuration, or package it with `vsce package`.
4. Right-click the editor gutter and choose “Annotate with Git Code Author” to toggle the annotations. A ✓ indicates the feature is enabled. You can also use the command palette entry `Git Code Author: Annotate with Git Code Author`.
5. Closing a file (e.g., with `Ctrl/Cmd+W`) automatically clears its annotations; reopen the file and enable the command again when needed.

The UI automatically switches between Chinese and English messaging based on the current locale and keeps the gutter layout compact so code content isn’t shifted.

While active, each line shows a concise commit date, author, and summary, with the full details available on hover.

> [中文版说明](./README.zh-CN.md)
