# Prototype Annotator

> **通用 HTML 原型标注技能** — 一键为静态 HTML 原型注入交互式业务标注系统

[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://docs.anthropic.com/en/docs/claude-code)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)]()

---

## 它是什么？

Prototype Annotator 是一个 **Claude Code 技能**，能将任意静态 HTML 原型文件变成一个带标注的交互式原型——无需构建工具、无需 npm 依赖、无需修改原始代码逻辑。

注入后，产品经理、设计师、开发和测试人员可以直接在原型 UI 上 **查看、编辑、新增** 业务标注，告别在 PRD 文档和原型之间反复对照的低效体验。

### 效果预览

```
┌──────────────────────────────────────────────────────────────┐
│                        HTML 原型页面                          │
│                                                              │
│   ┌─────────┐                                                │
│   │ 表单区域  │   ①  ← 蓝色标记点（悬浮显示详情卡片）           │
│   │  姓名___ │                                                │
│   │  年龄___ │   ②  ← 橙色标记点                              │
│   └─────────┘                                                │
│                                                              │
│   ┌─────────┐        ┌──────────────────────────┐            │
│   │ 按钮区域  │   ③   │  标注详情卡片              │            │
│   │ [提交]   │        │  ─────────────────────── │            │
│   └─────────┘        │  摘要：提交按钮...         │            │
│                      │  • 校验规则：必填项...      │            │
│                      │  • 防抖：1秒内不可重复...   │            │
│                      │  参考：PRD 3.2.1           │            │
│                      └──────────────────────────┘            │
│                                                              │
│  ┌── 工具栏 ──┐                                              │
│  │ 查看│编辑│新增│面板│保存│↶↷│⇅│  ← 底部浮动工具栏           │
│  └───────────┘                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 核心特性

| 特性 | 说明 |
|------|------|
| **零依赖注入** | 纯 Node.js 脚本 + 原生 JS/CSS，不引入任何外部库 |
| **三种交互模式** | 查看（只读卡片）、编辑（可修改内容）、新增（十字准星点击定位） |
| **智能标注生成** | 结合 PRD 需求文档自动提取业务规则，无 PRD 时从 HTML 结构推断 |
| **命名空间隔离** | CSS 变量 `--anno-*`、类名 `.anno-*`、JS 命名空间 `AnnoNS`，零冲突 |
| **幂等注入** | 重复注入自动清除旧版本，安全可重复执行 |
| **30 步撤销/重做** | 完整的 Undo/Redo 栈，支持 `Ctrl+Z` / `Ctrl+Y` |
| **导出/导入** | JSON 格式导出全部标注，支持跨文件共享 |
| **页面自动检测** | MutationObserver 监听 DOM 变化，Tab 切换时自动重新定位标记点 |
| **localStorage 持久化** | 用户新增/编辑的标注自动保存到浏览器本地存储 |
| **A4 打印友好** | 标注系统在 `@media print` 下自动隐藏 |

---

## 快速开始

### 前置条件

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)（最新版）
- Node.js 14+（仅注入脚本使用）
- 任意现代浏览器（Chrome / Firefox / Edge / Safari）

### 安装

将技能目录复制到 Claude Code 的技能目录中：

```bash
# 复制到用户级技能目录
cp -r prototype-annotator/ ~/.claude/skills/prototype-annotator/
```

### 使用

在 Claude Code 中，对任意包含 HTML 原型的项目目录说：

```
给这个原型加标注
```

或者更具体地：

```
标注这个原型，结合 PRD 需求文档生成业务标注
```

Claude 会自动执行完整的 6 步标注流程（见下文）。

---

## 工作流程

```
 ┌─────────────┐
 │ Step 0      │  确认目标 HTML 文件
 │ 定位目标     │  扫描当前目录，找到 .html 原型文件
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 1      │  文档发现与降级
 │ 发现 PRD    │  扫描 PRD/需求文档 → 找到则进入"完整标注模式"
 │             │  未找到则降级为"纯原型分析模式"
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 2      │  分析 HTML 结构
 │ 分析原型     │  三级分析：页面级 → 组件级 → 元素级
 │             │  提取选择器、交互行为、状态切换逻辑
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 3      │  生成标注数据
 │ 生成标注     │  构建 ANNOTATIONS[] 数组
 │             │  内容优先级：PRD原文 > 字段说明 > HTML推断 > 通用描述
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 4      │  备份原始文件
 │ 备份原型     │  生成 .html.bak（已有备份则追加时间戳）
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 5      │  注入标注系统
 │ 注入系统     │  CSS → </head> 前
 │             │  数据 + HTML框架 + JS → </body> 前
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ Step 6      │  生成标注文档
 │ 生成文档     │  输出 标注文档.md（含详细说明和 PRD 引用）
 └─────────────┘
```

### 注入命令（手动执行）

如果需要手动执行注入（不通过 Claude），可以直接运行 Node.js 脚本：

```bash
# 备份
node scripts/backup.js path/to/prototype.html

# 注入（含预生成标注）
node scripts/inject.js path/to/prototype.html /path/to/skill-dir annotations.js

# 注入（仅框架，不含预生成标注）
node scripts/inject.js path/to/prototype.html /path/to/skill-dir
```

---

## 项目结构

```
prototype-annotator/
├── SKILL.md                        # 技能定义文件（Claude Code 入口）
├── README.md                       # 本文件
├── LICENSE
│
├── assets/
│   └── templates/                  # 注入模板（CSS + HTML + JS）
│       ├── styles.css              # 标注系统样式（296行）
│       ├── toolbar.html            # 工具栏 HTML 片段
│       ├── panel.html              # 右侧面板 HTML 片段
│       ├── card.html               # 详情卡片 HTML 片段
│       └── framework.js            # 标注系统核心 JS 引擎（783行）
│
├── references/                     # 参考规范文档
│   ├── annotation-spec.md          # 标注数据结构规范
│   └── ui-design-spec.md           # UI 视觉设计规范
│
└── scripts/                        # Node.js 工具脚本
    ├── backup.js                   # 原型备份脚本
    └── inject.js                   # 标注注入脚本
```

---

## 标注数据格式

每条标注是一个 JSON 对象：

```javascript
{
  selector: '#submitBtn',            // CSS 选择器（必填）
  summary: '提交按钮：校验表单...',    // 摘要描述（必填）
  detail: [                          // 详细业务规则（必填，数组）
    '校验规则：所有必填项不为空',
    '防抖处理：1秒内不可重复点击',
    '提交成功后跳转到列表页'
  ],
  date: '06-02',                     // 标注日期 MM-DD（可选，自动生成）
  color: 'blue'                      // 标记颜色（可选，自动轮转）
}
```

### 颜色轮转

标记颜色按索引自动轮转，确保相邻标记视觉可区分：

| 索引 % 4 | 颜色 | 色值 |
|:--------:|------|------|
| 0 | 🔵 Blue | `#3B82F6` |
| 1 | 🟠 Orange | `#F59E0B` |
| 2 | 🔴 Red | `#EF4444` |
| 3 | 🟣 Purple | `#8B5CF6` |

### 选择器优先级

```
#id  >  .class-name  >  [data-anno-el-id="generated-id"]
```

当目标元素无 `id` 或 `class` 不够唯一时，自动添加 `data-anno-el-id` 属性。

---

## UI 组件

### 标记点（Marker）

- **尺寸**：26×26px 圆形
- **定位**：Body 级绝对定位容器（避免 `overflow:hidden` 裁剪和 `transform` 包含块问题）
- **交互**：悬浮 `scale(1.15)` 放大，点击弹出详情卡片
- **层级**：`z-index: 100`

### 工具栏（Toolbar）

- **位置**：固定左下角 `(24px, 24px)`，`z-index: 10000`
- **可折叠**：56px 圆形切换按钮 + 胶囊状态指示灯（含脉冲动画）
- **9 个功能按钮**：

| 按钮 | 功能 | 快捷键 |
|------|------|--------|
| 👁 查看 | 切换到查看模式 | — |
| ✏️ 编辑 | 切换到编辑模式 | — |
| 📋 面板 | 开关右侧标注列表 | — |
| ➕ 新增 | 进入新增模式（十字准星） | — |
| 💾 保存 | 保存当前标注到 localStorage | `Ctrl+S` |
| ↶ 撤销 | 撤销上一步操作 | `Ctrl+Z` |
| ↷ 重做 | 重做已撤销操作 | `Ctrl+Y` / `Cmd+Shift+Z` |
| ⇩ 导出 | 导出为 JSON 文件 | — |
| ⇧ 导入 | 从 JSON 文件导入 | — |

### 详情卡片（Card）

- **尺寸**：360px 宽，自适应高度
- **动画**：`scale(0.9) → scale(1.0)` 弹出
- **智能定位**：自动检测边界，避免超出视口
- **双模式**：查看模式（只读）/ 编辑模式（可修改摘要和详情）

### 右侧面板（Panel）

- **尺寸**：340px 宽，`max-height: calc(100vh - 48px)`
- **动画**：从右侧滑入 `translateX(400px) → 0`
- **内容**：当前页面所有标注的列表，点击跳转到对应标记

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Cmd+Shift+Z` | 重做 |
| `Ctrl+S` | 保存 |
| `ESC` | 退出新增模式 / 关闭卡片 |
| `Enter` | 确认编辑 |

---

## 公开 API

注入后，可通过 `window.AnnoNS` 访问标注系统的编程接口：

```javascript
// 刷新所有标记点
AnnoNS.refresh();

// 打开/关闭右侧面板
AnnoNS.showPanel();
AnnoNS.hidePanel();

// 获取所有标注数据（预生成 + 用户自定义）
const all = AnnoNS.getAnnotations();

// 导出为 JSON 字符串
const json = AnnoNS.exportJSON();

// 从 JSON 字符串导入自定义标注
AnnoNS.importCustom(jsonString);
```

---

## 架构设计

### 注入原理

```
原始 HTML 文件
     │
     ▼
 ┌─────────────────────────────────────────┐
 │  inject.js（幂等注入引擎）               │
 │                                         │
 │  1. 正则清除旧注入块（注释标记匹配）       │
 │  2. 读取模板文件（CSS/HTML/JS）           │
 │  3. 注入 CSS → </head> 前               │
 │  4. 注入 ANNOTATIONS 数据 → </body> 前   │
 │  5. 注入 HTML 框架 → </body> 前          │
 │  6. 注入 framework.js → </body> 前       │
 └─────────────────────────────────────────┘
     │
     ▼
 带标注的 HTML 文件（单文件，可直接浏览器打开）
```

### 隔离策略

| 层面 | 隔离方式 |
|------|----------|
| **CSS** | 所有变量 `--anno-*`，所有类名 `.anno-*`，不与宿主页面冲突 |
| **JS** | IIFE 包裹，仅暴露 `window.AnnoNS` 一个全局对象 |
| **DOM** | 所有注入元素带 `anno-` 前缀 ID/Class |
| **存储** | localStorage key `anno_custom_data` |

### 关键技术决策

| 决策 | 原因 |
|------|------|
| **Body 级标记容器** | 避免目标元素 `overflow:hidden` 裁剪标记点 |
| **`position:absolute` + `getBoundingClientRect()`** | 避免祖先元素 CSS `transform` 创建新包含块导致 `fixed` 定位失效 |
| **Window 级 capture 监听（新增模式）** | 在宿主页面 click 事件之前拦截，确保新增标记不被页面逻辑干扰 |
| **MutationObserver 页面检测** | 无需框架集成，自动感知 Tab 切换/视图变化并重新定位标记 |
| **JSON 快照撤销栈** | 简单可靠，30 步上限防止内存膨胀 |

### 内容优先级

当生成标注内容时，遵循以下优先级降级策略：

```
PRD 需求文档原文
       ↓ 不可用
统计字段说明文档
       ↓ 不可用
HTML 结构推断（按钮文本/CSS类名/DOM位置）
       ↓ 不够具体
模板化通用描述
```

---

## 兼容性

| 环境 | 支持情况 |
|------|----------|
| Chrome 90+ | ✅ 完全支持 |
| Firefox 90+ | ✅ 完全支持 |
| Safari 15+ | ✅ 完全支持 |
| Edge 90+ | ✅ 完全支持 |
| IE 11 | ❌ 不支持（使用 CSS 变量、ES6 语法） |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发约定

1. **CSS** — 所有新增样式必须使用 `--anno-*` 变量前缀和 `.anno-*` 类名前缀
2. **JS** — 所有代码在 IIFE 内部，仅通过 `window.AnnoNS` 暴露公开接口
3. **模板** — HTML 片段中不使用外部资源引用（图片使用 SVG 内联或 CSS 绘制）
4. **注释** — 注入块使用 `<!-- === Prototype Annotator XXX === -->` 格式注释标记，确保幂等清除

---

## 许可证

[MIT License](./LICENSE)

---

## 致谢

- 标注系统 UI 设计参考了 Figma Comments、InVision 等协作工具的交互模式
- 页面检测算法参考了 Bootstrap Tabs、ARIA tabpanel 等通用 Tab 组件规范
