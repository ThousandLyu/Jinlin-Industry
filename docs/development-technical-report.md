# 金陵工脉 — 开发技术报告

> 南京民族工业遗产数字化展示平台
> 版本: 1.0 | 日期: 2026-05-05

---

## 一、项目概览

"金陵工脉"是一个专注于南京民族工业遗产的**全栈 Web 应用**，覆盖史料采集、AI 辅助编目、知识图谱构建、三维数字复原与公众展示的完整链路。系统采用**无外部数据库**的轻量架构，所有数据以 JSON 文件存储，AI 功能通过**本地模型优先 + 云端 fallback** 的双通道策略保障离线可用性。

| 属性 | 说明 |
|------|------|
| 项目名称 | 金陵工脉 (Jinling Industrial Archive) |
| 项目类型 | 全栈 Web 应用 (SSR + SPA 混合) |
| 运行环境 | Node.js 20+ |
| 部署形态 | 单机 Node.js 服务，无外部数据库依赖 |
| 页面总数 | 68 页 (前台 20 + 后台 19 + API 30) |
| 主要语言 | TypeScript (strict mode) |

---

## 二、技术栈

### 2.1 编程语言

| 语言 | 用途 | 占比 |
|------|------|------|
| TypeScript 5.3 | 全栈主语言 (前端页面 + API 路由 + 服务库 + 类型定义) | ~95% |
| CSS (Tailwind) | 样式与主题 | ~4% |
| JavaScript (ESM) | 构建脚本与工具 (seed.ts, doctor.mjs) | ~1% |

### 2.2 框架与运行时

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 14.2 | 全栈框架 (App Router)，提供服务端渲染、API 路由、中间件 |
| **React** | 18.3 | UI 组件库，所有页面基于 React Server Components + Client Components 混合渲染 |
| **Node.js** | 20+ | 运行时环境 |

### 2.3 前端技术

| 技术 | 用途 |
|------|------|
| **Tailwind CSS** 3.4 | 原子化 CSS 框架，自定义设计令牌（cream/gold/brown/red 色系） |
| **Noto Serif/Sans SC** | 中文字体（思源宋体/黑体），衬线标题 + 无衬线正文 |
| **Three.js** (@react-three/fiber 9 + @react-three/drei 10) | 数字复原场景的 3D 模型渲染 (glTF/OBJ/FBX) |
| **d3** 7.9 + **d3-cloud** 1.2 | 词云布局算法 (Archimedean spiral) + 力导向知识图谱 |
| **CSS Animations** | 页面过渡动画 (card-enter, skeleton-pulse, fadeIn, slideUp) |

### 2.4 后端技术 (Node.js 服务端)

| 技术 | 用途 |
|------|------|
| **Next.js API Routes** | 30 个 RESTful API 路由，处理数据 CRUD、AI 调用、文件上传、导出 |
| **Next.js Middleware** | Cookie 鉴权路由守卫（拦截 `/admin/*`） |
| **archiver** 7.0 | ZIP 压缩（数据备份 + 史料 ZIP 导出） |
| **csv-stringify** 6.7 | CSV 格式导出（史实台账、史料台账） |
| **xlsx** 0.18 + **docx** 9.6 | Excel/DOCX 文件读写 |

### 2.5 文档解析管道

| 技术 | 用途 |
|------|------|
| **mammoth** 1.12 | DOCX → 纯文本提取 |
| **pdf-parse** 2.4 | PDF → 纯文本提取 |
| **xlsx** 0.18 | Excel 表格读取 |
| **Node.js fs** | TXT/MD 文件直接读取 |

**支持的文件格式**: PDF, DOCX, TXT, MD, XLSX, CSV, JPG, PNG, GIF, WebP, GLB, GLTF, OBJ, FBX, MP3, MP4 等

### 2.6 AI/LLM 集成

| 组件 | 说明 |
|------|------|
| **本地模型** | Ollama (qwen2.5:7b)，通过 OpenAI-compatible API (`/v1/chat/completions`) 调用 |
| **云端 fallback** | Claude API (Anthropic Messages API)，本地模型失败时自动切换 |
| **协议支持** | OpenAI Chat Completions API + Anthropic Messages API 双协议 |
| **AI 能力** | 史料问答、摘要生成、实体识别、智能分类、关联推荐、创意写作、风险词检测、时间轴生成、投稿审核 |

### 2.7 数据存储

| 存储方式 | 说明 |
|------|------|
| **JSON 文件** | 15 个数据集合 (sources/sites/people/facts/timeline 等)，通过 DataService 泛型类统一读写 |
| **TXT 文件** | 86 个提取的史料纯文本，存储于 `data/source_text/` |
| **文件系统** | 168 个上传文件，按 A/B/C 可信等级分目录存储于 `public/uploads/sources/` |

### 2.8 开发工具链

| 工具 | 用途 |
|------|------|
| **TypeScript** (tsc) | 静态类型检查 (strict mode, 0 错误) |
| **ESLint** 8 + eslint-config-next | 代码规范检查 |
| **Tailwind CSS** + **PostCSS** + **Autoprefixer** | CSS 构建管道 |
| **tsx** 4.7 | TypeScript 脚本执行器 (seed.ts) |
| **uuid** 9.0 | UUID 主键生成 |

---

## 三、系统架构概览

### 3.1 分层架构图（文字）

```
┌──────────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                           │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 前台页面  │  │ 后台管理  │  │ 3D 场景  │  │ 知识图谱  │        │
│  │ (20 页)  │  │ (19 页)  │  │ (Three)  │  │ (d3 力导向)│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │                │
│       └─────────────┴──────┬──────┴─────────────┘                │
│                            │                                      │
│              HTTP Fetch / Next.js Router                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────────┐
│                     Next.js 服务端                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Middleware (Cookie 鉴权)                       │    │
│  │  拦截 /admin/* → 检查 admin_token → 302 重定向             │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                      │
│  ┌──────────────────────────┴───────────────────────────────┐    │
│  │             API 路由层 (30 个 route.ts)                    │    │
│  │                                                           │    │
│  │  /api/data        CRUD      /api/ai         AI 服务       │    │
│  │  /api/search      搜索      /api/export     数据导出       │    │
│  │  /api/graph       图谱      /api/wordcloud  词云           │    │
│  │  /api/auth        认证      /api/upload     文件上传       │    │
│  │  /api/admin/*     管理      /api/import/*   史料导入       │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                      │
│  ┌──────────────────────────┴───────────────────────────────┐    │
│  │             服务库层 (27 个 lib/*.ts)                      │    │
│  │                                                           │    │
│  │  dataService.ts     JSON 数据库 (泛型 CRUD + 分页)         │    │
│  │  aiProvider.ts      AI 提供者抽象 (本地 + 云端双通道)       │    │
│  │  aiClient.ts        AI 客户端 (Prompt 构建 + 结果解析)     │    │
│  │  aiTokenService.ts  AI 缓存管理                            │    │
│  │  aiActions.ts       AI 操作定义 (解析/分类/推荐)            │    │
│  │  sourceImport.ts    史料导入管道                            │    │
│  │  sourceTextExtractor.ts  文档文本提取                       │    │
│  │  mergeService.ts    史料合并引擎                            │    │
│  │  wordCloudData.ts   词云数据聚合                            │    │
│  │  linkService.ts     关联网络服务                            │    │
│  │  auth.ts            鉴权工具                                │    │
│  │  ...                                                     │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                      │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────────────┐
│                       数据层 (文件系统)                             │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ 15 个 JSON   │  │ 86 个 TXT    │  │ 168 个上传文件        │    │
│  │ 数据集合     │  │ 提取文本     │  │ (A/B/C 三级目录)      │    │
│  │              │  │              │  │                      │    │
│  │ sources.json │  │ source_text/ │  │ uploads/sources/A/   │    │
│  │ people.json  │  │  {uuid}.txt  │  │ uploads/sources/B/   │    │
│  │ sites.json   │  │              │  │ uploads/sources/C/   │    │
│  │ facts.json   │  │              │  │ uploads/images/      │    │
│  │ timeline.json│  │              │  │ uploads/documents/   │    │
│  │ ...          │  │              │  │ ...                  │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 AI 调用链路

```
用户请求 (HTTP)
  │
  ▼
POST /api/ai  { action: "source_parse", id: "uuid" }
  │
  ▼
requireAuth() ──→ 鉴权通过
  │
  ▼
isAIEnabledAsync() ──→ AI_ENABLED=false ──→ 返回离线提示
  │ AI_ENABLED=true
  ▼
aiClient.chat([system, user])  构建 Prompt
  │
  ▼
aiProvider.invokeAI(messages, options)
  │
  ├──▶ invokeOpenAICompatible()  (本地 Ollama)
  │      POST http://localhost:11434/v1/chat/completions
  │      成功 ──→ 返回 { content, provider: "local", model }
  │      失败 ──→ allowCloudFallback ?
  │                │
  │                ├── false ──→ throw Error
  │                │
  │                └── true ──→ cloudAiProtocol ?
  │                               │
  │                               ├── "claude" ──→ invokeClaude()
  │                               │   POST {baseUrl}/messages
  │                               │   (Anthropic Messages API)
  │                               │
  │                               └── 其他 ──→ invokeOpenAICompatible()
  │                                   (云端 OpenAI-compatible)
  │
  ▼
parseLooseJsonObject(result.content)  解析 AI 返回的 JSON
  │
  ▼
aiTokenService.upsertAiToken()  缓存结果到 ai_tokens.json
  │
  ▼
return NextResponse.json({ success: true, result })
```

### 3.3 史料导入管道

```
imports/sources/ 目录扫描
  │
  ├── A/  (A 级可信度)
  ├── B/  (B 级可信度)
  └── C/  (C 级可信度)
  │
  ▼
逐文件处理:
  │
  ├── 1. 文件检测 (扩展名 → fileType / sourceFileKind / mimeType)
  ├── 2. 哈希去重 (contentHash 比对)
  ├── 3. 安全文件名 (unicode 规范化 + 唯一性校验)
  ├── 4. 文件复制 → public/uploads/sources/{grade}/
  ├── 5. AI 智能分类 → classifySource() (失败回退 quickClassify)
  ├── 6. 创建 Source 记录 (reviewStatus: "pending")
  ├── 7. 创建 MediaFile 记录
  ├── 8. enrichSourceAfterImport():
  │      ├── 文本提取 (mammoth/pdf-parse/fs)
  │      │    → data/source_text/{uuid}.txt
  │      ├── AI 摘要生成 → generateSourceSummary()
  │      └── AiToken 关键词/实体抽取 → upsertAiToken()
  └── 9. AI 自动审核 → autoReviewSource() (异步 fire-and-forget)
         ├── AI 评估质量 + 关联推荐
         └── 写入 reviewConfidence/reviewReason/relatedSources
```

### 3.4 史料合并流程

```
POST /api/admin/merge { action: "preview", sourceId1, sourceId2 }
  │
  ▼
findMergeCandidates(sourceId)
  ├── 标题相似度 ≥ 70% → 候选
  └── 内容哈希相同 → 确认为重复
  │
  ▼
previewMerge(sourceId1, sourceId2)
  ├── AI 分析两篇史料
  │    ├── mergedTitle (合并标题)
  │    ├── mergedSummary (合并摘要)
  │    └── conflictItems (冲突项)
  └── AI 不可用 → fallback (取较长标题 + 拼接摘要)
  │
  ▼
用户确认后 → POST { action: "execute", sourceId1, sourceId2 }
  │
  ▼
executeMerge()
  ├── 创建新 Source 记录 (合并属性)
  ├── 转移 SourceLinks → 指向新 ID
  ├── 归档旧 AiTokens + 生成新 AiToken
  ├── 更新 Person.sourceIds / Site.sourceIds
  └── 软删除原始两条记录
```

### 3.5 词云数据流

```
GET /api/wordcloud
  │
  ▼
buildWordCloudData()
  │
  ├── 加载数据: sources + sourceLinks + aiTokens + people
  │
  ├── 三层权重聚合:
  │    ├── LinkWeight × 0.5  (SourceLink 网络度数中心性)
  │    ├── TokenWeight × 0.3 (AiToken 关键词/实体频次)
  │    └── CrossRefWeight × 0.2 (Person 关联 source 数)
  │
  ├── 过滤: weight ≥ 1, 排除 [object Object], 取 top 80
  │
  ├── 字号映射: sizeFromWeight(weight, maxWeight) → 12-72px
  │
  └── 返回 { words, maxWeight }
  │
  ▼
WordCloud.tsx (客户端)
  ├── d3-cloud Archimedean spiral 布局
  ├── SVG text 元素渲染
  └── 交互: hover 高亮 / click 跳转搜索 / drag 平移 / wheel 缩放
```

---

## 四、API 接口体系

### 4.1 接口总览

系统共有 **30 个 API 路由**，分布在 14 个路径组下：

| 路由组 | 路由数 | 鉴权 | 说明 |
|--------|--------|------|------|
| `/api/data` | 1 (GET/POST/DELETE) | 需要 | 通用数据 CRUD（15 个集合） |
| `/api/ai` | 1 (GET/POST) | 需要 | AI 统一入口（16 种 action） |
| `/api/ai/*` | 6 | 需要 | AI 子服务（status/queue/conflict-detect/semantic-search/smart-link/summary-stats） |
| `/api/search` | 1 (GET/POST) | 无需 | 全站搜索 + AI 问答/深度分析 |
| `/api/export` | 1 (GET) | 需要 | CSV/ZIP 导出 |
| `/api/admin/review` | 1 (GET/POST) | 需要 | 史料审核管理 |
| `/api/admin/merge` | 1 (GET/POST) | 需要 | 史料合并（候选/预览/执行） |
| `/api/admin/orphans` | 1 (GET/POST) | 需要 | 孤数据扫描与清理 |
| `/api/links` (+ chain/discover) | 3 | 部分 | 史料关联 CRUD + 关联链查询 |
| `/api/graph` | 1 (GET) | 无需 | 知识图谱数据 |
| `/api/explore` | 1 (GET) | 无需 | 探索浏览数据 |
| `/api/wordcloud` | 1 (GET) | 无需 | 词云数据 |
| `/api/auth` | 1 (GET/POST/DELETE) | 无需 | 登录/状态/登出 |
| `/api/register` | 1 (POST) | 无需 | 管理员注册 |
| `/api/upload` | 1 (POST) | 需要 | 文件上传 |
| `/api/import/*` | 2 | 需要 | 史料批量导入 + 单文件导入 |
| `/api/sources/maintenance` | 1 (POST) | 需要 | 史料批量维护 |
| `/api/submissions/source` | 1 (POST) | 无需 | 公众史料投稿 |
| `/api/ai-tokens` | 1 (GET/POST/DELETE) | 需要 | AiToken 管理 |
| `/api/ai-studio` | 1 (POST) | 无需 | AI Studio 创意写作 |
| `/api/backup` | 1 (POST) | 需要 | 数据备份 |

### 4.2 AI Action 列表

`POST /api/ai` 通过 `action` 参数支持 **16 种** AI 操作：

| # | action | 功能 |
|---|--------|------|
| 1 | `ask` | 史料问答（含 [S1] 引用标记和参考文献） |
| 2 | `search_sources` | 关键词史料检索 |
| 3 | `summary` | 文本摘要 |
| 4 | `exhibition` | 展陈文案生成 |
| 5 | `risk_check` | 高风险表述检测 |
| 6 | `test_connection` | AI 连接测试 |
| 7 | `source_summary` | 史料摘要生成并保存 |
| 8 | `source_parse` | 史料深度解析（关键词/实体/标签/特征） |
| 9 | `source_classify` | 史料智能分类 |
| 10 | `source_recommend` | 智能关联推荐 |
| 11 | `submission_review` | 投稿 AI 审核 |
| 12 | `aitoken_rebuild` | 重建 AiToken 缓存 |
| 13 | `aitoken_search` | 搜索 AiToken |
| 14 | `creative_writing` | 创意写作（展陈/导览/故事） |
| 15 | `organize_timeline` | 基于史料生成时间轴候选事件 |
| 16 | `generate_description` | 生成遗址/人物描述 |

---

## 五、数据模型体系

系统定义了 **15 个数据实体**，分为四层：

### 5.1 核心实体 (5 个)

| 实体 | 文件 | 说明 |
|------|------|------|
| **Source** | sources.json | 史料 — 系统核心，含 30+ 字段（标题/类型/等级/文本提取/AI 摘要/审核状态） |
| **HeritageSite** | sites.json | 企业遗址 — 名称/行业/位置/历史价值/存续年份 |
| **Person** | people.json | 人物 — 姓名/实体类型/生平/查验状态/置顶 |
| **FactClaim** | facts.json | 史实 — 正文/公开展示/史料等级/审核状态 |
| **TimelineEvent** | timeline.json | 时间轴事件 — 年份/标题/7 分类/重要程度/AI 生成标记 |

### 5.2 关联实体 (2 个)

| 实体 | 文件 | 说明 |
|------|------|------|
| **SourceLink** | sourceLinks.json | 史料关联 — 源/目标/关系类型(引用/支持/矛盾/扩展/相关)/置信度 |
| **AiToken** | ai_tokens.json | AI 缓存 — 关键词/实体/标签/特征/分类/置信度/模型来源 |

### 5.3 内容实体 (5 个)

| 实体 | 文件 | 说明 |
|------|------|------|
| **DigitalScene** | scenes.json | 数字复原 — 3D 模型/热点标注 |
| **Course** | courses.json | 公益课程 — 课件/教案/任务单 |
| **Activity** | activities.json | 活动记录 — 时间/地点/服务人次/照片 |
| **MapPoint** | map_points.json | 地图点位 — 百分比坐标/地理坐标 |
| **MediaFile** | media.json | 媒体文件 — 上传记录/分类(historical/web) |

### 5.4 系统实体 (3 个)

| 实体 | 文件 | 说明 |
|------|------|------|
| **Settings** | settings.json | 系统设置 — 站点信息/AI 配置/管理员信息 |
| **UserAccount** | users.json | 用户账户 — 密码哈希/角色 |
| **SourceSubmission** | source_submissions.json | 史料投稿 — 公众提交/AI 审核结果 |

---

## 六、核心竞争力

### 6.1 AI 离线容错

系统采用**逐层守卫 + 优雅降级**策略，确保 AI 模型不可用时所有功能仍可正常使用：

- **全局开关**: `AI_ENABLED` 环境变量一键关闭所有 AI 功能
- **API 层守卫**: 每个 AI action 入口先检查 AI 状态，未启用时返回明确的降级提示 + 史料检索结果
- **服务层 fallback**: 合并预览失败 → 基本规则合并；智能分类失败 → 快速规则分类；自动审核失败 → 静默跳过
- **UI 层兜底**: 前端捕获异常并显示用户友好的提示，不会白屏或报错

### 6.2 AI 双通道

本地 Ollama (qwen2.5:7b) 作为主模型，云端 Claude API 作为 fallback，兼顾**数据隐私**（敏感史料不上云）和**高可用性**（本地故障时自动切换）。

### 6.3 无外部数据库

所有数据以 JSON 文件存储，通过 `DataService<T>` 泛型类统一读写。优势：
- **零依赖部署**: 无需安装配置 MySQL/PostgreSQL/Redis
- **数据可携**: JSON 文件可直接备份、版本控制、手动编辑
- **软删除**: 所有删除操作仅标记 `isDeleted=true`，数据可恢复

### 6.4 史料全生命周期管理

从**导入 → 文本提取 → AI 摘要 → AI 分类 → 人工审核 → 智能合并 → 关联图谱 → 公众展示 → 导出**的完整闭环。

---

## 七、项目规模统计

| 维度 | 数量 |
|------|------|
| 前端页面 | 39 个 (20 前台 + 19 后台) |
| API 路由 | 30 个 |
| 服务库 | 27 个 TypeScript 文件 |
| 组件 | 35 个 (20 shared + 9 front + 4 admin + 2 root) |
| 类型定义 | 15 个实体接口 (1 文件) |
| JSON 数据集合 | 15 个 |
| 提取文本 | 86 个 txt 文件 |
| 上传文件 | 168 个 (A/B/C 三级) |
| TypeScript 错误 | 0 (strict mode) |
| ESLint 错误 | 0 |
| 构建产物 | 68 页 |
| npm 依赖 | 15 个生产依赖 + 12 个开发依赖 |
