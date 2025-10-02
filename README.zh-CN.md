# Git Code Author

VS Code 扩展：在编辑器左侧行号区域显示每行对应的 Git 提交作者、时间与摘要，体验类似 JetBrains 系列 IDE 的 "Annotate with Git Blame" 功能。

> [English README](./README.md)

## 功能特性

- 在编辑器左侧显示每行代码的 Git 提交信息
- 自动根据系统语言切换中英文界面
- 简洁的显示样式，不影响代码阅读
- 鼠标悬停可查看详细的提交信息
- 支持快速切换开启/关闭状态

## 示例截图

![使用示例](./screenshot.gif)

## 安装方法

在 VS Code 插件市场搜索 **Git Code Author** 并安装即可。

或者访问 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hlgmyl.git-code-author) 下载安装。

## 使用方法

1. 打开任意 Git 管理的代码文件
2. 在编辑器行号区域右键，点击 **"展示git提交信息"** 开启功能
3. 再次点击可关闭该功能（菜单项带有 ✓ 表示已启用）
4. 也可以通过命令面板（`Ctrl/Cmd+Shift+P`）搜索 "Git Code Author" 来切换

## 功能说明

- 开启后，每一行左侧会显示：
  - 提交日期（格式：YYYY/MM/DD）
  - 提交作者
  - 提交摘要（精简显示）
- 鼠标悬停在任意行上，可查看完整的提交信息：
  - 作者姓名和邮箱
  - 完整的提交时间
  - 提交哈希值
  - 完整的提交摘要
- 关闭文件时会自动取消该文件的注解，重新打开需要再次启用

## 系统要求

- VS Code 版本 >= 1.84.0
- 项目需要使用 Git 进行版本管理
- 确保系统已安装 Git 命令行工具

## 开源许可

MIT License

## 问题反馈

如有问题或建议，请访问 [GitHub 仓库](https://github.com/dev4java/git-code-author) 提交 Issue。
