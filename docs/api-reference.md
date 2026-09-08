# 金陵工脉 — API 接口说明

> 版本: 1.0 | 日期: 2026-05-04 | 接口总数: 30

---

## 1. 概述

### 1.1 基础信息

| 属性 | 说明 |
|------|------|
| Base URL | `/api` |
| 协议 | HTTP/1.1 |
| 数据格式 | JSON (请求/响应均为 `application/json`) |
| 字符编码 | UTF-8 |
| 鉴权方式 | Cookie `admin_token=authenticated` |
| 鉴权范围 | 除 `/api/auth`、`/api/register`、`/api/submissions/source`、`/api/search`、`/api/wordcloud`、`/api/graph`、`/api/explore`、`/api/links/chain` 外，其余接口均需登录 |

### 1.2 通用响应格式

**成功响应**:
```json
{
  "success": true,
  // ... 具体数据字段
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息 (可选)"
}
```

**鉴权失败**:
```json
{
  "success": false,
  "message": "Unauthorized. Please log in to the admin panel."
}
```
HTTP 状态码: 401

### 1.3 分页格式

使用分页的接口统一返回:
```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### 1.4 AI 离线响应

当 AI 未启用时，AI 相关接口返回:
```json
{
  "success": false,
  "enabled": false,
  "message": "AI 未启用，...降级说明..."
}
```

---

## 2. 数据 CRUD — `/api/data`

所有数据集合的通用 CRUD 接口。

### GET — 查询数据

```
GET /api/data?type={type}&paginated=true&page=1&pageSize=20&sortField=createdAt&sortDir=desc&category=web
```

**鉴权**: 需要登录

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 数据类型: sources/sites/people/facts/timeline/mapPoints/scenes/courses/activities/media/settings/users/sourceSubmissions/aiTokens/sourceLinks |
| paginated | string | 否 | 是否分页: 'true' 启用 |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20，最大 100 |
| sortField | string | 否 | 排序字段 |
| sortDir | string | 否 | 排序方向: 'asc'/'desc' |
| category | string | 否 | 分类筛选 (仅 media 类型有效) |

**成功响应** (列表模式):
```json
[
  { "id": "uuid", "title": "...", ... }
]
```

**成功响应** (分页模式):
```json
{
  "items": [{ "id": "uuid", ... }],
  "total": 84,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### POST — 创建/更新数据

```
POST /api/data
Content-Type: application/json

{
  "type": "sources",
  "id": "uuid (可选，有则更新)",
  "data": { ... 实体字段 ... }
}
```

**鉴权**: 需要登录

**特殊逻辑**:
- `type=facts`: 自动检测风险词 (riskWords) 和风险等级 (riskLevel)。发布或审核通过时校验 sourceIds 的等级。传 `skipRiskAuto: true` 跳过自动风险检测。
- 不传 `id`: 创建新记录，自动生成 UUID 和时间戳
- 传 `id`: 更新已有记录

**成功响应**:
```json
{ "id": "uuid", "title": "...", "createdAt": "...", ... }
```

**错误响应** (发布校验失败):
```json
{ "error": "发布失败: 关联史料中无 A/B 级来源" }
```
HTTP 状态码: 400

### DELETE — 软删除数据

```
DELETE /api/data
Content-Type: application/json

{ "type": "sources", "id": "uuid" }
```

**鉴权**: 需要登录

**级联删除** (仅 `type=sources`):
删除史料时自动清理:
1. 所有关联 SourceLink (sourceId 或 targetId 匹配)
2. 所有关联 AiToken (targetType='source' 且 targetId 匹配)
3. Person.sourceIds 中移除该 ID
4. Site.sourceIds 中移除该 ID

**成功响应**:
```json
{ "success": true }
```

**成功响应** (含级联信息):
```json
{
  "success": true,
  "cascadeInfo": { "orphanLinks": 3, "orphanTokens": 1, "cleanedRefs": 5 }
}
```

---

## 3. AI 服务 — `/api/ai`

统一 AI 操作入口，通过 `action` 参数区分操作。

### GET — AI 状态检测

```
GET /api/ai
```

**鉴权**: 需要登录

**成功响应**:
```json
{
  "success": true,
  "enabled": true,
  "model": "qwen2.5:7b",
  "baseUrl": "http://localhost:11434/v1",
  "checkedAt": "2026-05-04T10:00:00.000Z"
}
```

### POST — AI 操作

```
POST /api/ai
Content-Type: application/json

{ "action": "ask", "text": "问题文本", ... }
```

**鉴权**: 需要登录

**action 列表**:

| action | 说明 | 额外参数 | AI 依赖 |
|--------|------|---------|---------|
| ask | 史料问答 | limit (返回条数) | 是，离线时返回史料检索结果 |
| search_sources | 史料检索 | limit | 否 |
| summary | 文本摘要 | - | 是 |
| exhibition | 展陈文案 | - | 是 |
| risk_check | 风险词检查 | - | 是 |
| test_connection | 连接测试 | - | 是 |
| source_summary | 史料摘要生成 | id (史料 ID) | 是 |
| source_parse | 史料解析 | id, title, fileType, grade | 是 |
| source_classify | 史料分类 | id, title, description | 是 |
| source_recommend | 关联推荐 | query | 是 |
| submission_review | 投稿 AI 审核 | id | 是 |
| aitoken_rebuild | 重建 AiToken | targetType, targetId | 是 |
| aitoken_search | 搜索 AiToken | q (搜索词), limit | 否 |
| creative_writing | 创意写作 | topic, targetType, style, length | 是 |
| organize_timeline | 生成时间轴候选 | - | 是 |
| generate_description | 生成实体描述 | name, entityType | 是 |

**通用请求体**:
```json
{
  "action": "ask",
  "text": "金陵机器局创办于哪一年？"
}
```

**action=test_connection 响应**:
```json
{
  "success": true,
  "enabled": true,
  "ready": true,
  "model": "qwen2.5:7b",
  "baseUrl": "http://localhost:11434/v1",
  "checkedAt": "2026-05-04T10:00:00.000Z",
  "latencyMs": 342,
  "result": "连接正常",
  "message": "AI 连接正常。"
}
```

**action=source_summary 请求**:
```json
{
  "action": "source_summary",
  "id": "source-uuid"
}
```

**action=source_summary 响应**:
```json
{
  "success": true,
  "item": { ... 更新后的 Source 对象 },
  "result": {
    "summary": "AI 生成的摘要文本",
    "keywords": ["关键词1", "关键词2"],
    "entities": ["实体1", "实体2"]
  },
  "token": { ... AiToken 对象 }
}
```

**action=creative_writing 请求**:
```json
{
  "action": "creative_writing",
  "topic": "永利铔厂",
  "targetType": "企业遗址",
  "style": "展厅导览词",
  "length": "短文"
}
```

**action=organize_timeline 响应**:
```json
{
  "success": true,
  "enabled": true,
  "created": [{ ... 新创建的时间轴事件 }],
  "skipped": 3
}
```

**action=generate_description 请求**:
```json
{
  "action": "generate_description",
  "name": "范旭东",
  "entityType": "person"
}
```

**action=generate_description 响应**:
```json
{
  "success": true,
  "enabled": true,
  "description": "...",
  "entityType": "person",
  "category": "企业家",
  "birthYear": "1883",
  "deathYear": "1945",
  "relatedSiteId": "site-uuid",
  "relatedSiteName": "永利铔厂",
  "missingFields": [],
  "sourceCount": 5,
  "sources": [...]
}
```

---

## 4. AI 子服务

### 4.1 `/api/ai/status` — AI 详细状态

```
GET /api/ai/status
```

**鉴权**: 需要登录

### 4.2 `/api/ai/queue` — AI 任务队列

```
GET /api/ai/queue     — 查看队列
POST /api/ai/queue    — 添加任务
```

**鉴权**: 需要登录

### 4.3 `/api/ai/conflict-detect` — 冲突检测

```
POST /api/ai/conflict-detect
```

**鉴权**: 需要登录

### 4.4 `/api/ai/semantic-search` — 语义搜索

```
POST /api/ai/semantic-search
```

**鉴权**: 需要登录

### 4.5 `/api/ai/smart-link` — 智能关联

```
POST /api/ai/smart-link
```

**鉴权**: 需要登录

### 4.6 `/api/ai/summary-stats` — AI 摘要统计

```
GET /api/ai/summary-stats
```

**鉴权**: 需要登录

---

## 5. 搜索 — `/api/search`

### GET — 全站搜索

```
GET /api/search?q=范旭东&includeBrief=1
```

**鉴权**: 无需登录

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| includeBrief | string | 否 | 是否生成 AI 摘要: '1' 启用 |

**搜索范围**: sites, people, facts, timeline, sources, scenes, courses, activities (8 类数据)

**响应**:
```json
{
  "keyword": "范旭东",
  "results": [
    {
      "id": "uuid",
      "type": "person",
      "typeLabel": "人物故事",
      "title": "范旭东",
      "subtitle": "近代化工实业家",
      "url": "/people#uuid",
      "snippet": "范旭东（1883-1945）..."
    }
  ],
  "total": 12,
  "aiBrief": "一句话摘要...",
  "aiBriefStatus": "success"
}
```

aiBriefStatus 可能值: `success` | `disabled` | `no_sources` | `timeout` | `failed`

### POST — AI 问答/深度分析

```
POST /api/search
Content-Type: application/json

{ "question": "...", "mode": "deep" }
```

**鉴权**: 无需登录

**请求体**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | string | 是 | 问题文本 |
| mode | string | 否 | 'deep' 启用深度分析（含 AiToken 上下文） |

**mode=default 响应**:
```json
{
  "aiEnabled": true,
  "answer": "AI 回答（含 [S1] 引用标记）...",
  "sources": [...]
}
```

**mode=deep 响应**:
```json
{
  "success": true,
  "enabled": true,
  "summary": "...",
  "keywords": [],
  "entities": [],
  "analysis": "...",
  "confidence": 0.85,
  "evidence": [
    { "sourceId": "...", "title": "...", "quote": "...", "ref": "S1" }
  ],
  "sources": [...]
}
```

---

## 6. 导出 — `/api/export`

### GET — 导出数据

```
GET /api/export?type=facts
GET /api/export?type=sources&ids=id1,id2
GET /api/export?type=sources&format=zip&ids=id1,id2
```

**鉴权**: 需要登录

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 'facts' 或 'sources' |
| format | string | 否 | 'zip' 导出 ZIP 包 |
| ids | string | 否 | 逗号分隔的史料 ID，为空则导出全部 |

**type=facts 响应**: CSV 文件下载 (Content-Type: text/csv)，包含字段: id/标题/史实正文/公开展示/风险词/风险等级/审核状态/发布状态/分类

**type=sources 响应**: CSV 文件下载，包含字段: id/标题/类型/文件类型/作者/出版者/出版日期/可信度等级/分类/AI可读/提取状态/文本字数/简述

**type=sources&format=zip 响应**: ZIP 文件下载，包含:
- `sources.csv` — 史料台账
- `texts/*.txt` — AI 可读文本
- `summaries/*.md` — 摘要
- `files/*` — 原始文件
- `references.md` — 参考文献列表

---

## 7. 审核管理 — `/api/admin/review`

### GET — 审核列表

```
GET /api/admin/review?status=pending
```

**鉴权**: 需要登录

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 'pending'/'approved'/'rejected'/'all'，默认 'pending' |

**响应**:
```json
{
  "success": true,
  "items": [{ ... Source 对象 (含 relatedDetails) }],
  "counts": { "pending": 5, "approved": 70, "rejected": 2 }
}
```

### POST — 审批操作

```
POST /api/admin/review
Content-Type: application/json

{ "id": "source-uuid", "action": "approve", "reviewedBy": "admin", "note": "审核备注" }
```

**鉴权**: 需要登录

**请求体**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 史料 ID |
| action | string | 是 | 'approve' 或 'reject' |
| reviewedBy | string | 否 | 审核人，默认 'admin' |
| note | string | 否 | 审核备注 (追加到 reviewReason) |

**响应**:
```json
{ "success": true, "item": { ... 更新后的 Source 对象 } }
```

---

## 8. 合并管理 — `/api/admin/merge`

### GET — 查找合并候选

```
GET /api/admin/merge?sourceId=source-uuid
```

**鉴权**: 需要登录

**响应**:
```json
{
  "success": true,
  "candidates": [
    {
      "source1": { ... Source },
      "source2": { ... Source },
      "similarity": 0.92,
      "hashDuplicate": false,
      "mergedTitle": "",
      "mergedSummary": "",
      "conflictItems": []
    }
  ]
}
```

### POST — 预览/执行合并

```
POST /api/admin/merge
Content-Type: application/json

{ "action": "preview", "sourceId1": "uuid1", "sourceId2": "uuid2" }
```

**鉴权**: 需要登录

**请求体 (preview)**:
```json
{
  "action": "preview",
  "sourceId1": "uuid1",
  "sourceId2": "uuid2"
}
```

**请求体 (execute)**:
```json
{
  "action": "execute",
  "sourceId1": "uuid1",
  "sourceId2": "uuid2",
  "approvedBy": "admin"
}
```

**preview 响应**:
```json
{
  "success": true,
  "preview": {
    "similarity": 0.92,
    "mergedTitle": "合并后标题",
    "mergedSummary": "合并后摘要",
    "conflictItems": ["冲突项"]
  }
}
```

**execute 响应**:
```json
{
  "success": true,
  "mergeResult": {
    "newSource": { ... 新创建的 Source },
    "oldSourceIds": ["uuid1", "uuid2"],
    "transferredLinks": 3,
    "transferredTokens": 1
  }
}
```

---

## 9. 孤数据管理 — `/api/admin/orphans`

### GET — 扫描孤数据

```
GET /api/admin/orphans
```

**鉴权**: 需要登录

**响应**:
```json
{
  "success": true,
  "orphanLinks": { "count": 3, "items": [...] },
  "orphanTokens": { "count": 1, "items": [...] },
  "staleReferences": {
    "people": { "count": 2, "items": [...] },
    "sites": { "count": 1, "items": [...] }
  },
  "totalOrphans": 7
}
```

### POST — 一键清理

```
POST /api/admin/orphans
```

**鉴权**: 需要登录

**响应**:
```json
{
  "success": true,
  "cleaned": { "orphanLinks": 3, "orphanTokens": 1, "staleRefs": 3 }
}
```

---

## 10. 史料关联 — `/api/links`

### GET — 获取所有关联

```
GET /api/links
```

**鉴权**: 需要登录

**响应**:
```json
{ "success": true, "links": [{ ... SourceLink }] }
```

### POST — 管理关联

```
POST /api/links
Content-Type: application/json

{ "action": "create", "sourceId": "...", "targetId": "...", "relationType": "related", ... }
```

**鉴权**: 需要登录

**action**:

| action | 说明 | 参数 |
|--------|------|------|
| create | 创建关联 | sourceId, targetId, relationType, confidence, aiReason |
| approve | 批准关联 | id |
| reject | 拒绝关联 | id |
| edit | 编辑关联 | id + 更新字段 |

### DELETE — 删除关联

```
DELETE /api/links?id=link-uuid
```

**鉴权**: 需要登录

### `/api/links/chain` — 获取关联链

```
GET /api/links/chain?q=范旭东&maxDepth=3&maxItems=10
```

**鉴权**: 无需登录

**流程**: 语义搜索入口 → BFS 展开关联网络 → 补充节点摘要 → AI 生成讲解

**响应**:
```json
{
  "success": true,
  "chain": { "nodes": [...], "edges": [...], "entryIds": [...] },
  "narrative": "AI 生成的叙事讲解...",
  "nodeSummaries": [{ "id": "...", "title": "...", "summary": "...", ... }],
  "entrySources": [...]
}
```

### `/api/links/discover` — 发现新关联

```
POST /api/links/discover
```

**鉴权**: 需要登录

---

## 11. 知识图谱 — `/api/graph`

### GET — 获取图谱数据

```
GET /api/graph
```

**鉴权**: 无需登录

**数据来源**: SourceLink + Person.sourceIds/siteIds + Site.sourceIds

**节点限制**: sources ≤ 80, people ≤ 30, sites ≤ 30

**响应**:
```json
{
  "success": true,
  "nodes": [
    { "id": "uuid", "label": "史料标题", "type": "source", "subtitle": "A级 · 化工", "href": "/sources/uuid" },
    { "id": "uuid", "label": "人物名", "type": "person", "subtitle": "实业家", "href": "/people/uuid" },
    { "id": "uuid", "label": "遗址名", "type": "site", "subtitle": "化工", "href": "/sites/slug" }
  ],
  "edges": [
    { "source": "id1", "target": "id2", "label": "引用", "confidence": 1.0 }
  ]
}
```

---

## 12. 探索浏览 — `/api/explore`

### GET — 获取探索数据

```
GET /api/explore
```

**鉴权**: 无需登录

**过滤**: 仅返回 `reviewStatus` 为 `approved` 或无 reviewStatus 的已发布内容。

---

## 13. 词云 — `/api/wordcloud`

### GET — 获取词云数据

```
GET /api/wordcloud
```

**鉴权**: 无需登录

**权重公式**: linkWeight × 0.5 + tokenWeight × 0.3 + crossRefWeight × 0.2

**响应**:
```json
{
  "success": true,
  "words": [
    {
      "text": "永利铔厂",
      "size": 48,
      "weight": 45.2,
      "type": "keyword",
      "relatedSources": [
        { "id": "...", "title": "...", "grade": "A", "count": 5 }
      ],
      "totalRelated": 12
    }
  ],
  "maxWeight": 45.2
}
```

---

## 14. 认证 — `/api/auth`

### GET — 检查登录状态

```
GET /api/auth
```

**鉴权**: 无需登录

**响应 (已登录)**:
```json
{
  "authenticated": true,
  "username": "admin",
  "role": "admin",
  "name": "管理员",
  "gender": "male",
  "phone": "...",
  "email": "..."
}
```

**响应 (未登录)**:
```json
{ "authenticated": false }
```

### POST — 登录

```
POST /api/auth
Content-Type: application/json

{ "username": "admin", "password": "***" }
```

**鉴权**: 无需登录

**频率限制**: 同一用户名 15 分钟内最多 5 次失败尝试，超过返回 429

**超时控制**: 15 秒

**成功响应** (Set-Cookie 包含 admin_token 和 admin_user):
```json
{ "success": true, "message": "Login successful" }
```

**错误响应 (401)**:
```json
{ "success": false, "message": "Invalid username or password" }
```

**错误响应 (429)**:
```json
{ "success": false, "message": "登录失败次数过多，请 15 分钟后再试" }
```

**错误响应 (504)**:
```json
{ "success": false, "message": "登录验证超时，请稍后重试" }
```

### DELETE — 登出

```
DELETE /api/auth
```

**鉴权**: 无需登录

**响应**: 清除 Cookie，返回 `{ "success": true }`

---

## 15. 注册 — `/api/register`

### POST — 管理员注册

```
POST /api/register
Content-Type: application/json

{
  "username": "admin",
  "password": "***",
  "role": "admin",
  "name": "管理员",
  "gender": "male",
  "phone": "...",
  "email": "...",
  "adminKey": "注册密钥"
}
```

**鉴权**: 无需登录 (需要 adminKey 校验)

**限制**: 仅允许 `role=admin` 注册，前台用户注册已关闭

**响应**:
```json
{
  "success": true,
  "account": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "name": "管理员",
    "phone": "...",
    "email": "..."
  }
}
```

---

## 16. 文件上传 — `/api/upload`

### POST — 上传文件

```
POST /api/upload?type=images
Content-Type: multipart/form-data

file: <binary>
```

**鉴权**: 需要登录

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 上传目录: images/documents/courses/scenes，默认 images |

**响应**:
```json
{
  "success": true,
  "url": "/uploads/images/1714800000-abc123.jpg",
  "fileName": "1714800000-abc123.jpg",
  "originalName": "photo.jpg",
  "media": { ... MediaFile 对象 }
}
```

---

## 17. 史料导入

### 17.1 `/api/import/sources` — 目录批量导入

```
POST /api/import/sources
Content-Type: application/json

{ "importedBy": "admin" }
```

**鉴权**: 需要登录

**导入目录结构**:
```
{sourceImportDir}/
  A/ → 图片/文档 (A 级可信度)
  B/ → 图片/文档 (B 级可信度)
  C/ → 图片/文档 (C 级可信度)
```

**响应**:
```json
{
  "success": true,
  "baseDir": "/path/to/imports/sources",
  "imported": 10,
  "skipped": 2,
  "errors": [{ "file": "...", "message": "..." }],
  "items": [{ "title": "...", "grade": "A", "fileType": "pdf", "fileSize": 12345, "fileUrl": "/uploads/sources/A/..." }],
  "duplicatesFound": [{ "title": "...", "existingTitle": "...", "existingId": "...", "reason": "exact_hash" }],
  "processingStats": { "classified": 10, "summarized": 8, "linked": 0 },
  "pendingReview": 10
}
```

### 17.2 `/api/import/sources/file` — 单文件导入

```
POST /api/import/sources/file
Content-Type: multipart/form-data

file: <binary>
```

**鉴权**: 需要登录

---

## 18. 史料维护 — `/api/sources/maintenance`

### POST — 批量维护

```
POST /api/sources/maintenance
Content-Type: application/json

{ "action": "extract_and_summary", "ids": ["uuid1", "uuid2"] }
```

**鉴权**: 需要登录

**action**:

| action | 说明 |
|--------|------|
| extract | 重试文本提取 |
| summary | 重试摘要生成 |
| extract_and_summary | 先提取再摘要 |

**响应**:
```json
{
  "success": true,
  "count": 2,
  "items": [{ ... 更新后的 Source }]
}
```

---

## 19. 投稿 — `/api/submissions/source`

### POST — 公众史料投稿

```
POST /api/submissions/source
Content-Type: application/json

{
  "name": "张三",
  "contact": "13800000000",
  "title": "永利铔厂建厂始末",
  "content": "详细史料内容...",
  "source": "南京档案馆藏档案",
  "fileUrl": "/uploads/..."
}
```

**鉴权**: 无需登录

**AI 自动审核**: AI 启用时，提交后自动触发 AI 审核 (fire-and-forget)，填充 aiReviewStatus/aiReviewSummary/aiKeywords/aiEntities/confidenceScore/doubts 等字段

**响应**:
```json
{
  "success": true,
  "item": { ... SourceSubmission 对象 }
}
```

---

## 20. AI Tokens — `/api/ai-tokens`

### GET — 查询

```
GET /api/ai-tokens
GET /api/ai-tokens?id=token-uuid
GET /api/ai-tokens?q=搜索词&targetType=source
```

**鉴权**: 需要登录

### POST — 更新/重建

```
POST /api/ai-tokens
Content-Type: application/json

{ "action": "rebuild", "targetType": "source", "targetId": "uuid" }
// 或
{ "id": "token-uuid", "data": { "summary": "手动修改的摘要" } }
```

**鉴权**: 需要登录

### DELETE — 删除

```
DELETE /api/ai-tokens
Content-Type: application/json

{ "id": "token-uuid" }
```

**鉴权**: 需要登录

---

## 21. AI Studio — `/api/ai-studio`

### POST — 创意写作

```
POST /api/ai-studio
Content-Type: application/json

{
  "topic": "永利铔厂的创立与发展",
  "targetType": "企业遗址",
  "style": "展厅导览词",
  "length": "短文"
}
```

**鉴权**: 无需登录

**AI 离线时**: 返回史料检索结果 + "AI 未启用"消息

**响应**:
```json
{
  "success": true,
  "enabled": true,
  "title": "永利铔厂：中国化学工业的摇篮",
  "content": "正文文本...",
  "references": "[S1] 永利铔厂史料｜可信等级：A｜类型：archive｜文件：永利铔厂建厂始末.pdf",
  "sources": [...]
}
```

---

## 22. 备份 — `/api/backup`

### POST — 创建备份

```
POST /api/backup
```

**鉴权**: 需要登录

**备份内容**: `data/` 目录 (排除 backups 子目录) + `public/uploads/` 目录

**响应**:
```json
{
  "success": true,
  "message": "备份成功",
  "backupName": "jinling-backup-2026-05-04T10-00-00-000Z",
  "path": "data/backups/jinling-backup-2026-05-04T10-00-00-000Z.zip"
}
```

---

## 附录: 接口速查表

| # | 路由 | 方法 | 鉴权 | 说明 |
|---|------|------|------|------|
| 1 | `/api/data` | GET | 是 | 数据查询 |
| 2 | `/api/data` | POST | 是 | 数据创建/更新 |
| 3 | `/api/data` | DELETE | 是 | 数据软删除 (Source 含级联) |
| 4 | `/api/ai` | GET | 是 | AI 状态检测 |
| 5 | `/api/ai` | POST | 是 | AI 操作 (16 种 action) |
| 6 | `/api/ai/status` | GET | 是 | AI 详细状态 |
| 7 | `/api/ai/queue` | GET/POST | 是 | AI 任务队列 |
| 8 | `/api/ai/conflict-detect` | POST | 是 | 冲突检测 |
| 9 | `/api/ai/semantic-search` | POST | 是 | 语义搜索 |
| 10 | `/api/ai/smart-link` | POST | 是 | 智能关联 |
| 11 | `/api/ai/summary-stats` | GET | 是 | AI 摘要统计 |
| 12 | `/api/search` | GET/POST | 否 | 全站搜索 + AI 问答 |
| 13 | `/api/export` | GET | 是 | CSV/ZIP 导出 |
| 14 | `/api/admin/review` | GET/POST | 是 | 审核管理 |
| 15 | `/api/admin/merge` | GET/POST | 是 | 合并管理 |
| 16 | `/api/admin/orphans` | GET/POST | 是 | 孤数据扫描/清理 |
| 17 | `/api/links` | GET/POST/DELETE | 是 | 史料关联 CRUD |
| 18 | `/api/links/chain` | GET | 否 | 关联链查询 |
| 19 | `/api/links/discover` | POST | 是 | 发现新关联 |
| 20 | `/api/graph` | GET | 否 | 知识图谱数据 |
| 21 | `/api/explore` | GET | 否 | 探索浏览数据 |
| 22 | `/api/wordcloud` | GET | 否 | 词云数据 |
| 23 | `/api/auth` | GET/POST/DELETE | 否 | 认证 (登录/状态/登出) |
| 24 | `/api/register` | POST | 否 | 管理员注册 |
| 25 | `/api/upload` | POST | 是 | 文件上传 |
| 26 | `/api/import/sources` | POST | 是 | 目录批量导入 |
| 27 | `/api/import/sources/file` | POST | 是 | 单文件导入 |
| 28 | `/api/sources/maintenance` | POST | 是 | 史料批量维护 |
| 29 | `/api/submissions/source` | POST | 否 | 公众投稿 |
| 30 | `/api/ai-tokens` | GET/POST/DELETE | 是 | AiToken CRUD |
| 31 | `/api/ai-studio` | POST | 否 | AI Studio 创作 |
| 32 | `/api/backup` | POST | 是 | 数据备份 |
