# 标注系统UI设计规范

## 色彩系统

```css
--anno-primary:      #3B82F6;   /* 蓝色——主色调 */
--anno-primary-hover:#2563EB;   /* 蓝色悬停 */
--anno-primary-light: #DBEAFE;  /* 蓝色浅底 */
--anno-warning:      #F59E0B;   /* 橙色——警告/次要 */
--anno-danger:       #EF4444;   /* 红色——危险/删除 */
--anno-success:      #8B5CF6;   /* 紫色——成功/特殊 */
--anno-bg:           #F9FAFB;   /* 背景灰 */
--anno-card-bg:      #FFFFFF;   /* 卡片白 */
--anno-text-primary: #111827;   /* 主文字 */
--anno-text-secondary:#6B7280;  /* 次文字 */
--anno-border:       #E5E7EB;   /* 边框 */
--anno-shadow-sm:    0 1px 2px 0 rgba(0,0,0,0.05);
--anno-shadow-md:    0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
--anno-shadow-lg:    0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
--anno-transition:   0.3s ease;
```

**注意**：所有CSS变量以 `--anno-*` 为前缀，避免与宿主页面的CSS变量冲突。

## 组件规范

### 1. 标记点 (Marker)

- **尺寸**：26px × 26px 圆形
- **颜色**：四种（blue/orange/red/purple），按序号循环
- **内容**：白色数字（font-size: 13px, font-weight: 600）
- **位置**：目标元素的子元素，`position: absolute; top: -13px; right: -13px`
- **动效**：hover → `transform: scale(1.15); transition: 0.2s ease`
- **z-index**：100

### 2. 工具栏组合 (Toolbar Combo)

- **位置**：固定左下角，`left: 24px; bottom: 24px; z-index: 10000`
- **开关按钮**：56px 圆角方形（border-radius: 16px），蓝色背景，白色SVG图标，展开时旋转180°
- **工具栏容器**：水平排列，白色背景，border-radius: 12px，阴影，卡片式
- **状态指示器**：蓝色药丸形（border-radius: 8px），浅蓝底 + 脉动圆点动画
- **模式按钮**：图标 + 文字标签（11px），hover/active时变蓝色
- **收起态**：`opacity: 0; transform: translateX(-20px); pointer-events: none`

### 3. 右侧面板 (Floating Panel)

- **位置**：`right: 24px; top: 24px; z-index: 10000`
- **宽度**：340px，最大高度 `calc(100vh - 48px)`
- **动画**：`transform: translateX(400px)` → `translateX(0)`，配合opacity
- **结构**：头部（标题+关闭按钮）+ 滚动内容区
- **列表项**：数字色块（26px，border-radius: 6px）+ 标题 + 类型标签 + 日期

### 4. 详情卡片 (Annotation Card)

- **位置**：固定定位，贴近标记点或点击位置
- **宽度**：360px
- **动画**：`scale(0.9)` → `scale(1.0)` + opacity淡入
- **智能定位**：检测屏幕边界，自动调整到可见区域
- **查看模式**：类型标签（药丸形）+ 内容文字 + 元信息区（时间+编辑按钮）
- **编辑模式**：标题输入框 + 类型下拉 + 内容文本域 + 保存/删除/取消按钮

### 5. 新增模式提示 (Add Mode Tip)

- **位置**：顶部居中，`top: 20px; left: 50%; transform: translateX(-50%)`
- **样式**：蓝色背景，白色文字，padding: 12px 24px, border-radius: 8px
- **动画**：`fadeIn` 从上方滑入
- **内容**：`点击原型任意位置添加标注，按ESC或点击"新增"按钮退出`

## 交互规范

### 查看模式（默认）

| 操作 | 行为 |
|------|------|
| 点击标记点 | 弹出详情卡片（只读），显示标注内容 |
| 点击列表项 | 定位到对应标记点并弹出卡片 |
| 点击空白处 | 关闭详情卡片 |
| 点击面板按钮 | 打开/关闭右侧标注列表面板 |

### 编辑模式

| 操作 | 行为 |
|------|------|
| 点击标记点 | 弹出详情卡片（编辑模式），可修改标题/类型/内容 |
| 点击保存 | 更新标注数据并切换到查看模式 |
| 点击取消 | 放弃修改并切换到查看模式 |
| 点击删除 | 二次确认后删除标注 |

### 新增模式

| 操作 | 行为 |
|------|------|
| 进入新增模式 | 光标变为十字，顶部显示提示条 |
| 点击页面元素 | 为该元素创建新标注，自动进入编辑模式 |
| 按ESC | 退出新增模式 |
| 再次点击新增按钮 | 退出新增模式 |

### 键盘快捷键

| 按键 | 行为 |
|------|------|
| ESC | 退出新增模式 / 关闭详情卡片 |
| Ctrl+Z / Cmd+Z | 撤销 |
| Ctrl+Y / Cmd+Shift+Z | 重做 |

### 工具栏按钮

工具栏包含以下按钮（从左到右）：

| 按钮 | 功能 |
|------|------|
| 查看 | 切换到查看模式（默认） |
| 编辑 | 切换到编辑模式 |
| 面板 | 打开/关闭右侧标注列表面板 |
| 新增 | 进入新增模式，点击页面放置新标注 |
| 保存 | 保存自定义标注到 localStorage |
| 撤销 | 撤销上一步操作 |
| 重做 | 重做已撤销的操作 |
| 导出 | 导出全部标注为 JSON 文件 |
| 导入 | 从 JSON 文件导入标注数据 |

### 数据导出/导入

- **导出格式**：标准 JSON 数组，文件名 `annotations-YYYY-MM-DD.json`
- **导入校验**：每条标注必须包含 `selector`（string）和 `summary`（string）字段
- **导入行为**：导入的数据合并到自定义标注中，不会覆盖已有标注
