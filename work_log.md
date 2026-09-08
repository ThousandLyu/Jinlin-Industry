# 金陵工脉开发日志

## 2026-05-03 (Dev 缓存缺块修复)

### 已完成
- 确认 3000/3001/3002 端口无进程占用，避免误杀 Node/Ollama 进程。
- 校验路径 `F:\Code\Python Code\jinling-archive\.next`，清理损坏的 Next.js 缓存。
- 重启 3001 Dev 服务，验证首页、`/api/search`、`/search` 访问正常。

### 说明
- **根因**：生产构建正常，500 错误源于 `.next/server/webpack-runtime.js` 缺失 `./9276.js`，属本地 Dev 缓存损坏，非业务逻辑错误。
- **处理**：首次清理缓存成功；沙箱内启动因 `spawn EPERM` 失败；移至沙箱外启动成功，未做无效重试。

### 验证
- `http://localhost:3001/` 返回 200。
- `http://localhost:3001/api/search?q=范旭东` 返回 200。
- `http://localhost:3001/search?q=范旭东` 返回 200，无模块缺失报错。

---

## 2026-05-03 (优化轮次 V2)

### 已完成
- **搜索优化**：移除 `includeBrief`，机器搜索优先返回；InfoChain 移至结果下方，使用 `startTransition` 异步挂载。
- **图谱重构**：GraphView 节点改为图标+标签卡，连线增加箭头，低置信度使用虚线，收紧力导向参数。
- **弹窗修复**：`/api/links/chain` 返回全量 `nodeSummaries`，覆盖 Source/Person/Site 节点详情。
- **人物页精简**：删除“关联史料标签云”，普通人物隐藏“人物”徽章。
- **复原页体验**：图片增加骨架屏与淡入，3D 模型增加 Spinner，视口内自动预加载。
- **AI Studio 修复**：前端复用 `parseLooseJsonObject` 循环解析嵌套 JSON，后端 Prompt 严格化并加固 Fallback。

### 说明
- 本轮所有改造均一次通过，未触发失败重试机制。
- 核心瓶颈：搜索首屏受 AI 摘要阻塞；Chain API 仅返回入口节点导致弹窗为空；前端 JSON 解析容错不足。

### 验证
- `npm run doctor` / `lint` / `build` 全部通过（Build 生成 68 页）。
- Dev 环境下搜索页因缓存缺块偶发 500，生产构建正常。

### 修改文件
| 模块 | 文件 | 改动 |
| :--- | :--- | :--- |
| 搜索 | `src/app/search/page.tsx` | 去 AI 摘要，下移图谱 |
| 图谱 | `src/components/shared/GraphView.tsx` | 图标节点、箭头连线 |
| 审核 | `src/app/api/links/chain/route.ts` | 返回全量节点摘要 |
| 人物 | `src/app/people/[id]/page.tsx` | 删除标签云，精简 UI |
| 复原 | `src/app/scenes/[id]/SceneDetailClient.tsx` | 骨架屏与预加载 |
| AI | `src/app/ai-studio/page.tsx` | JSON 解析逻辑修复 |
| AI | `src/lib/aiClient.ts` | Prompt 加固 |

---

## 2026-05-04 (审核/合并/词云)

### 已完成
- **数据层**：`DataService` 新增 `all()` 方法；DELETE API 增加 Sources 级联清理。
- **审核系统**：Source 新增审核字段；导入默认 `pending` 并触发 AI 自动审核；新增审核列表与审批 API；后台页面支持筛选与操作。
- **合并系统**：新增 Merge Service 与 API，支持查找候选、AI 预览合并、执行合并（软删旧记录）。
- **词云系统**：安装 `d3-cloud`；新增词云工具库与 API；新增词云组件与首页集成。
- **兼容性**：修复 Orphans API 参数错误；修复词云 `[object Object]` 脏数据；旧数据默认视为 `approved`。

### 验证
- TypeScript 类型检查：通过（0 Error）。
- ESLint：通过（0 Error）。
- 生产构建：通过（68 pages）。

### 修改与新增文件
**修改文件：**
`src/lib/dataService.ts`, `src/app/api/data/route.ts`, `src/types/index.ts`, `src/lib/sourceImport.ts`, `src/app/api/import/sources/route.ts`, `src/app/admin/sources/page.tsx`, `src/app/api/explore/route.ts`, `src/app/api/graph/route.ts`, `src/app/admin/review/page.tsx`, `src/app/page.tsx`.

**新增文件：**
`src/app/api/admin/orphans/route.ts`, `src/app/api/admin/review/route.ts`, `src/app/api/admin/merge/route.ts`, `src/lib/mergeService.ts`, `src/lib/wordCloudUtils.ts`, `src/lib/wordCloudData.ts`, `src/app/api/wordcloud/route.ts`, `src/components/front/WordCloud.tsx`, `src/components/front/WordCloudDetail.tsx`, `src/components/front/HomeWordCloud.tsx`.


文档文件位于：F:\Code\Python Code\jinling-archive\docs

---

## 2026-05-07

### Completed
- AI 链路讲解、AI 智能回答与工脉文笺正文已改为逐字输出，输出框固定 8 行，搜索页 AI 链路前置到结果上方。
- 工业地图已缩小为桌面端 2/3 宽度，兼容 `siteName` 显示企业名称，并重写下方点位叙述。
- 数字复原详情页已兼容热点 `x/y` 字段并增加 3D 模型加载失败兜底，避免模型异常导致页面崩溃。
- 工脉文笺预热文案已居中并限制行宽，避免主语排布错乱。
- 工脉文笺预热文案已强制单行居中显示；GLB 预览已移除 `@react-three/fiber`/`drei`，改为原生 Three.js 动态加载。
- `F:\桌面\Plan_V12.docx` 已拆开第 2 分节与正文分节的页眉/页脚页面设计引用，正文分节保留页码从 1 开始。
- `F:\桌面\Plan_V12.docx` 打不开问题已处理：恢复原备份后用 UTF-8 字节写入方式重新拆分，并通过 Word 后台打开验证。

### Completed
- 工业地图卡片和 tooltip 标签改为分离显示：名称使用循环色号，地址单独一行以"位于{address}"形式展示，移除 `pointLabel` 组合逻辑和叙事中的重复名称前缀。

### In Progress
- [ ] 首页 AI 问答功能：定位首页问答组件与 `/api/ai` 调用，回滚为使用鼠标滚轮滚动上下文的交互版本并复查可用性。

### Notes
- 文档与日志按 UTF-8 读取/写入，PowerShell 读取需显式使用 `-Encoding UTF8` 避免中文乱码。
- 当前目录无 `.git` 元数据，无法用 `git status` 复查变更；本轮以 TypeScript、lint、build 和关键路由请求复核。
- Dev 服务已启动在 `http://localhost:3001`；复查 `/search?q=永利`、`/ai-studio`、`/map`、`/scenes/scene-002` 均返回 200。
- 复查确认 GLB 文件 `public/uploads/images/1778137131724-wtrh7l.glb` 存在，HTTP 返回 200，Content-Type 为 `model/gltf-binary`。
- `F:\桌面\Plan_V12.docx` 位于工作区外，沙箱内读取被拒绝；处理前需要授权访问该路径。
- `Plan_V12.docx` 处理方式为仅克隆并显式绑定 section#2/section#3 的 header/footer parts；未改正文段落、分页符、图片位置和页面尺寸。
- `Plan_V12.docx` 成功备份为 `F:\桌面\Plan_V12.backup_20260507_170837.docx`，修改后文件大小 8612952 字节，复查仍为 366 段、3 个分节、41 个渲染分页标记、7 个手动分页符。
- 损坏版本已另存为 `F:\桌面\Plan_V12.broken_20260507_1711.docx`；重新修复前备份为 `F:\桌面\Plan_V12.pre_safe_fix_20260507_172935.docx`。
- Word COM 后台验证 `F:\桌面\Plan_V12.docx` 可打开，统计页数 89；分节引用为 section#1 rId9/rId11/rId10/rId12，section#2 rId30/rId32/rId31/rId33，section#3 rId34/rId36/rId35/rId37。

### Project Structure
- entry | `src/app`
- core modules | `src/components`, `src/lib`
- config | `package.json`, `next.config.*`, `tsconfig.json`
- data | `data`, `docs`
- logs | `work_log.md`

---

## 2026-05-12

### Completed
- 数字复原 3D 模型查看器已关闭自动旋转，新增模型下载按钮与重置视角按钮，并优化旋转、缩放、平移控制参数。
- 数字复原 3D 模型查看器已改为黑色背景、灰膜材质、白色高光，模型按自身中心轴低速自转，鼠标进入暂停自转，并屏蔽中键/右键原有操作。
- 数字复原 3D 模型查看器已降低自转速度，恢复右键平移，背景改为深灰蓝舞台并添加地面描线，模型继续按包围盒居中展示。
- 地图前台底图比例已与后台取点比例统一为 16:10，避免点位百分比在前端显示偏移；地图点位经纬度空值与 0,0 已统一显示为“未设定”。
- 顶部导航栏已新增简笔画工厂品牌图标。
- 地图点位悬浮简介框已改为与下方信息卡一致的白底、浅边框样式；浏览器 favicon 已替换为简笔画工厂图标。
- 工脉文笺已移除“对象”选择，风格支持自定义输入；导入史料描述中的英文来源文案已改为中文。
- 史实核验页 A/B/C 级史料标签已按指定 UI 顺序重映射；史料助手已支持点击弹出小搜索框，并跳转到 AI 智能回答搜索页。
- 人物头像上传后不显示问题已定位为前台人物卡片和详情页未渲染 `avatar` 字段；已改为卡片与详情页显示椭圆形头像，轮播区保持原样。
- 史料助手点击小人已取消弹出搜索框，改为直接跳转首页检索入口。
- 搜索页已移除 AI 智能回答侧边栏和独立 deep 搜索按钮；首页与搜索页统一改为单按钮“AI融合搜索”。
- 史料助手点击后已在原信息框内切换为搜索对话框，显示“您好，请问有什么可以帮您的吗？”，发送后提示“正在为您检索，请稍等。”并跳转到 AI融合搜索页自动检索。
- 史料助手已支持重复打开和重复搜索；搜索页会响应 URL 查询参数变化并重新触发 AI融合搜索。
- 搜索检索已清洗“是谁/是什么/请问”等问句词，史料搜索结果已改为跳转前台史料详情页，取消无命中时返回最新史料的兜底。
- 人物搜索已补充 `biography` 字段匹配，避免人物介绍类内容只写入该字段时无法召回。
- AI 链路讲解已增加同查询去重和请求竞态保护，避免开发环境或 URL 状态重复触发时出现讲解先显示、消失、再显示的问题。

### In Progress
- 无

### Notes
- 修改文件：`src/components/shared/ModelViewer.tsx`。
- 3D 查看器继续优先支持 GLB / glTF；OBJ 等不支持格式保留下载入口。
- 复查结果：`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过。
- 批量中文化 `data/sources.json` 后曾因 UTF-8 BOM 被 `dataService` 判定为损坏；已从 `data/backups/corrupted-sources.json-2026-05-12T08-27-56-216Z.bak` 恢复为无 BOM 合法 JSON，复查构建未再触发重置。
- 本轮复查结果：确认 5 个头像 PNG 已落盘且 `people.json` 已写入 `avatar`；`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：未检出 `AI 智能回答`、`mode=deep`、`deepOpen` 等前端残留；`npm run lint` 通过，`npm run build` 通过。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过。
- 本地页面访问验证受 dev server 启动环境限制阻塞：沙箱内 `npm.cmd run dev -- -p 3001` 报 `spawn EPERM`；沙箱外启动未留下可访问的 3001 服务，`/scenes/scene-002` 请求超时。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过；`normalizeSearchTerms('范旭东是谁')` 输出包含“范旭东”；未检出搜索结果跳转 `/admin/sources?highlight=` 的残留。
- 本轮复查结果：`npm run lint` 通过，`npm run build` 通过；`normalizeSearchTerms('范旭东是谁')` 输出仍包含“范旭东”。

---

## 2026-05-07

### Completed
- 思维链路加载文案已改为“信息链分析中（不影响下方搜索结果）…”，与当前搜索结果位于下方的布局一致。

### In Progress
- 无

### Notes
- 思维链路加载文案位于 `src/components/front/InfoChain.tsx`，当前搜索页链路模块已在搜索结果上方。
- 复查结果：未检出“不影响上方”残留；`npm run lint` 通过。

### Project Structure
- entry | `src/app`
- core modules | `src/components`, `src/lib`
- config | `package.json`, `next.config.*`, `tsconfig.json`
- data | `data`, `docs`
- logs | `work_log.md`

---

## 2026-05-07

### Completed
- 地图详情信息已精简为两行：第一行显示点位名称（含“金陵制造局”展示名），第二行显示 `位于{地址}`，并移除顶部重复地址与额外描述。

### In Progress
- 无

### Notes
- 地图详情页改动需优先定位 `/map` 页面和相关地图组件，避免改动搜索/图谱等无关展示。
- 复查结果：`npm run lint` 通过，`npm run build` 通过，`http://localhost:3001/map` 返回 200。

### Project Structure
- entry | `src/app`
- core modules | `src/components`, `src/lib`
- config | `package.json`, `next.config.*`, `tsconfig.json`
- data | `data`, `docs`
- logs | `work_log.md`

---

## 2026-09-09

### Completed
- 完成史料库数据及底层文件排查：定位历史导入产生的 84 对重复史料记录（共 168 个文件）。
- 执行第一阶段软删除：在 `data/media.json` 备份后，将未引用的 84 条无 `-1` 冗余记录标记为 `isDeleted: true`。
- 保证主史料库稳定：`data/sources.json` 维持 84 份独立有效史料，物理磁盘文件与提取缓存均完整保留，避免任何 404 异常。
- 编写硬删除脚本 `scripts/dedup_hard_delete.js`，支持 `--dry-run` 预览与 `--execute` 执行，并带自动打包备份机制。
- 编写自动化校验脚本 `scripts/verify_platform_data.js`，验证数据表无断链、全部 84 份史料物理文件均正常可访问。
- 用户确认平台全功能正常后，执行第二阶段物理硬删除：
  - 自动备份待删文件至 `data/backups/purged-files-2026-09-08T16-58-22-882Z`。
  - 从 `public/uploads/sources/` 物理删除 84 个冗余副本文件，磁盘史料文件恢复为 84 个。
  - 从 `data/source_text/` 物理删除 43 个孤立提取缓存。
  - 从 `data/media.json` 中物理抹除 84 条软删除记录，现存条目由 189 条降至 105 条。
- 运行完整校验，确认 84 份史料物理文件全部存在，业务关联 0 断链，Web 平台正常服务。

### Completed (续)
- 修复 Vercel 云端部署依赖冲突：
  - 根因：`package.json` 中遗留了此前已重构未使用的 `@react-three/drei` 和 `@react-three/fiber`，导致云端 `npm install` 触发严格 peerDependencies 依赖解析错误 (`ERESOLVE`)。
  - 处理：清理移除上述未引用的冗余依赖包，并配置 `.npmrc` (`legacy-peer-deps=true`)。
  - 推送最新提交至 GitHub `main` 分支，触发 Vercel 自动重构。



