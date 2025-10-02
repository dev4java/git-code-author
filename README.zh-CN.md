# Git Code Author

VS Code 扩展：在编辑器左侧注释区域显示每行对应的 Git 提交作者、时间与摘要，体验类似 JetBrains 系列 IDE 的 “Annotate with Git Blame”。

## 使用方法

1. 在 VS Code（或 Cursor 的 VS Code 调试器）中安装依赖：`npm install`。
2. 执行 `npm run compile` 生成 `out/extension.js`。
3. 通过 VS Code 调试面板运行 “Run Extension” 启动调试，或使用 `vsce package` 打包安装。
4. 在编辑器行号/注释区域右键，点击 “Annotate with Git Code Author” 可开启/关闭作者信息；带有 ✓ 的状态表示已启用。也可以在命令面板运行 “Git Code Author: Annotate with Git Code Author” 进行切换。
5. 关闭文件（如 `Ctrl/Cmd+W`）会自动取消对该文件的注解，下次重新打开需要再次启用。

界面会根据系统语言自动切换中英文提示，并尽量以紧凑样式展示作者信息，避免挤压代码内容。

开启后，每一行左侧会显示提交日期、作者及提交摘要的缩略信息，鼠标悬停可查看更详细的提交信息。

> [English README](./README.md)
