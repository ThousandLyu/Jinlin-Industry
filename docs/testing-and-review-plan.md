# 金陵工脉 — 测试与审核方案

> 版本: 1.0 | 日期: 2026-05-04

---

## 1. 测试策略概览

### 1.1 测试金字塔

```
           ┌──────────┐
           │ 人工审核  │  ← 68 页逐页审核 + 数据完整性
           ├──────────┤
           │ E2E 测试  │  ← 关键用户流程 (Playwright)
           ├──────────┤
           │ 集成测试  │  ← API 路由 + 数据一致性
           ├──────────┤
           │ 单元测试  │  ← lib 层核心函数 (Vitest)
           ├──────────┤
           │ 静态检查  │  ← tsc + ESLint + next build
           └──────────┘
```

### 1.2 当前状态

| 检查项 | 状态 | 结果 |
|--------|------|------|
| TypeScript | 已配置 (strict mode) | 0 错误 |
| ESLint (next lint) | 已配置 (eslint-config-next) | 0 错误，1 预存 warning |
| Next.js Build | 每次提交可执行 | 68 页全部通过 |
| 项目健康检查 | `npm run doctor` | 可用 |
| 单元测试 | 未配置 | — |
| 集成测试 | 未配置 | — |
| E2E 测试 | 未配置 | — |

### 1.3 测试环境

| 环境 | 说明 |
|------|------|
| 开发环境 | Windows 11, Node.js 20+, PowerShell |
| 测试数据 | `data/` 目录已有 15 个 JSON 文件的真实数据 |
| AI 环境 | Ollama (qwen2.5:7b) 本地运行于 11434 端口 |
| 离线环境 | `AI_ENABLED=false` 模拟 AI 不可用 |

---

## 2. 静态检查（已到位）

### 2.1 TypeScript 类型检查

```bash
npx tsc --noEmit
```

**检查范围**: 所有 `src/**/*.ts` 和 `src/**/*.tsx` 文件
**当前结果**: 0 错误
**配置**: `tsconfig.json` — target es2017, strict true, path alias `@/*` → `./src/*`

### 2.2 ESLint

```bash
npm run lint
```

**配置**: `eslint-config-next` (Next.js 推荐配置)
**当前结果**: 0 错误
**预存 warning**: `src/components/front/SourceDetail.tsx` — `<img>` 应改用 `<Image>` (非阻塞)

### 2.3 Next.js 构建

```bash
npm run build
```

**检查内容**:
- 所有页面编译通过
- 静态/动态路由正确生成
- API 路由编译通过
- 无 `Can't resolve 'fs'` 等服务端模块泄漏到客户端
- 当前结果: 68 页全部通过

### 2.4 项目健康检查

```bash
npm run doctor
```

**检查内容**: Node.js 版本 / node_modules 完整性 / .env.local 存在 / data JSON 文件可解析 / uploads 目录存在 / import 目录存在

---

## 3. 单元测试方案

### 3.1 测试框架

**推荐**: Vitest (与 Vite/Next.js 生态兼容，速度优于 Jest)

```bash
npm install -D vitest @vitejs/plugin-react
```

**配置文件** `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

### 3.2 测试范围与用例

#### 3.2.1 `src/lib/dataService.ts` — DataService<T>

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-DS-01 | `getAll()` 返回未删除记录，排除 `isDeleted=true` | 正常 |
| UT-DS-02 | `getById()` 返回匹配 ID 的记录，不存在返回 null | 正常 |
| UT-DS-03 | `create()` 自动生成 UUID 和 ISO 时间戳 | 正常 |
| UT-DS-04 | `update()` 部分更新字段，保留 id 不变 | 正常 |
| UT-DS-05 | `delete()` 执行软删除，设置 `isDeleted=true` | 正常 |
| UT-DS-06 | `query()` 精确匹配多字段过滤 | 正常 |
| UT-DS-07 | `search()` 模糊搜索字符串和数字字段 | 正常 |
| UT-DS-08 | `getPaginated()` 分页极限值 (page=0, pageSize=200) | 边界 |
| UT-DS-09 | `all()` 返回含已删除的全部记录 | 正常 |
| UT-DS-10 | 空 JSON 文件不影响读取 (返回 `[]`) | 边界 |

#### 3.2.2 `src/lib/jsonUtils.ts` — parseLooseJsonObject

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-JS-01 | 标准 JSON 对象 `{"key":"value"}` → 正确解析 | 正常 |
| UT-JS-02 | 含 Markdown 代码块的 JSON → 正确解析 | 正常 |
| UT-JS-03 | ```` ```json {...} ``` ```` → 正确解析 | 正常 |
| UT-JS-04 | 嵌套 JSON 字符串 `{"outer":"{\"inner\":1}"}` → 不二次解析 | 边界 |
| UT-JS-05 | 非法 JSON `{key: value}` → 返回 null | 异常 |
| UT-JS-06 | 空字符串 `""` → 返回 null | 边界 |
| UT-JS-07 | 纯文本 `"hello world"` → 返回 null | 异常 |

#### 3.2.3 `src/lib/aiClient.ts` — 工具函数

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-AC-01 | `normalizeEntityType("person")` → `"person"` | 正常 |
| UT-AC-02 | `normalizeEntityType("人物")` → `"person"` | 正常 |
| UT-AC-03 | `normalizeEntityType("organization")` → `"organization"` | 正常 |
| UT-AC-04 | `normalizeEntityType("random")` → `"unknown"` | 边界 |
| UT-AC-05 | `stringifyField(null)` → `""` | 边界 |
| UT-AC-06 | `stringifyField(123)` → `"123"` | 正常 |
| UT-AC-07 | `normalizeArray(["a","b"])` → `["a","b"]` | 正常 |
| UT-AC-08 | `normalizeArray("a, b, c")` → `["a","b","c"]` | 正常 |
| UT-AC-09 | `normalizeUnitScore(0.85)` → `0.85` | 正常 |
| UT-AC-10 | `normalizeUnitScore(85)` → `0.85` (百分比归一化) | 正常 |

#### 3.2.4 `src/lib/mergeService.ts` — 合并服务

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-MS-01 | `calcTitleSimilarity("完全相同", "完全相同")` → `1.0` | 正常 |
| UT-MS-02 | `calcTitleSimilarity("永利铔厂", "永利铔厂建厂始末")` → `0.85` (包含关系) | 正常 |
| UT-MS-03 | `calcTitleSimilarity("甲乙丙", "丁戊己")` → `0.0` (无重叠) | 边界 |

#### 3.2.5 `src/lib/wordCloudUtils.ts` — 词云工具

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-WC-01 | `weightToColor(maxWeight, maxWeight)` → 最深色 | 正常 |
| UT-WC-02 | `weightToColor(0, maxWeight)` → 最浅色 | 边界 |
| UT-WC-03 | `sizeFromWeight(0, maxWeight)` → 最小字号 | 边界 |
| UT-WC-04 | `sizeFromWeight(maxWeight, maxWeight)` → 最大字号 | 正常 |

#### 3.2.6 `src/lib/auth.ts` — 鉴权

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-AU-01 | `checkAuth()` 携带正确 Cookie → `true` | 正常 |
| UT-AU-02 | `checkAuth()` 无 Cookie → `false` | 异常 |
| UT-AU-03 | `requireAuth()` 通过认证 → 返回 null | 正常 |
| UT-AU-04 | `requireAuth()` 未认证 → 返回 401 Response | 异常 |

#### 3.2.7 `src/lib/riskDetector.ts` — 风险检测

| 编号 | 测试用例 | 类型 |
|------|---------|------|
| UT-RD-01 | 含"第一"的文本 → 检测到风险词 | 正常 |
| UT-RD-02 | 含"首创"的文本 → 检测到风险词 | 正常 |
| UT-RD-03 | 无风险词的客观描述 → 返回空数组 | 正常 |
| UT-RD-04 | `assessRiskLevel([])` → `"low"` | 边界 |

### 3.3 执行

```bash
npx vitest run          # 单次执行
npx vitest              # watch 模式
npx vitest --coverage   # 覆盖率报告
```

---

## 4. 集成测试方案

### 4.1 API 路由测试

使用 Vitest + `node-mocks-http` 或直接通过 `fetch` 调用 Next.js 路由 handler。

#### 4.1.1 `/api/data` CRUD 流程

| 编号 | 测试用例 |
|------|---------|
| IT-DA-01 | GET `?type=sources` → 返回 200 + 数组 |
| IT-DA-02 | GET `?type=sources&paginated=true` → 返回分页结构 |
| IT-DA-03 | POST 创建新 source → 返回新记录含 UUID |
| IT-DA-04 | POST 更新 source → 返回更新后记录 |
| IT-DA-05 | POST 创建 fact (含风险词) → 自动填充 riskWords/riskLevel |
| IT-DA-06 | DELETE source → 级联清理 Link/Token/Ref |
| IT-DA-07 | GET 未登录 → 返回 401 |
| IT-DA-08 | GET `?type=invalid` → 返回 400 |

#### 4.1.2 `/api/search` 全站搜索

| 编号 | 测试用例 |
|------|---------|
| IT-SE-01 | GET `?q=范旭东` → 返回匹配 results |
| IT-SE-02 | GET `?q=不存在的关键词` → 返回空 results |
| IT-SE-03 | GET `?q=&includeBrief=1` → 返回空结果，aiBrief=null |
| IT-SE-04 | POST `{ question: "..." }` → 返回 answer + sources |

#### 4.1.3 `/api/ai` 鉴权和参数校验

| 编号 | 测试用例 |
|------|---------|
| IT-AI-01 | GET 未登录 → 401 |
| IT-AI-02 | POST 无效 action → 400 + "Unknown action" |
| IT-AI-03 | POST `action=test_connection` → 返回连接状态 |
| IT-AI-04 | POST `action=source_summary` 不带 id → 400 |

#### 4.1.4 `/api/admin/review` 审核流程

| 编号 | 测试用例 |
|------|---------|
| IT-RV-01 | GET `?status=pending` → 返回待审核列表 |
| IT-RV-02 | POST `{ action: "approve" }` → Source.reviewStatus → "approved" |
| IT-RV-03 | POST `{ action: "reject" }` → Source.reviewStatus → "rejected" |

#### 4.1.5 `/api/admin/merge` 合并流程

| 编号 | 测试用例 |
|------|---------|
| IT-MG-01 | GET `?sourceId=uuid` → 返回候选列表 |
| IT-MG-02 | POST `action=preview` → 返回合并预览 |
| IT-MG-03 | POST `action=execute` → 创建新 Source + 软删除旧记录 |

#### 4.1.6 `/api/export` 导出

| 编号 | 测试用例 |
|------|---------|
| IT-EX-01 | GET `?type=facts` → 返回 CSV (Content-Type: text/csv) |
| IT-EX-02 | GET `?type=sources` → 返回 CSV |
| IT-EX-03 | GET `?type=sources&format=zip` → 返回 ZIP |

#### 4.1.7 `/api/auth` 登录/登出

| 编号 | 测试用例 |
|------|---------|
| IT-AT-01 | POST 正确凭据 → 200 + Set-Cookie |
| IT-AT-02 | POST 错误凭据 → 401 |
| IT-AT-03 | GET 已登录 → `authenticated: true` |
| IT-AT-04 | DELETE 登出 → 清除 Cookie |

### 4.2 数据一致性测试

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| IT-DC-01 | 删除 Source → 所有关联 SourceLink 被软删除 | 查 sourceLinks.json |
| IT-DC-02 | 删除 Source → 所有关联 AiToken 被软删除 | 查 ai_tokens.json |
| IT-DC-03 | 删除 Source → Person.sourceIds 移除该 ID | 查 people.json |
| IT-DC-04 | 删除 Source → Site.sourceIds 移除该 ID | 查 sites.json |
| IT-DC-05 | 合并 Source → 新记录创建 + 旧记录软删除 | 查 sources.json |
| IT-DC-06 | 合并 Source → Link/Token 转移至新 ID | 查 sourceLinks.json, ai_tokens.json |
| IT-DC-07 | 导入文件 → reviewStatus='pending' | 查 sources.json |
| IT-DC-08 | 审核通过 → `(!reviewStatus \|\| reviewStatus==='approved')` 过滤正确 | 查 API 返回数据 |

### 4.3 鉴权测试

| 编号 | 测试用例 | 验证点 |
|------|---------|--------|
| IT-AR-01 | 未登录访问 `/admin/dashboard` → 302 重定向到 `/admin/login` | Middleware |
| IT-AR-02 | 未登录访问 `/api/data` → 401 JSON | requireAuth |
| IT-AR-03 | 未登录访问 `/api/search` → 200 (公开接口) | 无需鉴权 |
| IT-AR-04 | 未登录访问 `/api/wordcloud` → 200 (公开接口) | 无需鉴权 |
| IT-AR-05 | 未登录访问 `/api/graph` → 200 (公开接口) | 无需鉴权 |

---

## 5. E2E 测试方案

### 5.1 工具选择

**推荐**: Playwright (支持 Chromium/Firefox/WebKit 三浏览器)

```bash
npm install -D @playwright/test
npx playwright install
```

### 5.2 关键用户流程

#### 流程 1: 管理员导入 → 审核 → 发布

```
1. 管理员登录 (/admin/login)
2. 导航到史料库管理 (/admin/sources)
3. 导入目录中的文件 (POST /api/import/sources)
4. 验证新史料显示 reviewStatus='pending'
5. 导航到审核管理 (/admin/review)
6. 点击"批准"按钮
7. 验证史料 reviewStatus='approved'
8. 前台验证史料可见
```

#### 流程 2: 人物创建 → 查验 → 置顶 → 前台轮播

```
1. 管理员登录
2. 导航到人物管理 (/admin/people)
3. 创建新人物 (姓名/称谓/生平)
4. 设置查验状态为"已查验"
5. 勾选"前台置顶"
6. 保存
7. 前台 /people 页面验证该人物出现在轮播首位
```

#### 流程 3: 时间轴编辑 → 分类筛选 → 前台展示

```
1. 管理员登录
2. 导航到时间轴管理 (/admin/timeline)
3. 选择分类筛选 "军事工业"
4. 验证仅显示军事工业类别事件
5. 新建事件 (年份/标题/描述/分类)
6. 前台 /timeline 验证新事件出现，颜色正确
```

#### 流程 4: 访客浏览 → 搜索 → AI 问答 → 图谱浏览

```
1. 访问首页 (/)
2. 在词云点击某个关键词 → 跳转到搜索页
3. 搜索结果页显示匹配内容
4. 点击 AI 问答 → 返回带引用标记的回答
5. 点击图谱入口 → 知识图谱展示节点和连线
```

#### 流程 5: 访客浏览 (AI 离线场景)

```
1. 设置 AI_ENABLED=false
2. 访问首页 → 正常加载 (词云不受影响)
3. 搜索 → 返回结果 (无 AI 摘要)
4. AI 问答 → 返回 "AI 未启用" + 史料列表
5. 事实档案 → 正常显示 (无需 AI)
6. AI Studio → 提示 "AI 未启用"
```

### 5.3 离线场景测试矩阵

| 页面/功能 | AI_ENABLED=false 预期行为 |
|-----------|------------------------|
| 首页 | 统计数字 + 词云正常显示 |
| 搜索 (GET) | 返回匹配结果，aiBrief=null |
| 搜索 (POST question) | 返回 "AI 未启用" + 史料列表 |
| AI 问答 (deep) | 返回 "AI 未启用" + 史料列表 |
| 史料详情 | 正常显示 |
| 人物列表/详情 | 正常显示 |
| 史实档案 | 正常显示 |
| 时间轴 | 正常显示 |
| 知识图谱 | 正常显示 (无 AI 依赖) |
| 数字复原 | 正常显示 |
| AI Studio | 返回 "AI 未启用" |
| 史料导入 | 正常导入，AI 分类回退到规则 |
| 史料合并 | 预览回退到基本合并 |
| 自动审核 | 静默失败，史料保持 pending |

---

## 6. 人工审核清单

### 6.1 前端页面逐页审核 (68 页)

**审核维度**: 数据加载 / 空状态 / 响应式 / 交互功能

#### 前台页面 (19 页)

| # | 路由 | 页面 | 审核项 |
|---|------|------|--------|
| 1 | `/` | 首页 | 统计卡片数字正确，词云居中可交互，入口链接有效 |
| 2 | `/about` | 关于 | 项目介绍文本完整，无排版错误 |
| 3 | `/activities` | 活动记录 | 列表正常，筛选有效，空状态提示 |
| 4 | `/ai-studio` | AI Studio | 表单可用，提交返回结果，AI 离线提示正常 |
| 5 | `/compare` | 史料对比 | 功能可用 |
| 6 | `/courses` | 公益课程 | 列表正常，详情可查看 |
| 7 | `/explore` | 探索浏览 | 数据加载，筛选正常 |
| 8 | `/facts` | 史实档案 | 列表正常，A/B/C 标签+hover tooltip，空状态提示 |
| 9 | `/graph` | 知识图谱 | 力导向图渲染，节点可交互，低置信度虚线 |
| 10 | `/map` | 地图点位 | 底图加载，点位标注 |
| 11 | `/people` | 人物故事 | 轮播显示置顶人物 (≤5)，卡片排序正确 |
| 12 | `/people/[id]` | 人物详情 | 生平/成就/关联展示，空状态处理 |
| 13 | `/scenes` | 数字复原 | 列表正常，骨架屏加载 |
| 14 | `/scenes/[id]` | 复原详情 | 3D 模型加载，热点标注可点击 |
| 15 | `/search` | 全站搜索 | 搜索结果，AI 问答 (含引用)，信息链 |
| 16 | `/sites` | 企业遗址 | 列表正常，筛选有效 |
| 17 | `/sites/[slug]` | 遗址详情 | 信息完整，关联人物/史实 |
| 18 | `/sources/[id]` | 史料详情 | 元数据显示，文本可读 |
| 19 | `/submit-source` | 史料投稿 | 表单提交成功，AI 离线提示正常 |
| 20 | `/timeline` | 工业纪年 | 交互时间线，事件弹窗，分类颜色正确 |

#### 后台页面 (19 页)

| # | 路由 | 页面 | 审核项 |
|---|------|------|--------|
| 1 | `/admin/login` | 登录 | 登录成功/失败/超时/频率限制 |
| 2 | `/admin/register` | 注册 | 注册表单可用 |
| 3 | `/admin/dashboard` | 数据看板 | 统计数据正确，AiToken 面板 targetType 中文，无 [object Object] |
| 4 | `/admin/sources` | 史料库管理 | 列表/搜索/排序/分页正常，文件名去后缀显示，审核筛选 |
| 5 | `/admin/facts` | 史实核验 | 列表正常，无风险标签列，A/B/C 等级+hover，表单保存 |
| 6 | `/admin/submissions` | 投稿管理 | 列表正常，状态筛选，AI 审核结果展示 |
| 7 | `/admin/sites` | 遗址管理 | CRUD 正常，发布/推荐切换，地图关联 |
| 8 | `/admin/people` | 人物管理 | CRUD 正常，"未分类"标签，批量删除/通过，置顶 checkbox，★标识 |
| 9 | `/admin/timeline` | 时间轴管理 | CRUD + 7 分类筛选正常，AI 生成候选 |
| 10 | `/admin/map` | 地图点位管理 | CRUD 正常，坐标编辑 |
| 11 | `/admin/scenes` | 复原管理 | CRUD 正常，热点编辑 |
| 12 | `/admin/courses` | 课程管理 | CRUD + 发布管理 |
| 13 | `/admin/activities` | 活动管理 | CRUD + 媒体库选取照片 |
| 14 | `/admin/media` | 媒体库 | 上传/分类筛选/文件名排序，MediaPicker 弹窗 |
| 15 | `/admin/ai` | AI 检索测试 | 16 种 action 均可测试，返回结果正确 |
| 16 | `/admin/ai-tokens` | AI Token 管理 | 列表/搜索/编辑/重建 |
| 17 | `/admin/links` | 关联管理 | CRUD 正常，创建/审批/编辑 |
| 18 | `/admin/review` | 审核管理 | 筛选/审批正常，关联史料展示 |
| 19 | `/admin/settings` | 系统设置 | 配置保存生效 |

**通用审核项** (所有页面):
- 页面加载无白屏、无控制台报错
- 加载中状态显示 (Loading 文案或骨架屏)
- 空数据状态显示 (EmptyState 组件或 "暂无数据")
- 响应式布局: 桌面端 (1920px) / 平板端 (768px) / 移动端 (375px)

### 6.2 数据完整性审核

| # | 审核项 | 方法 |
|---|--------|------|
| 1 | 15 个 JSON 文件格式有效 | `node -e "const fs=require('fs');fs.readdirSync('./data').filter(f=>f.endsWith('.json')).forEach(f=>{try{JSON.parse(fs.readFileSync('./data/'+f,'utf8'));console.log('OK:',f)}catch(e){console.error('FAIL:',f,e.message)}})"` |
| 2 | SourceLink 引用完整性 | `GET /api/admin/orphans` → orphanLinks.count 应为 0 |
| 3 | AiToken 引用完整性 | `GET /api/admin/orphans` → orphanTokens.count 应为 0 |
| 4 | Person.sourceIds 有效性 | `GET /api/admin/orphans` → staleReferences.people.count 应为 0 |
| 5 | Site.sourceIds 有效性 | `GET /api/admin/orphans` → staleReferences.sites.count 应为 0 |
| 6 | 无 `[object Object]` 脏数据 | `node -e "const d=JSON.parse(require('fs').readFileSync('./data/ai_tokens.json','utf8'));d.forEach(t=>{const bad=[...t.keywords||[],...t.entities||[]].filter(k=>String(k)==='[object Object]');if(bad.length) console.log('BAD:',t.id,bad)})"` |
| 7 | AiToken 摘要字数 ≤ 2000 | 抽查 recent sources 的 aiSummary 字段 |

### 6.3 AI 功能审核

| # | 审核项 | 方法 |
|---|--------|------|
| 1 | 连接测试 | `/api/ai` `action=test_connection` → success=true, latencyMs<5000 |
| 2 | 史料问答 | 提问"金陵机器局创办于哪一年" → 返回含 [S1] 引用标记的回答 |
| 3 | 深度分析 | `/api/search` mode=deep → 返回 summary/keywords/entities/evidence |
| 4 | 史料解析 | `action=source_parse` → 返回 keywords/entities/tags/traits |
| 5 | 史料分类 | `action=source_classify` → 返回分类合理 |
| 6 | 关联推荐 | `action=source_recommend` → 返回候选列表 |
| 7 | 投稿审核 | `action=submission_review` → 返回 AI 审核结果 |
| 8 | 创意写作 | `action=creative_writing` → 返回 title/content/references |
| 9 | 时间轴候选 | `action=organize_timeline` → 返回新事件列表 |
| 10 | 实体描述 | `action=generate_description` → 返回描述+分类 |
| 11 | 返回格式 | 所有 AI 响应的 JSON 格式正确，无 `[object Object]` |
| 12 | 摘要字数 | 长文本摘要 ≤ 2000 字 |

---

## 7. 性能审核

### 7.1 构建产物分析

```bash
npm run build
```

关注 `.next` 输出中各页面的大小:
- 首页: 应 < 200KB (含词云懒加载)
- 3D 页面 (scenes): Three.js 按需加载
- 管理后台: 允许较大 (无需 SEO 优化)

### 7.2 首屏加载

使用 Lighthouse 或 Chrome DevTools 审核首页:
- Performance 评分 ≥ 80
- FCP (First Contentful Paint) < 2s
- LCP (Largest Contentful Paint) < 3s

### 7.3 API 响应时间

| 接口 | 目标 P95 |
|------|---------|
| `/api/search?q=...` | < 500ms |
| `/api/wordcloud` | < 1s |
| `/api/graph` | < 1s |
| `/api/data?type=sources` | < 200ms |
| `/api/ai action=test_connection` | < 5s |
| `/api/export` (CSV) | < 2s |
| `/api/backup` (ZIP) | < 30s |

### 7.4 数据文件大小监控

| 文件 | 当前状态 | 关注阈值 |
|------|---------|---------|
| sources.json | ~84 条 | > 500 条考虑索引优化 |
| ai_tokens.json | | > 1000 条考虑清理归档的 token |
| source_text/*.txt | 86 个 | 每个 ≤ 500KB |

---

## 8. 安全审核

### 8.1 鉴权覆盖

| 检查点 | 实现 |
|--------|------|
| Middleware 路由守卫 | `src/middleware.ts` — 拦截所有 `/admin/*` (除 login/register) |
| API 二次鉴权 | 每个需登录的 API 路由调用 `requireAuth(request)` |
| Cookie 安全 | HttpOnly + SameSite=Strict + Max-Age=86400 |
| 登录频率限制 | 15 分钟内最多 5 次失败 |
| 登录超时控制 | 15 秒超时 |

### 8.2 输入校验

| 检查点 | 现状 | 建议 |
|--------|------|------|
| API 参数类型 | 基本校验 (typeof 检查) | 建议增加 Zod schema 校验 |
| 文件上传 | 无类型白名单 | 建议限制允许的 MIME 类型 |
| 用户输入 | React 默认转义 | 需关注 dangerouslySetInnerHTML 使用 |
| SQL 注入 | 无 SQL 数据库，风险低 | — |

### 8.3 XSS 防护

- React 默认 JSX 转义
- 无 `dangerouslySetInnerHTML` 使用 (需确认)
- 用户提交的投稿内容在前端渲染时安全

### 8.4 文件上传安全

- 上传目录: `public/uploads/{images,courses,documents,scenes}`
- 文件名: 时间戳+随机字符串，避免路径穿越
- 建议增加: 文件类型白名单校验、文件大小上限

### 8.5 依赖安全

```bash
npm audit
```

定期检查并更新有已知漏洞的依赖。

---

## 9. 测试执行计划

| 阶段 | 内容 | 工具 | 预估工时 | 状态 |
|------|------|------|---------|------|
| P0 | 静态检查 | tsc + ESLint + next build | 0.5h | 已完成 |
| P0 | 项目健康检查 | npm run doctor | 0.5h | 已完成 |
| P1 | lib 层单元测试 | Vitest (28 用例) | 4h | 待执行 |
| P2 | API 路由集成测试 | Vitest + fetch (25+ 用例) | 6h | 待执行 |
| P2 | 数据一致性测试 | API 调用 + JSON 文件校验 (8 用例) | 2h | 待执行 |
| P3 | E2E 关键流程 | Playwright (5 流程) | 4h | 待执行 |
| P4 | 人工页面审核 | 68 页逐页检查 | 8h | 待执行 |
| P4 | 数据完整性审核 | /api/admin/orphans + JSON 校验 | 2h | 待执行 |
| P4 | AI 功能审核 | 12 项 action 测试 | 2h | 待执行 |
| P5 | 性能审计 | Lighthouse + 手动测试 | 2h | 待执行 |
| P5 | 安全审计 | 鉴权 + 输入校验 + npm audit | 1h | 待执行 |

**总计**: ~32 工时

---

## 10. CI/CD 集成建议

### 10.1 推荐流水线

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --legacy-peer-deps
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run           # 单元测试
      - run: npm run build
      # - run: npx playwright test    # E2E (可选，需启动服务)
```

### 10.2 本地 pre-commit hook

```bash
# .husky/pre-commit
npx tsc --noEmit
npm run lint
```

---

## 附录 A: 测试数据准备

### A.1 测试用 JSON 数据

- 使用 `seed.ts` 生成初始测试数据
- 备份当前 `data/` 目录到 `data/backups/` 后再进行测试
- 测试完成后恢复备份

### A.2 AI 测试配置

- 本地: `AI_ENABLED=true`, `AI_BASE_URL=http://localhost:11434/v1`
- 离线模拟: `AI_ENABLED=false`
- 云端 fallback 测试: 配置 `CLOUD_AI_*` 并断开本地 Ollama

### A.3 测试账号

- 默认管理员: 从 `.env.local` 的 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 读取
- 测试账号: 通过 `/api/register` 创建专用测试账号

---

## 附录 B: 审核报告模板

```markdown
## 审核报告 — {日期}

### 审核人: {姓名}
### 审核范围: {全站 / 模块名}
### 环境: {开发环境 / 生产构建}

### 发现的问题

| # | 严重程度 | 页面/接口 | 描述 | 状态 |
|---|---------|----------|------|------|
| 1 | 高/中/低 | /path | 问题描述 | 待修复/已修复 |

### 静态检查
- tsc: {0 错误 / N 错误}
- lint: {0 错误 / N 错误}
- build: {通过 / 失败}

### 审核结论
- [ ] 通过 — 可以发布
- [ ] 有条件通过 — 修复 P0/P1 问题后可发布
- [ ] 不通过 — 存在阻塞性问题
```
