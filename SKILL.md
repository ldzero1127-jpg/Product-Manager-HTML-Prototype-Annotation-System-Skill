---
name: prototype-annotator
description: |
  通用HTML原型标注技能。当用户说"给这个原型加标注"、"标注这个原型"、
  "给原型添加标注"时触发。自动分析HTML原型文件（可选结合PRD需求文档），
  生成业务标注并注入标注系统UI（工具栏+标记点+详情卡片+右侧面板）。
  支持查看/编辑/新增三种模式，标注数据支持localStorage持久化。
  核心能力：HTML结构分析、需求文档发现与降级、标注内容生成、原型备份、
  标注系统注入。
agent_created: true
---

# HTML 原型标注工具 (Prototype Annotator)

## 概述

将任何HTML原型文件注入一套完整的标注系统，让产品经理和设计师可以为原型中的每个元素
添加业务注释、计算规则和交互说明。开发人员和测试人员可以直接在原型上阅读标注内容，
无需翻阅需求文档（PRD）。

支持任意HTML原型（自动检测页面结构），提供撤销/重做、标注数据导出/导入等功能。

## 触发条件

当用户说以下短语时激活此技能：
- "给这个原型加标注"
- "标注这个原型"
- "给原型添加标注"
- "对原型进行标注"
- "annotate this prototype"

## 核心工作流程

### 步骤0：确认目标

确定要标注的HTML原型文件路径。如果用户未指定，扫描当前工作目录下的 `.html` 文件并让用户选择。

### 步骤1：文档发现（降级策略）

```
扫描同目录下的文档文件：
├── 自动扫描规则：标题含"需求/PRD/需求文档/字段说明"关键词的 .md/.docx/.pdf 文件
├── 找到了 → 进入「完整标注模式」（标注包含业务规则、计算公式、PRD引用）
└── 没找到 → 询问用户："你有需求文档吗？"
    ├── 用户提供路径 → 进入「完整标注模式」
    └── 用户无法提供 → 进入「纯原型分析模式」（从HTML结构推断功能用途）
```

### 步骤2：分析HTML结构

分析维度：
- **页面级别**：识别tab切换、页面区域、路由视图
- **组件级别**：统计卡片、数据表格、图表、筛选器
- **元素级别**：按钮、输入框、下拉框、链接、标签

**标注粒度：元素级别。** 每条标注对应一个具体的页面元素。

### 步骤3：生成标注内容

按 `references/annotation-spec.md` 中的格式规范生成标注数组。

每条标注包含：
- `selector`：CSS选择器或 `[data-anno-el-id="xxx"]`
- `summary`：1-2句话说明用途
- `detail`：业务规则、状态枚举、计算公式等（有PRD时从PRD提取）

**内容优先级**：
```
PRD原文 > 统计字段说明文档 > HTML结构推断 > 模板化通用描述
```

### 步骤4：备份原文件

执行 `scripts/backup.js`：
```
xxx.html → xxx.html.bak
```

### 步骤5：注入标注系统

执行 `scripts/inject.js`：

1. 读取目标HTML原型文件
2. 在 `</head>` 前注入 `<style>` 标签（内容来自 `assets/templates/styles.css`）
3. 在 `</body>` 前注入标注HTML框架（工具栏+面板+卡片）
4. 在 `</body>` 前注入 `<script>` 标签（内容来自 `assets/templates/framework.js`）
5. 注入 ANNOTATIONS 数据数组

### 步骤6：生成配套文档

生成 `标注文档.md`，包含所有标注的：
- 页面分组索引
- 每条标注的selector、摘要、详细说明、参考章节

## 模式说明

| 模式 | 光标 | 点击标记点 | 点击空白处 |
|------|------|-----------|-----------|
| **查看** | 默认 | 弹出详情卡片（只读） | 关闭卡片 |
| **编辑** | 默认 | 弹出详情卡片（可编辑） | 关闭卡片 |
| **新增** | 十字 ✚ | — | 放置新标记 → 自动进入编辑 |

## 键盘快捷键

| 按键 | 行为 |
|------|------|
| `Ctrl+Z` / `Cmd+Z` | 撤销 |
| `Ctrl+Y` / `Cmd+Shift+Z` | 重做 |
| `ESC` | 退出新增模式 / 关闭详情卡片 |

## 数据管理

- **导出**：点击工具栏「导出」按钮，下载全部标注为 JSON 文件
- **导入**：点击工具栏「导入」按钮，选择 JSON 文件合并导入标注数据
- **撤销/重做**：支持最多 30 步操作回退，也可通过工具栏按钮触发

## 资源文件

### 模板文件（assets/templates/）
- `styles.css`：可注入的标注系统CSS样式
- `framework.js`：可注入的标注系统JS框架
- `toolbar.html`：工具栏HTML片段
- `panel.html`：右侧面板HTML片段
- `card.html`：详情卡片HTML片段

### 参考文件（references/）
- `annotation-spec.md`：标注条目格式规范
- `ui-design-spec.md`：标注系统UI设计规范

### 工具脚本（scripts/）
- `backup.js`：备份目标HTML文件
- `inject.js`：将标注系统注入目标HTML

## 实时标注场景

当产品经理在生成HTML原型时调用此技能：
- **串联模式**：技能不自动介入生成过程，需产品经理手动调用
- 产品经理生成一段HTML后，说"给这个原型加标注"
- 技能分析当前HTML，识别可标注元素，生成标注内容
- 注入标注系统，产出可交互的标注原型

## 注入命令

```bash
# 备份
node scripts/backup.js <目标HTML文件>

# 注入（必须提供标注数据文件）
node scripts/inject.js <目标HTML文件> <skill目录> <annotations-js文件>
```

**重要**：`inject.js` 的第三个参数（标注数据文件）不可省略，否则预生成的标注不会被注入。

## 实现要点（防止已知 bug）

### 标记点定位

- 标记点必须放在 **body 级别的独立容器**中，不能作为目标元素的子元素
- 原因：目标元素的祖先可能有 `overflow: hidden`，会裁剪子元素
- 使用 `position: absolute` + `getBoundingClientRect()` + `window.pageYOffset/pageXOffset` 计算位置
- 不能用 `position: fixed`：当祖先有 CSS `transform` 时，`fixed` 定位会失效（transform 创建新的包含块）
- 滚动/resize 时必须重新计算标记点位置

### 新增模式

- `toggleAddMode()` **不能调用 `setMode()`**，因为 `setMode()` 开头就调用 `exitAddMode()`，会立刻关闭新增模式
- 必须手动设置 `currentMode`、更新按钮状态和模式文字
- 点击监听必须绑定在 **`window`** 上（不是 `document`），使用 capture 阶段，确保在宿主页面的监听器之前触发
- 新增模式下必须调用 `e.stopPropagation()` + `e.preventDefault()` 阻止宿主页面的导航逻辑
- 十字光标必须通过 **CSS 类 + `!important`** 实现（`body.anno-add-mode-active *`），不能用 `document.body.style.cursor`（会被子元素的 cursor 样式覆盖）
- CSS `:not()` 中**不能使用后代选择器**（如 `:not(.foo *)`），这是 CSS3 非法语法，会导致整条规则被浏览器丢弃

### 页面检测

- `detectCurrentPage()` 使用多级启发式检测，不硬编码任何 DOM 元素 ID
- 检测顺序：Hash 路由 → ARIA tabpanel → Bootstrap tab class → 可见 section → Body class → 默认
- 当返回 `'default'` 时跳过页面过滤，确保所有标注都显示

## 注意事项

- 注入前必须先备份（backup.js）
- styles.css 使用 `--anno-*` 命名空间前缀，避免与宿主页面CSS冲突
- JS框架使用 `AnnoNS` 全局命名空间，避免变量冲突
- 标注数据格式：`{ selector, summary, detail, date, color }`
- 自定义标注保存到 localStorage，键名为 `anno_custom_data`
