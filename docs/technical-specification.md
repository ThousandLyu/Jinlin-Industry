# 金陵工脉 — 功能与技术实现方案

> 南京民族工业遗产数字化展示平台 · 技术规格书
> 版本: 1.0 | 日期: 2026-05-04 | 构建页数: 68

---

## 1. 项目概述

### 1.1 项目定位

"金陵工脉"是一个专注于南京民族工业遗产的数字化展示与史料管理平台。系统围绕史料收集、AI 辅助编目、知识图谱构建、公众展示四条主线，提供从史料导入到公众浏览的完整链路。

### 1.2 技术栈

| 层级 | 技术选型 |
|------|---------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript 5.3 (strict mode) |
| 样式 | Tailwind CSS 3.4 + 自定义 CSS 变量 |
| 数据层 | JSON 文件数据库 (15 个集合) |
| AI 引擎 | Ollama 本地模型 (qwen2.5:7b) + Claude 云端 fallback |
| 3D 渲染 | Three.js (@react-three/fiber + @react-three/drei) |
| 可视化 | d3 + d3-cloud (词云), 力导向图 (知识图谱) |
| 文档解析 | mammoth (DOCX), pdf-parse (PDF), xlsx (Excel) |
| 导出 | archiver (ZIP), csv-stringify (CSV) |

### 1.3 部署形态

- 运行环境: Node.js 20+
- 数据持久化: 本地 JSON 文件，无外部数据库依赖
- 文件存储: `public/uploads/` 本地文件系统
- 鉴权: Cookie-based token + Next.js Middleware

---

## 2. 系统架构

### 2.1 分层架构

```
┌──────────────────────────────────────────────┐
│              前端页面层 (68 pages)             │
│  src/app/page.tsx  src/app/admin/*/page.tsx   │
│  src/components/shared/  front/  admin/       │
├──────────────────────────────────────────────┤
│              API 路由层 (30 routes)            │
│  src/app/api/**/route.ts                      │
│  统一鉴权: requireAuth() + Middleware          │
├──────────────────────────────────────────────┤
│             服务库层 (27 libs)                  │
│  DataService | aiClient | aiProvider         │
│  mergeService | sourceImport | wordCloudData  │
├──────────────────────────────────────────────┤
│              数据层 (15 JSON files)            │
│  data/*.json  +  data/source_text/*.txt       │
│  public/uploads/sources/ (168 files)          │
└──────────────────────────────────────────────┘
```

### 2.2 请求数据流

```
用户请求
  → Next.js Middleware (Cookie 鉴权，拦截 /admin/*)
    → API Route Handler
      → requireAuth() 二次鉴权
        → Service 层业务逻辑
          → DataService<T> JSON 文件读写
            → NextResponse JSON
```

### 2.3 AI 调用链

```
前端 fetch('/api/ai', { action: '...' })
  → /api/ai POST handler (switch action)
    → aiClient.chat() / answerWithSources() / ...
      → aiProvider.invokeAI()
        → 本地: invokeOpenAICompatible() (Ollama OpenAI-compatible API)
        → 失败 + allowCloudFallback → invokeClaude() (Anthropic Messages API)
        → 成功 → 返回 { content, provider, model }
    → 结果写入 AiToken 缓存 (aiTokenService.upsertAiToken)
    → 返回 JSON
```

### 2.4 目录结构

```
jinling-archive/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── admin/              # 后台管理 (19 页)
│   │   │   └── layout.tsx      # 后台布局 (含导航)
│   │   ├── api/                # API 路由 (30 个)
│   │   └── [routes]/           # 前台页面路由
│   ├── components/
│   │   ├── shared/             # 通用组件 (20 个)
│   │   ├── front/              # 前台组件 (9 个)
│   │   └── admin/              # 后台组件 (4 个)
│   ├── lib/                    # 服务库 (27 个)
│   ├── types/
│   │   └── index.ts            # 全局类型定义
│   ├── styles/
│   │   └── globals.css         # 全局样式
│   └── middleware.ts           # 路由守卫
├── data/                       # JSON 数据文件 (15 个)
│   ├── sources.json            # 史料 (84 条)
│   ├── people.json             # 人物 (72 条)
│   ├── sites.json              # 遗址
│   ├── facts.json              # 史实
│   ├── timeline.json           # 时间轴 (26 事件)
│   ├── sourceLinks.json        # 史料关联
│   ├── ai_tokens.json          # AI 缓存
│   ├── source_text/            # 提取文本 (86 个 txt)
│   └── backups/                # 备份 ZIP
├── public/uploads/             # 上传文件
├── docs/                       # 项目文档
├── scripts/                    # 工具脚本
├── seed.ts                     # 数据种子脚本
├── work_log.md                 # 开发日志
└── package.json
```

---

## 3. 数据模型

### 3.1 基础字段 (BaseEntity)

所有实体继承以下字段:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 主键 |
| createdAt | string (ISO 8601) | 创建时间 |
| updatedAt | string (ISO 8601) | 更新时间 |
| isDeleted | boolean | 软删除标记 |

### 3.2 核心实体

#### Source (史料) — `data/sources.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 题名 |
| type | 'book'\|'journal'\|'archive'\|'newspaper'\|'website'\|'oral'\|'other' | 史料类型 |
| author | string | 作者/来源 |
| publisher | string | 出版者 |
| publishDate | string | 出版日期 |
| url | string | 外部链接 |
| fileUrl | string | 本地文件路径 |
| description | string | 描述 |
| category | string | 分类（AI 自动分类） |
| credibilityLevel | 'A'\|'B'\|'C' | 可信等级 |
| fileType | string | 文件类型 (image/pdf/docx/...) |
| fileName | string | 原始文件名 |
| fileSize | number | 文件大小 (bytes) |
| fileExt | string | 扩展名 |
| mimeType | string | MIME 类型 |
| sourceFileKind | string | 文件大类 (pdf/txt/docx/image/...) |
| aiReadable | boolean | 是否可 AI 读取 |
| extractStatus | 'pending'\|'success'\|'failed'\|'unsupported' | 文本提取状态 |
| extractError | string | 提取错误信息 |
| textPath | string | 提取文本路径 |
| textCharCount | number | 文本字符数 |
| summaryStatus | 'pending'\|'success'\|'failed'\|'unsupported' | 摘要生成状态 |
| aiSummary | string | AI 生成摘要 (≤2000 字) |
| summaryUpdatedAt | string | 摘要更新时间 |
| importedBy | string | 导入者 |
| importedAt | string | 导入时间 |
| importedOriginalPath | string | 原始文件路径 (去重用) |
| contentHash | string | 内容哈希 (去重用) |
| reviewStatus | 'pending'\|'approved'\|'rejected' | 审核状态 |
| reviewConfidence | number | AI 审核置信度 |
| reviewReason | string | 审核理由 |
| reviewedBy | string | 审核人 |
| reviewedAt | string | 审核时间 |
| relatedSources | string[] | AI 推荐的关联史料 ID |

#### HeritageSite (企业遗址) — `data/sites.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 名称 |
| slug | string | URL 标识 |
| industry | 'textile'\|'machinery'\|'food'\|'chemical'\|'printing'\|'building'\|'transport'\|'other' | 行业 |
| description | string | 描述 |
| historicalValue | string | 历史价值 |
| location | string | 地址 |
| longitude | number | 经度 |
| latitude | number | 纬度 |
| establishedYear | number | 创立年份 |
| closedYear | number | 关闭年份 |
| status | 'active'\|'inactive'\|'demolished'\|'protected' | 现状 |
| coverImage | string | 封面图 |
| images | string[] | 图片集 |
| representativePeople | string[] | 代表人物 |
| relatedFacts | string[] | 关联史实 |
| sourceIds | string[] | 关联史料 |
| isPublished | boolean | 是否发布 |
| isRecommended | boolean | 是否推荐 |

#### Person (人物) — `data/people.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 姓名 |
| title | string | 称谓 |
| role | string | 身份 |
| entityType | 'person'\|'organization'\|'unknown' | 实体类型 |
| birthYear | number | 出生年份 |
| deathYear | number | 逝世年份 |
| biography | string | 生平简介 |
| achievements | string | 成就 |
| portrait | string | 肖像 |
| avatar | string | 头像 |
| bgImage | string | 背景图 |
| relatedSiteId | string | 关联遗址 |
| relatedSiteName | string | 关联遗址名 |
| siteIds | string[] | 关联遗址 ID 列表 |
| factIds | string[] | 关联史实 |
| sourceIds | string[] | 关联史料 |
| verifiedStatus | 'unverified'\|'verified' | 查验状态 |
| verifiedBy | string | 查验人 |
| verifiedAt | string | 查验时间 |
| pinned | boolean | 前台置顶 |

#### FactClaim (史实) — `data/facts.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 标题 |
| claimText | string | 史实正文 |
| publicExpression | string | 公开展示表述 |
| riskWords | string[] | 风险词 |
| riskLevel | 'high'\|'medium'\|'low' | 风险等级 |
| reviewStatus | 'pending'\|'approved'\|'rejected' | 审核状态 |
| isPublished | boolean | 发布状态 |
| siteIds | string[] | 关联遗址 |
| personIds | string[] | 关联人物 |
| sourceIds | string[] | 关联史料 |
| category | string | 分类 |

#### TimelineEvent (时间轴事件) — `data/timeline.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| year | number | 年份 |
| month | number | 月份 |
| day | number | 日期 |
| title | string | 标题 |
| description | string | 描述 |
| category | string | 分类 (7 类) |
| importance | 1\|2\|3\|4\|5 | 重要程度 |
| image | string | 图片 |
| siteIds | string[] | 关联遗址 |
| sourceIds | string[] | 关联史料 |
| reviewStatus | 'pending'\|'approved'\|'rejected' | 审核状态 |
| isPublished | boolean | 发布状态 |
| generatedByAI | boolean | 是否 AI 生成 |
| aiRationale | string | AI 生成依据 |

### 3.3 关联实体

#### SourceLink (史料关联) — `data/sourceLinks.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| sourceId | string | 源史料 ID |
| targetId | string | 目标史料 ID |
| relationType | 'cites'\|'supports'\|'contradicts'\|'extends'\|'related' | 关系类型 |
| confidence | number (0-1) | 置信度 |
| aiReason | string | AI 判定理由 |
| isApproved | boolean | 是否确认 |
| isEdited | boolean | 是否人工编辑 |
| editorNote | string | 编辑备注 |

#### AiToken (AI 缓存) — `data/ai_tokens.json`

| 字段 | 类型 | 说明 |
|------|------|------|
| targetType | string | 目标类型 (source/submission/person/site/fact) |
| targetId | string | 目标 ID |
| summary | string | AI 摘要 |
| keywords | string[] | 关键词 |
| entities | string[] | 实体 |
| tags | string[] | 标签 |
| traits | string[] | 特征 |
| category | string | 分类 |
| confidenceScore | number | 置信度 |
| isCredible | boolean | 是否可信 |
| doubts | string[] | 疑点 |
| errorPositions | string[] | 错误位置 |
| relatedTargetIds | string[] | 关联目标 |
| sourceIds | string[] | 关联史料 |
| status | 'active'\|'pending'\|'failed'\|'archived' | 状态 |
| summaryQuality | 'full'\|'partial'\|'pending' | 摘要质量 |
| manualOverride | boolean | 是否人工覆盖 |
| modelProvider | 'local'\|'cloud'\|'none' | 模型来源 |
| modelName | string | 模型名 |
| rawResult | object | 原始 AI 返回 |

### 3.4 内容实体

#### DigitalScene (数字复原) — `data/scenes.json`

| 字段 | 说明 |
|------|------|
| title, description, image | 基本信息 |
| modelUrl | 3D 模型路径 (gltf/obj/fbx) |
| modelType | 模型类型 |
| hotspots | SceneHotspot[] (标注点: label, description, xPercent, yPercent, linkUrl) |
| siteId | 关联遗址 |

#### Course (公益课程) — `data/courses.json`

| 字段 | 说明 |
|------|------|
| title, description | 基本信息 |
| type, targetAudience | 类型/对象 |
| pptFile, scriptFile, taskFile | 课件/教案/任务单路径 |
| keywords, relatedFactIds | 关键词/关联史实 |
| isPublished | 发布状态 |

#### Activity (活动记录) — `data/activities.json`

| 字段 | 说明 |
|------|------|
| title, description | 基本信息 |
| date, location | 时间地点 |
| servedCount | 服务人次 |
| feedback | 反馈 |
| photos | 照片 (从媒体库选取) |
| isPublished | 发布状态 |

#### MapPoint (地图点位) — `data/map_points.json`

| 字段 | 说明 |
|------|------|
| name, slug, description | 基本信息 |
| xPercent, yPercent | 底图百分比坐标 |
| longitude, latitude | 地理坐标 |
| siteId, status, baseMapImage | 关联遗址/状态/底图 |

### 3.5 系统实体

#### MediaFile (媒体文件) — `data/media.json`

| 字段 | 说明 |
|------|------|
| originalName, fileName | 文件名 |
| url | 访问路径 |
| type | image/document/course/scene |
| size, mimeType | 大小/类型 |
| category | historical/web |

#### Settings (系统设置) — `data/settings.json`

包含: siteTitle, siteDescription, projectIntro, contactInfo, footerText, mapBaseImage, heroImageUrl, AI 配置 (enabled/baseUrl/apiKey/model/timeoutMs/temperature), cloud AI 配置, sourceImportDir, admin 账号信息。

#### UserAccount (用户账户) — `data/users.json`

包含: username, passwordHash, passwordSalt, role, name, gender, phone, email, status。

#### SourceSubmission (史料投稿) — `data/source_submissions.json`

包含: name, contact, title, content, source, fileUrl, status, adminNote, AI 审核字段。

---

## 4. 功能模块详述

### 4.1 首页

| 属性 | 说明 |
|------|------|
| 路由 | `/` (`src/app/page.tsx`) |
| 组件 | StatCard, HomeWordCloud, Navbar, Footer |
| AI 依赖 | 词云数据依赖 AiToken 缓存 |

**功能**:
- 统计卡片: 展示遗址数/人物数/史实数/史料数
- 词云: 动态加载 d3-cloud 布局，展示高频关键词/实体/人物，支持拖拽缩放和点击跳转搜索
- 入口导航: 史料库、企业遗址、时间轴、知识图谱等模块快速入口

**数据流**: `GET /api/wordcloud` → `buildWordCloudData()` → 三层权重聚合 → 返回 top 80 词

---

### 4.2 史料库

| 属性 | 说明 |
|------|------|
| 前台路由 | `/sources/[id]` (详情) |
| 后台路由 | `/admin/sources` (管理), `/admin/review` (审核), `/admin/links` (关联管理) |
| 组件 | SourceDetail, DataTable, ReviewBadge, Pagination |
| 核心服务 | sourceImport.ts, mergeService.ts, sourceMaintenance.ts, dedupService.ts |
| AI 依赖 | 摘要生成/智能分类/关联推荐/自动审核/合并预览 |

**功能**:

1. **史料管理**: 列表/搜索/排序/分页，文件名完整显示（去后缀）、等级筛选、审核状态筛选
2. **史料导入**: 支持按 A/B/C 三级目录批量导入，自动文件分类、哈希去重、文本提取、AI 摘要
3. **史料审核**: pending→approved/rejected 状态机，AI 自动审核（置信度+关联推荐），人工审批确认
4. **史料合并**: 标题相似度+哈希检测候选，AI 预览合并方案（标题/摘要/冲突检测），执行合并（创建新记录、转移 Link/Token/Ref、软删除旧记录）
5. **关联管理**: SourceLink CRUD，人工创建/编辑/审批关联
6. **级联删除**: 删除史料时自动清理关联的 SourceLink、AiToken、Person.sourceIds、Site.sourceIds
7. **CSV/ZIP 导出**: 史料台账 CSV 导出，含文本/摘要/原始文件的 ZIP 包导出

---

### 4.3 企业遗址

| 属性 | 说明 |
|------|------|
| 前台路由 | `/sites`, `/sites/[slug]` |
| 后台路由 | `/admin/sites` |
| AI 依赖 | AI 生成遗址描述 (action=generate_description) |

**功能**:
- 遗址列表/详情展示（名称、行业、历史价值、地址、存续年份）
- 后台 CRUD + 发布管理 + 推荐标记
- 地图点位关联、代表人物关联、史实关联

---

### 4.4 人物故事

| 属性 | 说明 |
|------|------|
| 前台路由 | `/people`, `/people/[id]` |
| 后台路由 | `/admin/people` |
| AI 依赖 | AI 生成人物描述 |

**功能**:
- 人物列表（卡片+轮播），置顶人物优先展示（前 5 人轮播）
- 人物详情：生平、成就、关联遗址/史实/史料
- 后台：CRUD + 人工查验 (verifiedStatus) + 置顶设置 (pinned) + 批量删除/批量通过
- 实体类型分类：人物 (person) / 企业/机构 (organization) / 未分类 (unknown)

---

### 4.5 史实核验

| 属性 | 说明 |
|------|------|
| 前台路由 | `/facts` |
| 后台路由 | `/admin/facts` |
| AI 依赖 | AI 风险词检查 (action=risk_check) |

**功能**:
- 前台：展示已核验发布的史实，按 A/B/C 级史料分类，hover 显示等级说明
- 后台：CRUD + 审核 + 发布管理，A/B/C 等级标签 + hover tooltip
- 已移除风险等级标签展示（风险词/风险等级数据保留但不在 UI 显示）

---

### 4.6 时间轴

| 属性 | 说明 |
|------|------|
| 前台路由 | `/timeline` |
| 后台路由 | `/admin/timeline` |
| 组件 | TimelineClient (客户端交互时间线) |
| AI 依赖 | AI 生成时间轴候选事件 (action=organize_timeline) |

**功能**:
- 前台：交互式时间线，按 7 类工业分类颜色标记，事件详情弹窗
- 后台：CRUD + 7 分类筛选 + AI 生成候选事件（基于史料自动发现缺失事件）
- 7 类合并方案：军事工业/化工工业/钢铁建材/交通基建/电子工业/政策影响/文化遗产
- 标题显示 "工业纪年"（原英文已改为中文）

---

### 4.7 知识图谱

| 属性 | 说明 |
|------|------|
| 前台路由 | `/graph` |
| API | `/api/graph`, `/api/links/chain` |
| 组件 | GraphView (力导向图) |
| 前端路由 | `/explore` (探索浏览) |

**功能**:
- 力导向图展示 Source → Person → Site 之间的关联关系
- SourceLink 关联 + Person/Site 的 sourceIds/siteIds 隐式关联
- 节点: 图标+标签卡 (Source/Person/Site 三类)
- 连线: 箭头 + 置信度线型 (高置信度实线/低置信度虚线)
- 关系类型中文: 引用/支持/矛盾/扩展/相关
- 信息链: BFS 展开关联网络，AI 生成叙事讲解

---

### 4.8 数字复原

| 属性 | 说明 |
|------|------|
| 前台路由 | `/scenes`, `/scenes/[id]` |
| 后台路由 | `/admin/scenes` |
| 组件 | ModelViewer (Three.js), SceneDetailClient |
| AI 依赖 | 无 |

**功能**:
- 3D 模型展示 (gltf/obj/fbx)，@react-three/fiber 渲染
- 热点标注 (SceneHotspot): 点击展示描述、跳转链接
- 骨架屏加载 + 图片淡入 + 视口内预加载

---

### 4.9 地图点位

| 属性 | 说明 |
|------|------|
| 路由 | `/map`, `/admin/map` |
| AI 依赖 | 无 |

**功能**:
- 底图叠加坐标标注，百分比坐标 + 地理坐标双系统
- 后台: CRUD + 遗址关联

---

### 4.10 公益课程

| 属性 | 说明 |
|------|------|
| 路由 | `/courses`, `/admin/courses` |
| AI 依赖 | 按架构约束不接入 AI |

**功能**:
- 课件/教案/任务单管理
- 关键词 + 关联史实 + 发布管理

---

### 4.11 活动记录

| 属性 | 说明 |
|------|------|
| 路由 | `/activities`, `/admin/activities` |
| AI 依赖 | 无 |

**功能**:
- 活动 CRUD + 发布管理
- 照片从媒体库选取 (MediaPickerField 组件)
- 服务人次统计、反馈记录

---

### 4.12 AI 检索测试

| 属性 | 说明 |
|------|------|
| 路由 | `/admin/ai` |
| API | `/api/ai` (多 action 统一入口) |
| AI 依赖 | 全部 action |

**功能**:
- 统一 AI 测试入口，支持 16 种 action:
  - `ask` — 史料问答（含 [S1][S2] 引用标记和参考文献）
  - `search_sources` — 史料检索
  - `summary` — 文本摘要
  - `exhibition` — 展陈文案
  - `risk_check` — 风险词检查
  - `test_connection` — AI 连接测试
  - `source_summary` — 史料摘要生成并保存
  - `source_parse` — 史料解析（关键词+实体+标签+特征）
  - `source_classify` — 史料自动分类
  - `source_recommend` — 智能推荐关联目标
  - `submission_review` — 投稿 AI 审核
  - `aitoken_rebuild` — 重建 AiToken
  - `aitoken_search` — 搜索 AiToken
  - `creative_writing` — 创意写作
  - `organize_timeline` — 生成时间轴候选
  - `generate_description` — 生成遗址/人物描述
- 每个 action 在 AI 未启用时返回明确的离线提示

---

### 4.13 AI Studio

| 属性 | 说明 |
|------|------|
| 路由 | `/ai-studio` |
| API | `/api/ai-studio` |
| AI 依赖 | 创意写作、展陈文案 |

**功能**:
- 创意写作：主题 + 风格 + 篇幅 → AI 生成文本（含引用标记和参考文献）
- JSON 格式解析容错：复用 `parseLooseJsonObject` 循环解析嵌套 JSON

---

### 4.14 媒体库

| 属性 | 说明 |
|------|------|
| 路由 | `/admin/media` |
| API | `/api/upload`, `/api/data?type=media` |
| AI 依赖 | 无 |

**功能**:
- 文件上传 (images/documents/courses/scenes 四类目录)
- 分类筛选 (historical/web 两类)，文件名称排序
- MediaPicker 组件：弹窗选取 + 图片搜索
- 自动记录上传到 media.json

---

### 4.15 系统设置

| 属性 | 说明 |
|------|------|
| 路由 | `/admin/settings` |
| API | `/api/data?type=settings` |
| AI 依赖 | 无 |

**功能**:
- 站点信息: siteTitle, siteDescription, projectIntro, contactInfo, footerText
- AI 配置: 本地模型 (baseUrl/apiKey/model/timeoutMs/temperature) + 云端 Claude (cloudAi*) + cloudAiProtocol
- 导入目录: sourceImportDir
- 管理员账号: adminUsername/password/name/gender/phone/email
- 地图底图、首页大图 URL

---

## 5. 核心技术实现

### 5.1 JSON 文件数据库

**实现**: `src/lib/dataService.ts` — `DataService<T extends BaseFields>`

```ts
// 核心方法
class DataService<T> {
  getAll(): Promise<T[]>           // 获取所有未删除记录
  getById(id): Promise<T|null>     // 按 ID 获取
  create(data): Promise<T>         // 创建 (自动生成 UUID + 时间戳)
  update(id, data): Promise<T|null> // 部分更新
  delete(id): Promise<boolean>     // 软删除 (设置 isDeleted=true)
  query(filter): Promise<T[]>      // 精确匹配查询
  search(keyword, fields): Promise<T[]> // 模糊搜索
  all(): Promise<T[]>              // 获取所有记录 (含已删除)
  count(): Promise<number>         // 计数
  getPaginated(opts): Promise<Paginated> // 分页+排序
}

// 15 个数据集合实例
export const db = {
  sources, sites, people, facts, timeline,
  mapPoints, scenes, courses, activities, media,
  settings, users, sourceSubmissions, aiTokens, sourceLinks
}
```

**软删除模式**: 所有删除操作仅设置 `isDeleted=true`，物理数据保留。`getAll()` 自动过滤已删除记录，`all()` 返回全部。

**并发安全**: 每次读写均为同步 `readFileSync`/`writeFileSync`，通过 Node.js 事件循环单线程特性保证操作原子性。

### 5.2 AI 提供者抽象

**实现**: `src/lib/aiProvider.ts`

```
invokeAI(messages, options)
  ├── 本地模型: invokeOpenAICompatible()
  │   └── POST {baseUrl}/chat/completions (Ollama OpenAI-compatible)
  └── [本地失败 + allowCloudFallback] 云端 fallback:
      ├── cloudAiProtocol='claude' → invokeClaude()
      │   └── POST {baseUrl}/messages (Anthropic Messages API)
      └── 其他 → invokeOpenAICompatible() (cloud config)
```

**关键参数**: timeoutMs (默认 30000), maxTokens, temperature

**客户端调用链**: `aiClient.chat()` → `aiClient.chatWithMeta()` → `aiProvider.invokeAI()` → 返回 `{ content, provider, model }`

### 5.3 AiToken 缓存层

**实现**: `src/lib/aiTokenService.ts`

- **目的**: 避免对同一史料重复调用 AI，缓存 AI 分析结果
- **存储**: `data/ai_tokens.json`，通过 `targetType + targetId` 唯一定位
- **操作**: `upsertAiToken()` (创建或更新), `rebuildAiToken()` (强制重建), `searchAiTokens()` (关键词搜索)
- **内容**: AI 生成的 summary/keywords/entities/tags/traits/category/confidenceScore/doubts 等
- **来源追踪**: modelProvider + modelName 标记生成模型

### 5.4 文本提取管道

**实现**: `src/lib/sourceTextExtractor.ts`

```
文件上传
  → 检测 sourceFileKind (pdf/docx/txt/image/...)
    → DOCX: mammoth.extractRawText()
    → PDF: pdf-parse()
    → TXT/MD: fs.readFileSync('utf-8')
    → 其他: 标记 unsupported
  → 写入 data/source_text/{uuid}.txt
  → 更新 Source.extractStatus + textPath + textCharCount
```

### 5.5 词云算法

**实现**: `src/lib/wordCloudData.ts` + `src/lib/wordCloudUtils.ts` + `src/components/front/WordCloud.tsx`

**权重计算 (三层聚合)**:

```
totalWeight = linkWeight × 0.5 + tokenWeight × 0.3 + crossRefWeight × 0.2

linkWeight:    SourceLink 网络中的度数中心性 (标题词)
tokenWeight:   AiToken 中 keywords/entities 出现频次
crossRefWeight: Person 关联的 approved Source 数量
```

**布局**: d3-cloud Archimedean spiral, 取 top 80 词，字号范围 12-72px

**颜色**: `weightToColor()` 按权重从 `#4A3728`(高) → `#8B7355`(中) → `#B8A88A`(低) 渐变

**交互**: hover 放大 1.3x + 金色高亮 + 其他词透明 0.3, 点击跳转搜索, 拖拽平移, 滚轮缩放 (0.5x-2.5x)

### 5.6 审核状态机

**实现**: `src/lib/sourceImport.ts` (autoReviewSource) + `src/app/api/admin/review/route.ts`

```
史料导入
  → reviewStatus = 'pending'
  → autoReviewSource() 异步触发 (fire-and-forget)
    → AI 评估质量 + 查找关联史料
    → 写入 reviewConfidence + reviewReason + relatedSources
  → 人工审批:
    → POST /api/admin/review { action: 'approve'|'reject' }
    → reviewStatus → 'approved'|'rejected'
```

**兼容性**: 旧数据 reviewStatus 为空时，过滤逻辑视为 `'approved'`（向后兼容）

### 5.7 史料合并流程

**实现**: `src/lib/mergeService.ts` + `src/app/api/admin/merge/route.ts`

```
1. 候选发现: findMergeCandidates(sourceId)
   - 标题相似度 ≥ 70% → 候选
   - 内容哈希相同 → 确认为重复 (similarity=1.0)

2. 合并预览: previewMerge(sourceId1, sourceId2)
   - AI 分析两篇史料 → 建议标题 + 合并摘要 + 冲突项
   - AI 不可用时 fallback: 取较长标题 + 拼接摘要

3. 执行合并: executeMerge(sourceId1, sourceId2, approvedBy)
   - 创建新 Source 记录 (合并属性)
   - 转移 SourceLinks → 指向新 ID
   - 归档旧 AiTokens + 生成新 AiToken
   - 更新 Person.sourceIds / Site.sourceIds
   - 软删除原始两条记录
```

### 5.8 级联删除

**实现**: `src/app/api/data/route.ts` DELETE handler

```
DELETE /api/data { type: 'sources', id }
  → 软删除 Source (isDeleted=true)
  → 级联软删除 SourceLinks (sourceId===id || targetId===id)
  → 级联软删除 AiTokens (targetType==='source' && targetId===id)
  → 从 Person.sourceIds 移除该 ID
  → 从 Site.sourceIds 移除该 ID
  → 返回 { success: true, cascadeInfo: { orphanLinks, orphanTokens, cleanedRefs } }
```

### 5.9 鉴权系统

**实现**: `src/middleware.ts` + `src/lib/auth.ts`

```
双层鉴权:
  Layer 1: Next.js Middleware
    - 匹配 /admin/:path* (排除 /admin/login, /admin/register)
    - Cookie admin_token !== 'authenticated' → 302 重定向到 /admin/login

  Layer 2: API Route requireAuth()
    - 每个 /api/* 路由入口调用 requireAuth(request)
    - 未登录 → 返回 401 JSON

登录: POST /api/auth { username, password }
  → login() 校验 (config 账号 或 users.json 账号)
  → 频率限制: 5次/15分钟
  → 超时控制: 15s
  → 成功: Set-Cookie admin_token=authenticated (HttpOnly, SameSite=Strict, Max-Age=86400)
```

### 5.10 导入管道

**实现**: `src/lib/sourceImport.ts`

```
扫描目录结构:
  imports/sources/
    A/ → 图片/文档 (A 级可信度)
    B/ → 图片/文档 (B 级可信度)
    C/ → 图片/文档 (C 级可信度)

导入流程 (importOneFile):
  1. 文件分类 (ext → fileType / sourceFileKind / mimeType)
  2. 哈希去重 (contentHash)
  3. 安全文件名 + 唯一性检查
  4. 复制到 public/uploads/sources/{grade}/
  5. AI 智能分类 (classifySource, 失败回退快速规则)
  6. 创建 Source 记录 (reviewStatus='pending')
  7. 创建 MediaFile 记录
  8. enrichSourceAfterImport: 文本提取 → AI 摘要 → 关键词抽取
  9. autoReviewSource: AI 审核 (异步, fire-and-forget)
```

---

## 6. 离线容错设计

### 6.1 AI 依赖点总览

| 功能 | 调用点 | AI 不可用时行为 |
|------|--------|---------------|
| 史料问答 | `/api/ai` action=ask | 返回史料检索结果 + "AI 未启用"提示 |
| 深度分析 | `/api/search` mode=deep | 返回史料检索结果 + "AI 未启用"消息 |
| 摘要生成 | `/api/ai` action=source_summary | 返回错误 + "AI 未启用"消息 |
| 史料解析 | `/api/ai` action=source_parse | 返回错误 + "AI 未启用"消息 |
| 史料分类 | `/api/ai` action=source_classify | 返回错误 + "AI 未启用"消息 |
| 关联推荐 | `/api/ai` action=source_recommend | 返回错误 + "AI 未启用"消息 |
| 投稿审核 | `/api/ai` action=submission_review | 返回错误 + "AI 未启用"消息 |
| 创意写作 | `/api/ai` action=creative_writing | 返回错误 + "AI 未启用"消息 |
| 时间轴候选 | `/api/ai` action=organize_timeline | 返回错误 + "AI 未启用"消息 |
| 实体描述 | `/api/ai` action=generate_description | 返回错误 + "AI 未启用"消息 |
| 风险检查 | `/api/ai` action=risk_check | 返回错误 + "AI 未启用"消息 |
| 连接测试 | `/api/ai` action=test_connection | 正常返回连接状态 |
| 搜索摘要 | `/api/search` includeBrief | 返回 aiBrief=null, status='disabled' |
| 史料合并 | `mergeService.previewMerge` | fallback: 取较长标题 + 拼接摘要 |
| 自动审核 | `sourceImport.autoReviewSource` | catch 静默失败, 史料保持 pending |
| AI 分类 | `sourceImport.classifySource` | catch 回退到 quickClassify() 规则分类 |
| 词云生成 | `buildWordCloudData` | 无 AI 依赖，仅基于 Link/Token/CrossRef 统计 |
| 图谱数据 | `/api/graph` | 无 AI 依赖，纯 Link/Ref 关系计算 |
| 信息链 | `/api/links/chain` | AI 讲解失败 → 显示 fallback 文字 |

### 6.2 降级策略

1. **API 层守卫**: 每个 AI action 入口先检查 `isAIEnabledAsync()`，未启用则返回明确的 `enabled: false` + 降级消息
2. **服务层 fallback**: mergeService 的 AI 预览失败 → 使用基本规则合并；smartClassifier 失败 → 使用 quickClassify
3. **UI 层提示**: 搜索页、AI Studio 页在前端捕获错误并显示用户友好的降级提示

### 6.3 控制开关

- 环境变量 `AI_ENABLED=true/false` — 全局 AI 开关
- `aiProvider.allowCloudFallback` — 单次调用是否允许云端 fallback
- `Settings.aiEnabled` — 运行时 AI 开关（可通过后台设置页面控制）

---

## 7. 配置与环境变量

### 7.1 .env.local 字段说明

| 变量 | 说明 | 示例 |
|------|------|------|
| AI_ENABLED | AI 功能总开关 | true |
| AI_BASE_URL | 本地 Ollama 地址 | http://localhost:11434/v1 |
| AI_API_KEY | API Key (Ollama 可留空) | ollama |
| AI_MODEL | 本地模型名 | qwen2.5:7b |
| AI_TIMEOUT_MS | 请求超时 (ms) | 30000 |
| AI_TEMPERATURE | 生成温度 | 0.3 |
| CLOUD_AI_ENABLED | 云端 fallback 开关 | true |
| CLOUD_AI_BASE_URL | 云端 API 地址 | https://api.anthropic.com |
| CLOUD_AI_API_KEY | 云端 API Key | sk-ant-... |
| CLOUD_AI_MODEL | 云端模型名 | claude-sonnet-4-6 |
| CLOUD_AI_PROTOCOL | 云端协议 | claude |
| ADMIN_USERNAME | 管理员用户名 | admin |
| ADMIN_PASSWORD | 管理员密码 | *** |
| ADMIN_NAME | 管理员显示名 | 管理员 |
| ADMIN_GENDER | 性别 | male |
| ADMIN_PHONE | 电话 | - |
| ADMIN_EMAIL | 邮箱 | - |
| ADMIN_REGISTRATION_KEY | 注册密钥 | *** |
| JWT_SECRET | JWT 密钥 | *** |
| SOURCE_IMPORT_DIR | 史料导入目录 | imports/sources |

### 7.2 AI 双通道配置

```
本地 (Ollama):             云端 (Claude fallback):
AI_ENABLED=true            CLOUD_AI_ENABLED=true
AI_BASE_URL=http://...     CLOUD_AI_BASE_URL=https://...
AI_MODEL=qwen2.5:7b        CLOUD_AI_MODEL=claude-sonnet-4-6
                           CLOUD_AI_PROTOCOL=claude
```

调用优先级: 本地 → 本地失败 + allowCloudFallback → 云端 → 返回错误

---

## 附录: 完整路由表

### 前台页面 (18 routes)

| 路由 | 页面 |
|------|------|
| `/` | 首页 |
| `/about` | 关于 |
| `/activities` | 活动记录 |
| `/ai-studio` | AI Studio |
| `/compare` | 史料对比 |
| `/courses` | 公益课程 |
| `/explore` | 探索浏览 |
| `/facts` | 史实档案 |
| `/graph` | 知识图谱 |
| `/map` | 地图点位 |
| `/people` | 人物故事 |
| `/people/[id]` | 人物详情 |
| `/scenes` | 数字复原 |
| `/scenes/[id]` | 复原详情 |
| `/search` | 全站搜索 |
| `/sites` | 企业遗址 |
| `/sites/[slug]` | 遗址详情 |
| `/sources/[id]` | 史料详情 |
| `/submit-source` | 史料投稿 |
| `/timeline` | 工业纪年 |

### 后台页面 (19 routes)

| 路由 | 功能 |
|------|------|
| `/admin/login` | 登录 |
| `/admin/register` | 注册 |
| `/admin/dashboard` | 数据看板 |
| `/admin/sources` | 史料库管理 |
| `/admin/facts` | 史实核验 |
| `/admin/submissions` | 史料投稿管理 |
| `/admin/sites` | 企业遗址管理 |
| `/admin/people` | 人物管理 |
| `/admin/timeline` | 时间轴管理 |
| `/admin/map` | 地图点位管理 |
| `/admin/scenes` | 数字复原管理 |
| `/admin/courses` | 公益课程管理 |
| `/admin/activities` | 活动记录管理 |
| `/admin/media` | 媒体文件管理 |
| `/admin/ai` | AI 检索测试 |
| `/admin/ai-tokens` | AI Token 管理 |
| `/admin/links` | 关联管理 |
| `/admin/review` | 审核管理 |
| `/admin/settings` | 系统设置 |
