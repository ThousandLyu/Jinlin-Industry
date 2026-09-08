# 金陵工脉 工作日志

> 审计与修复记录 | 2026-05-01

---

## 一、审计概况

| 项目 | 说明 |
|------|------|
| 审计时间 | 2026-05-01 13:00 ~ 14:20 |
| 审计范围 | 全项目代码审查（前台页面、后台页面、API路由、工具库） |
| 发现总问题数 | 8 |
| 已修复 | 7 |
| 未修复 | 1（阶段七视觉优化，因缺乏初始视觉基准） |

---

## 二、发现与修复记录

### 阶段一：前台字段名不匹配（影响前台展示）✅ 已修复

| # | 文件 | 问题 | 修复 |
|---|------|------|------|
| 1 | `src/app/page.tsx` | `isFeatured` → 应为 `isRecommended` | ✅ |
| 2 | `src/app/page.tsx` | `site.category` → 应为 `site.industry` | ✅ |
| 3 | `src/app/sites/page.tsx` | `s.category` → `s.industry` | ✅ |
| 4 | `src/app/sites/page.tsx` | `isFeatured` → `isRecommended` | ✅ |
| 5 | `src/app/map/page.tsx` | `settings.mapImageUrl` 不存在 | ✅ 已删除引用 |
| 6 | `src/app/map/page.tsx` | `p.siteName || p.name` → `p.name` | ✅ |
| 7 | `src/app/map/page.tsx` | `point.address` → 改用 `point.description` | ✅ |
| 8 | `src/app/sites/[slug]/page.tsx` | `site.personIds` → `site.representativePeople` | ✅ |
| 9 | `src/app/sites/[slug]/page.tsx` | `site.period` → `site.status` | ✅ |
| 10 | `src/app/sites/[slug]/page.tsx` | `site.summary` → `site.description` | ✅ |
| 11 | `src/app/sites/[slug]/page.tsx` | `site.foundingYear` → `site.establishedYear` | ✅ |
| 12 | `src/app/sites/[slug]/page.tsx` | `site.address` → `site.location` | ✅ |
| 13 | `src/app/sites/[slug]/page.tsx` | `verificationGrade` → `riskLevel` | ✅ |
| 14 | `src/app/scenes/page.tsx` | `scene.era` 不存在 → 改展示"关联企业" | ✅ |

### 阶段二：缺失依赖 ✅ 已修复

| # | 包名 | 操作 |
|---|------|------|
| 1 | `xlsx` | `npm install xlsx` |
| 2 | `csv-stringify` | `npm install csv-stringify` |
| 3 | `archiver` | `npm install archiver` |
| 4 | `@types/archiver` | `npm install -D @types/archiver` |

### 阶段三：Auth 空环境变量漏洞 ✅ 已修复

- **文件**: `src/lib/auth.ts`
- **问题**: `getAdminCredentials()` 环境变量未设置时回退到 `admin/admin`
- **修复**: 返回类型改为 `{ username, password } | null`，环境变量缺失时返回 `null` + 控制台报错
- **影响**: `login()` 函数同步更新，无凭据时拒绝登陆

### 阶段四：冗余文件清理 ✅ 已修复

- 删除 `data/mapPoints.json`（旧驼峰命名，统一使用 `data/map_points.json`）

### 阶段五：AI 接口检查 ✅ 已验证

- **检查项**: `src/lib/aiClient.ts` 所有导出函数均在 `src/app/api/ai/route.ts` 中正确导入
- **结论**: 无导入错误，AI 预留接口完整

### 阶段六：备份命令注入 ✅ 已修复

- **文件**: `src/app/api/backup/route.ts`
- **问题**: 使用 `exec(powershell ...)` 拼接动态路径，存在命令注入风险
- **修复**: 用 `archiver` 库替代 `exec`，纯 JS 创建 ZIP，无 shell 调用
- **安全改进**: 彻底消除 shell 注入面

### 阶段七：视觉优化与功能增强 ❌ 跳过

- **状态**: 未执行
- **原因**: 缺乏初始视觉设计稿/Figma 作为基线
- **建议**: 获取设计稿后参照配色进行视觉调优

---

## 三、后续增强记录

### 2026-05-01 接手调试与交付增强

- 统一后台登录校验：`/api/auth` 改为复用 `src/lib/auth.ts`
- 修复 HttpOnly Cookie 登录态判断
- 增加后台 API 认证保护
- 升级媒体上传自动写入 `data/media.json`
- 增加新手交付材料：`.env.example`、`快速启动.md`、`npm run doctor`
- 增加 `.eslintrc.json`
- 验证：`npm run doctor`/`lint`/`build` 全部通过

### 2026-05-01 史料库一键导入升级

- 新增 `src/lib/sourceImport.ts`：扫描 A/B/C 三级史料文件夹
- 新增 `/api/import/sources` 一键导入接口
- 默认导入目录模板：`imports/sources/A`、`B`、`C`
- 后台史料管理页面升级：一键导入按钮、按等级/文件名/类型搜索
- 导入后自动复制文件到 `public/uploads/sources/`
- 验证：`npm run lint`/`doctor`/`build` 全部通过

### 2026-05-01 AI 史料检索问答升级

- 重写 `src/lib/aiClient.ts`：接入 OpenAI-compatible API
- 新增 `src/lib/sourceSearch.ts`：史料全文检索
- 升级 `/api/ai`：新增 `ask`/`source_qa`/`search_sources` 动作
- 新增后台史料问答页面 `/admin/ai`
- 支持 Ollama、LM Studio 本地模型
- 验证：`npm run lint`/`doctor`/`build` 全部通过

### 2026-05-01 后台配置中心与体验优化

- 新增 `src/lib/appConfig.ts`：统一运行配置读取
- 后台系统设置升级为四页签配置中心：站点信息、AI配置、史料导入、后台账号
- AI/导入目录/后台账号改为读取后台设置
- 验证：全部通过

### 2026-05-01 前后台账户注册升级

- 新增 `data/users.json` 和 `db.users` 数据服务
- 新增 `src/lib/userAccounts.ts`：注册、密码哈希、管理员认证
- 新增 `/api/register`、`/register`、`/admin/register`
- 后台登录兼容新旧账号
- 管理员注册密钥默认值：`JLMZGY_TSL`

### 2026-05-01 后台注册账户登录修复

- `authenticateUser()` 支持用户名/邮箱/手机号登录
- 后台登录失败提示优化
- 保留兜底账号 `admin / jinling2026`

### 2026-05-01 地图底图管理与3D模型导入

**需求**: 地图底图上传、3D模型导入

**地图底图管理**:
- `data/settings.json` 新增 `mapBaseImage` 字段
- 后台 `/admin/map` 新增"地图底图管理"区域
- 点位表单支持上传点位专属底图
- `MapPoint` 类型新增 `baseMapImage` 字段

**3D模型导入**:
- `DigitalScene` 类型新增 `modelUrl`、`modelType` 字段
- 后台 `/admin/scenes` 管理页重写：列表显示3D模型列、表单支持上传 glTF/GLB/OBJ/FBX
- 前台 `/scenes` 页面正确使用 `image` 和 `hotspots` 字段

**验证**: `npm run lint`/`build` 通过，所有页面 200

### 2026-05-01 时间轴增强（需求6）

- 前台 `/timeline` 从服务端组件改为客户端组件，支持类别筛选
- 中文类别标签：经济发展、社会变革、文化教育、政治事件、技术革新
- 筛选按钮为圆角药丸样式，选中态暗红配色
- 年份节点颜色按年代/类别区分：1912年前暗红、技术革新金棕、经济棕褐、其他深棕
- 节点显示年份后两位数字，外圈金棕光晕
- 空筛选结果提示

## 四、验证建议

```bash
npm install
npm run seed
npm run dev
# 打开 http://localhost:3000
# 后台: http://localhost:3000/admin/login
# 兜底账号: admin / jinling2026