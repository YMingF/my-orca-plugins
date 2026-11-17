# Orca Raw Markdown 源码恢复

恢复时间：2026-11-16。2026-11-17 已将 Orca 的 Raw + Copy 编辑器切换到本目录中的 `orca-raw-markdown-rich-dev`，该目录同时用于源码开发与实际运行。原 `/Users/alex/Orca 插件/orca-raw-markdown` 和 `reference-runtime/` 已按用户要求删除。

## 文件位置

- `orca-raw-markdown-rich-dev/editor/app.ts`：编辑器界面、Raw / Rich 切换、工具栏、复制和清空操作。
- `orca-raw-markdown-rich-dev/editor/style.css`：界面样式。
- `orca-raw-markdown-rich-dev/editor/rich/`：富文本核心、Markdown 原文保留逻辑和上游源码。
- `orca-raw-markdown-rich-dev/editor/code-view.ts`：代码块控件。
- `orca-raw-markdown-rich-dev/editor/search.ts`：查找和替换。
- `orca-rich-markdown-build/`：固定版本依赖、构建脚本和测试。
- `verification.json`：删除旧运行文件之前保存的历史对照验证结果。
- `recovery-patch-audit.json`：73 个历史文件补丁的重放结果，全部成功。

## 恢复依据与限制

1. 从本机开发对话记录提取原始文件创建及修改补丁，按时间顺序重放，未执行记录中的历史 shell 命令。
2. 初始 scaffold 中的 `copy.ts`、`sync.ts`、同步测试等文件取自 `YMingF/my-orca-plugins` 的已有公开源码。
3. 富文本上游源码取自 `stablyai/orca` 提交 `73b3f872ed2397bf7a53da343b509eab2b3eed18`，之后应用原有本地修改。
4. 依赖 lockfile 来自删除前的本机临时快照，并按当时已完成的变更移除 mathematics、KaTeX 和 Mermaid 共 114 个依赖条目。
5. 最后一次复制/清空按钮改动只存在于压缩后的运行文件中；本次将相同 DOM、事件逻辑及 CSS 同步回 TypeScript。该部分是根据现有产物恢复的可维护实现，不能声称找到了当时未存在的原始 TypeScript。
6. 修正恢复的构建脚本中原有的许可证生成问题：跳过不含包名的嵌套 package.json，并直接包含 Orca MIT 许可证。

这是一份可以重新构建和继续维护的源码恢复项目；原 Git 历史没有恢复。JavaScript 构建结果与现有产物不是逐字节一致。富文本核心忽略标识符名称后的语法结构一致，CSS 逐字节一致；这些检查和 JSDOM 对照测试不构成全部语义或真实浏览器行为等价的证明。

## 构建与验证

```bash
cd '/Users/alex/Orca 插件/orca-rich-markdown-build'
npm ci --ignore-scripts
orca plugin types ../orca-raw-markdown-rich-dev --json
npm run typecheck
npm test
npm run build
orca plugin test ../orca-raw-markdown-rich-dev --json
orca plugin check ../orca-raw-markdown-rich-dev --json
```

构建文件生成在 `orca-raw-markdown-rich-dev/editor/dist/`，此处现在就是 Orca 实际加载的运行文件。构建会更新当前注册插件的文件。`.orca/types/` 是由已安装 Orca 生成的类型声明；如需刷新：

```bash
orca plugin types ../orca-raw-markdown-rich-dev --json
```

恢复时的验证包括 14 项富文本测试、4 项文档同步测试，以及旧运行版本/恢复版本的复制、未保存内容复制、Raw 清空、Rich 清空、模式切换和只读保护对照。`verify-recovery.mjs` 是当时的历史对照脚本，依赖已删除的旧运行目录，不再属于日常验证命令。

2026-11-17 切换时已通过 Orca 插件静态检查，并在真实 Orca 自定义编辑器中打开 `rich-demo.md`：文档正常渲染、复制/清空图标显示正常、加载无报错。此次未重新执行全部交互测试，未 stage、commit 或 push。

2026-11-17 已移除 `源码恢复-20261116` 中间层级，源码、构建工具及本说明和恢复记录已移至 `/Users/alex/Orca 插件/`。Orca 实际加载路径为 `/Users/alex/Orca 插件/orca-raw-markdown-rich-dev`。
