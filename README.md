# Raw Markdown Copy

一个 Orca 的 Markdown 自定义编辑器，提供原文和富文本两种编辑模式，以及一键复制或清空全文。

## 功能

- **Raw 原文编辑**：直接编辑 Markdown 源码。长行会随编辑区宽度自动换行显示，不会向原文插入换行符。
- **富文本编辑**：直接编辑渲染后的内容，支持标题、文本样式、列表、任务列表、引用、代码块、链接、表格、折叠块、目录和查找替换。输入 `/` 可打开块菜单。
- **复制全部**：复制当前完整 Markdown，包括尚未保存的编辑；只读文件也可以复制。
- **清空全部**：清空当前文件内容，保存后写入文件；只读文件不能清空。
- 两种模式均可使用复制和清空按钮，操作成功后的提示会在两秒后消失。

## 使用

需要 Orca 1.4.248 或更新版本。在 Orca 中打开 `.md`、`.markdown`、`.mdown`、`.mkd` 或 `.mkdn` 文件，然后在编辑器视图选择器中选择 **Raw + Copy**。

| 功能 | Mac 快捷键 |
| --- | --- |
| 复制全部 Markdown | `⌘ ⇧ C` |
| 清空全部内容 | `⌘ ⇧ X` |

快捷键在插件编辑器内生效，查找输入框和编辑弹窗除外。复制不会保存文件；清空和其他编辑需要使用 Orca 的保存操作写入文件。

## 本地加载

在仓库根目录执行：

```bash
orca plugin dev load ./orca-raw-markdown-rich-dev --json
```

首次加载需要按 Orca 的提示批准插件。开发插件从此目录加载，请保留该目录及其 `editor/dist/` 运行文件。

## 使用范围

- 模式切换时会使用最新编辑内容；没有编辑时切换模式会保留原始内容。Raw 中实际编辑文本时，换行符会统一为 LF。
- 插件运行在隔离环境中，不能加载文档相对路径或外部 URL 的图片；内嵌 `data:image` 图片可以显示，图片 Markdown 源码会保留。
- 公式标记作为普通文本处理，Mermaid 代码块作为普通代码块显示，不渲染公式或图表。
- 未支持的 HTML 和语法可在 Raw 模式中编辑。插件不提供 Orca 的 Agent、review note 或工作区导航集成。

## 开发与验证

插件源码和运行文件位于 `orca-raw-markdown-rich-dev/`，构建工具与测试位于 `orca-rich-markdown-build/`。从仓库根目录执行：

```bash
cd orca-rich-markdown-build
npm ci --ignore-scripts
orca plugin types ../orca-raw-markdown-rich-dev --json
npm run typecheck
npm test
npm run build
orca plugin test ../orca-raw-markdown-rich-dev --json
orca plugin check ../orca-raw-markdown-rich-dev --json
```

构建会更新插件目录中的 `editor/dist/`。更多实现说明见 [插件 README](orca-raw-markdown-rich-dev/README.md)，第三方许可证见 [THIRD_PARTY_NOTICES.md](orca-raw-markdown-rich-dev/THIRD_PARTY_NOTICES.md)。
