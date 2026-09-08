const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, 
        BorderStyle, AlignmentType, PageBreak, NumberFormat, LevelFormat, 
        Tab, TabStopPosition, TabStopType } = require('docx');

// Helper function to create a styled paragraph
function p(text, options = {}) {
  const runs = [];
  if (typeof text === 'string') {
    runs.push(new TextRun({
      text,
      size: options.size || 22,
      bold: options.bold || false,
      color: options.color || '333333',
      font: options.font || '微软雅黑',
    }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === 'string') {
        runs.push(new TextRun({
          text: t,
          size: options.size || 22,
          font: '微软雅黑',
          color: options.color || '333333',
        }));
      } else {
        runs.push(new TextRun({
          text: t.text,
          size: t.size || options.size || 22,
          bold: t.bold !== undefined ? t.bold : false,
          color: t.color || options.color || '333333',
          font: t.font || '微软雅黑',
        }));
      }
    });
  }
  return new Paragraph({
    children: runs,
    spacing: { after: options.after || 200, before: options.before || 0 },
    alignment: options.alignment || AlignmentType.LEFT,
    indent: options.indent,
    bullet: options.bullet,
    numbering: options.numbering,
  });
}

function heading(text, level = 1) {
  const sizeMap = { 1: 32, 2: 28, 3: 24, 4: 22 };
  const colorMap = { 1: '1a1a1a', 2: '4A3728', 3: '8B1A2B', 4: '333333' };
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: sizeMap[level] || 22,
        bold: true,
        color: colorMap[level] || '333333',
        font: '微软雅黑',
      }),
    ],
    spacing: { before: level === 1 ? 400 : 300, after: 200 },
    heading: HeadingLevel[`HEADING_${level}`],
  });
}

function codeBlock(text) {
  const lines = text.split('\n');
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        size: 18,
        font: 'Courier New',
        color: '1a1a2e',
      }),
    ],
    spacing: { before: 100, after: 200 },
    indent: { left: 400 },
    shading: { fill: 'f5f5f5', type: 'clear' },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: '微软雅黑', color: '333333' })],
    spacing: { after: 100 },
    bullet: { level },
  });
}

function emptyLine() {
  return new Paragraph({ children: [], spacing: { after: 100 } });
}

// ============ BUILD DOCUMENT ============

async function main() {
  const doc = new Document({
    title: '金陵工脉平台操作说明书',
    description: '金陵工脉·南京民族工业云展览与史料库平台 - 完整操作指南',
    styles: {
      default: {
        document: {
          run: { font: '微软雅黑', size: 22, color: '333333' },
          paragraph: { spacing: { after: 200 } },
        },
      },
    },
    sections: [
      // ============= 封面 =============
      {
        children: [
          emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(),
          new Paragraph({
            children: [new TextRun({ text: '金陵工脉', size: 56, bold: true, color: '8B1A2B', font: '微软雅黑' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '南京民族工业云展览与史料库平台', size: 36, color: '4A3728', font: '微软雅黑' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '操 作 说 明 书', size: 44, bold: true, color: 'C49A2B', font: '微软雅黑' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          emptyLine(), emptyLine(), emptyLine(),
          new Paragraph({
            children: [new TextRun({ text: '薪火传承 · 南京民族工业记忆数字复原与公益传承项目', size: 24, color: '666666', font: '微软雅黑' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '版本 1.0 · 2026年5月', size: 22, color: '999999', font: '微软雅黑' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
        ],
      },

      // ============= 目录页 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 600 } }),
          heading('目  录', 1),
          emptyLine(),
          ...[
            '一、平台概述',
            '  1.1 系统定位',
            '  1.2 技术架构',
            '  1.3 项目结构',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '二、本地运行指南',
            '  2.1 环境要求',
            '  2.2 安装与启动',
            '  2.3 常见问题排查',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '三、后台管理操作',
            '  3.1 登录后台',
            '  3.2 数据看板',
            '  3.3 内容管理（图文教程）',
            '  3.4 修改网站标题/简介',
            '  3.5 文件上传管理',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '四、修改网页内容',
            '  4.1 修改文字内容',
            '  4.2 修改首页 hero 区域',
            '  4.3 添加/删除页面',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '五、添加图片',
            '  5.1 图片存放位置',
            '  5.2 上传图片到后台',
            '  5.3 在前台引用图片',
            '  5.4 替换首页大图',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '六、3D 展示集成',
            '  6.1 使用 Three.js 展示 3D 模型',
            '  6.2 嵌入 3D 场景页面',
            '  6.3 使用 Sketchfab/ModelViewer',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '七、部署到服务器（外部访问）',
            '  7.1 准备服务器',
            '  7.2 使用 PM2 部署',
            '  7.3 使用 Nginx 反向代理',
            '  7.4 配置域名与 HTTPS',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '八、数据导出与备份',
            '  8.1 导出史实核验表',
            '  8.2 一键备份',
          ].map(t => bullet(t)),
          emptyLine(),
          ...[
            '九、AI 接口配置',
            '  9.1 开启 AI 功能',
            '  9.2 配置 API 密钥',
          ].map(t => bullet(t)),
        ],
      },

      // ============= 第一章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('一、平台概述', 1),

          heading('1.1 系统定位', 2),
          p('"金陵工脉"是一个轻量化本地优先的南京民族工业云展览与史料库平台，分为前台云展览展示端和后台数据维护端：'),
          bullet('前台：面向公众展示南京民族工业云展，包括时间轴、工业地图、企业遗址展厅、人物故事、史实核验、数字复原场景、公益课程和活动记录'),
          bullet('后台：用于维护史料库、企业遗址、人物故事、史实核验、时间轴、地图点位、数字复原场景、公益课程和活动记录'),
          emptyLine(),

          heading('1.2 技术架构', 2),
          p('本平台使用以下技术构建：'),
          bullet('框架：Next.js 14 (App Router)'),
          bullet('语言：TypeScript'),
          bullet('样式：Tailwind CSS'),
          bullet('数据存储：JSON 文件（零数据库依赖）'),
          bullet('认证：环境变量 + JWT Token'),
          bullet('文件上传：本地存储到 public/uploads/'),
          bullet('导出：xlsx (Excel)、csv-stringify (CSV)'),
          emptyLine(),

          heading('配色体系', 3),
          p('平台采用米白、深棕、金棕、暗红作为主色系，符合南京工业遗产、红旅赛道和历史文化云展的风格定位。'),
          bullet('米白 #F5F0E8 — 页面背景'),
          bullet('深棕 #4A3728 — 正文文字'),
          bullet('金棕 #C49A2B — 强调色、按钮、装饰'),
          bullet('暗红 #8B1A2B — 红旅元素点缀'),
          emptyLine(),

          heading('1.3 项目结构', 2),
          p('项目主要目录结构如下：'),
          codeBlock(`jinling-archive/
├── data/              # JSON 数据文件（核心数据目录）
│   ├── sources.json   # 史料来源
│   ├── sites.json     # 企业遗址
│   ├── people.json    # 人物
│   ├── facts.json     # 史实核验
│   ├── timeline.json  # 时间轴
│   ├── map_points.json# 地图点位
│   ├── scenes.json    # 数字复原场景
│   ├── courses.json   # 公益课程
│   ├── activities.json# 活动记录
│   ├── media.json     # 媒体文件
│   ├── settings.json  # 系统设置
│   └── backups/       # 备份文件
├── public/uploads/    # 上传文件目录
│   ├── images/        # 图片文件
│   ├── courses/       # 课程文件
│   ├── documents/     # 史料附件
│   └── scenes/        # 场景图
├── src/               # 源代码目录
│   ├── app/           # 页面文件
│   │   ├── page.tsx           # 首页
│   │   ├── timeline/          # 时间轴
│   │   ├── map/               # 工业地图
│   │   ├── sites/             # 企业遗址
│   │   ├── people/            # 人物
│   │   ├── facts/             # 史实
│   │   ├── scenes/            # 复原场景
│   │   ├── courses/           # 课程
│   │   ├── activities/        # 活动
│   │   ├── about/             # 关于
│   │   └── admin/             # 后台管理
│   └── lib/           # 工具库
├── .env.local         # 环境配置（修改密码在此）
└── package.json       # 项目配置`),
        ],
      },

      // ============= 第二章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('二、本地运行指南', 1),

          heading('2.1 环境要求', 2),
          bullet('Node.js 18 或更高版本'),
          bullet('npm 9 或更高版本（npm 会随 Node.js 一起安装）'),
          bullet('操作系统：Windows / macOS / Linux 均可'),
          bullet('无需安装任何数据库软件'),
          emptyLine(),

          heading('2.2 安装与启动', 2),
          p('步骤一：解压项目文件夹', 2, { bold: true }),
          p('将收到的 "jinling-archive.zip" 解压到任意目录（例如 D:\\jinling-archive），注意路径中不要包含中文。'),
          emptyLine(),

          p('步骤二：打开命令行终端', 2, { bold: true }),
          p('按下 Win + R，输入 "cmd" 回车打开命令提示符。使用 cd 命令进入项目目录：'),
          codeBlock('cd D:\\jinling-archive'),
          emptyLine(),

          p('步骤三：安装依赖', 2, { bold: true }),
          codeBlock('npm install'),
          p('等待安装完成（约30秒-2分钟，取决于网络速度）。'),
          emptyLine(),

          p('步骤四：生成种子数据', 2, { bold: true }),
          codeBlock('npm run seed'),
          p('执行成功后，data 目录下会生成所有 JSON 数据文件，包含预设的示例数据。'),
          emptyLine(),

          p('步骤五：启动开发服务器', 2, { bold: true }),
          codeBlock('npm run dev'),
          p('终端会显示类似以下信息：'),
          codeBlock('▲ Next.js 14.x.x\n- Local: http://localhost:3000\n\n✔ Ready in 2.9s'),
          emptyLine(),

          p('步骤六：打开浏览器访问', 2, { bold: true }),
          p('打开 Chrome / Edge / Firefox 浏览器，在地址栏输入：'),
          codeBlock('http://localhost:3000'),
          p('即可看到项目首页。'),
          emptyLine(),

          heading('2.3 常见问题排查', 2),
          p('问题1："npm install 报错"', 0, { bold: true }),
          p('解决方法：请检查网络连接。如果在中国大陆，可以尝试使用淘宝镜像：'),
          codeBlock('npm install --registry=https://registry.npmmirror.com'),
          emptyLine(),
          p('问题2："端口 3000 被占用"', 0, { bold: true }),
          p('解决方法：修改启动命令，使用其他端口：'),
          codeBlock('npx next dev -p 3001'),
          p('然后访问 http://localhost:3001'),
          emptyLine(),
          p('问题3："运行报错找不到模块"', 0, { bold: true }),
          p('解决方法：删除 node_modules 文件夹后重新安装：'),
          codeBlock('rmdir /s node_modules\nnpm install\nnpm run seed'),
        ],
      },

      // ============= 第三章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('三、后台管理操作', 1),

          heading('3.1 登录后台', 2),
          p('在浏览器中访问：'),
          codeBlock('http://localhost:3000/admin/login'),
          p('默认登录账号（在 .env.local 文件中配置）：'),
          bullet('用户名：admin'),
          bullet('密码：jinling2026'),
          p('登录成功后，会跳转到后台数据看板。'),
          p('⚠ 重要提示：上线后请务必修改密码！编辑项目根目录下的 .env.local 文件：'),
          codeBlock('ADMIN_USERNAME=admin\nADMIN_PASSWORD=请修改为你的密码'),
          p('保存文件后，重启服务器即可生效。'),
          emptyLine(),

          heading('3.2 数据看板', 2),
          p('后台首页是数据看板，展示全站数据概览：'),
          bullet('史料来源数量'),
          bullet('企业遗址数量'),
          bullet('人物数量'),
          bullet('史实核验数量'),
          bullet('高等级史实数'),
          bullet('待审核数量'),
          bullet('课程数量'),
          bullet('活动数量'),
          bullet('累计服务人数'),
          emptyLine(),

          heading('3.3 内容管理操作（图文教程）', 2),
          p('以下以"企业遗址管理"为例，说明如何新增、修改和删除内容。其他模块操作方式类似。'),
          emptyLine(),

          p('■ 新增一条企业遗址', 3, { bold: true }),
          p('步骤1：在左侧菜单点击"企业遗址管理"'),
          p('步骤2：点击页面右上角的"新增企业"按钮'),
          p('步骤3：在弹出的表单中填写以下信息：'),
          bullet('名称：输入企业名称（例如：金陵机器制造局）'),
          bullet('别名：输入别名（可选）'),
          bullet('分类：选择行业分类（机械制造、纺织、化工等）'),
          bullet('简介/描述：输入企业历史简介'),
          bullet('成立年份：输入成立年份（例如：1865）'),
          bullet('关停年份：输入关停年份（如已关停）'),
          bullet('地址：输入企业所在地'),
          bullet('经度/纬度：输入地图坐标（可选）'),
          bullet('状态：勾选"发布"即可在前台显示'),
          bullet('推荐：勾选"推荐"会在首页展示'),
          p('步骤4：点击"保存"按钮，新企业即创建成功'),
          p('步骤5：刷新前台页面，即可看到新增的企业遗址'),
          emptyLine(),

          p('■ 编辑一条企业遗址', 3, { bold: true }),
          p('在企业列表中找到要修改的企业，点击"编辑"按钮，修改信息后点击"保存"。'),
          emptyLine(),

          p('■ 删除一条企业遗址', 3, { bold: true }),
          p('在企业列表中找到要删除的企业，点击"删除"按钮，确认后该条目将被移除。'),
          emptyLine(),

          p('其他模块操作说明：', 3, { bold: true }),
          bullet('史料管理：新增/编辑/删除史料来源，记录文献名称、作者、出版信息'),
          bullet('人物管理：新增/编辑/删除人物，可上传头像、绑定关联企业'),
          bullet('史实核验：新增/编辑/删除史实，系统自动检测风险词，设置核验等级'),
          bullet('时间轴：新增/编辑/删除历史事件，按年份排序展示'),
          bullet('地图点位：新增/编辑/删除地图坐标，设置 x 和 y 百分比位置'),
          bullet('数字复原场景：上传场景图片，标注热点区域'),
          bullet('公益课程：上传课程 PPT、讲稿、任务单等文件'),
          bullet('活动记录：录入公益活动信息，上传活动照片'),
          emptyLine(),

          heading('3.4 修改网站标题/简介', 2),
          p('在后台左侧菜单点击"系统设置"，可以修改：'),
          bullet('网站标题'),
          bullet('项目简介'),
          bullet('联系方式（邮箱、电话、地址）'),
          bullet('地图图片 URL'),
          bullet('首页标语'),
          p('修改后点击"保存"，刷新前台即可看到效果。'),
          p('也可以直接编辑 data/settings.json 文件，修改后自动生效。'),
          emptyLine(),

          heading('3.5 文件上传管理', 2),
          p('在左侧菜单点击"媒体文件管理"，可以：'),
          bullet('上传图片、文档等文件'),
          bullet('查看已上传的文件列表'),
          bullet('复制文件链接，用于在页面中引用'),
          p('文件上传后存放在 public/uploads/ 目录下对应的子目录中。'),
        ],
      },

      // ============= 第四章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('四、修改网页内容', 1),

          heading('4.1 修改文字内容', 2),
          p('前台页面的文字内容主要有两种修改方式：'),
          emptyLine(),

          p('方式一：通过后台修改（推荐，无需编程知识）', 3, { bold: true }),
          bullet('进入后台 → 系统设置 → 修改网站标题/简介/联系方式'),
          bullet('进入后台 → 对应模块 → 新增/编辑内容'),
          p('这种方式无需接触代码，适合日常维护。'),
          emptyLine(),

          p('方式二：直接编辑源文件（需要编程基础）', 3, { bold: true }),
          p('使用 VS Code 打开项目，在 src/app 目录下找到对应的页面文件进行修改：'),
          bullet('首页：src/app/page.tsx'),
          bullet('关于：src/app/about/page.tsx'),
          bullet('时间轴：src/app/timeline/page.tsx'),
          bullet('企业列表：src/app/sites/page.tsx'),
          p('例如要修改首页的"关于项目"段落，打开 src/app/page.tsx，找到以下代码：'),
          codeBlock(`<p className="text-gray-700 leading-relaxed">
  "金陵工脉·薪火传承"项目致力于...
</p>`),
          p('将引号中的文本替换为你想要的内容，保存文件，浏览器会自动刷新。'),
          emptyLine(),

          heading('4.2 修改首页 hero 区域', 2),
          p('首页顶部的大标题区域（hero section）在 src/app/page.tsx 中，可以修改：'),
          bullet('主标题："金陵工脉"'),
          bullet('副标题："薪火传承 · 南京民族工业记忆数字复原与公益传承"'),
          bullet('描述文字'),
          bullet('两个按钮的文字和链接'),
          p('示例：将主标题改为"南京工业记忆"，找到以下代码：'),
          codeBlock(`<h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-wider">
  金陵工脉
</h1>`),
          p('将"金陵工脉"替换为新的标题即可。'),
          emptyLine(),

          heading('4.3 添加/删除页面', 2),
          p('如需添加新的页面，步骤如下：'),
          p('1. 在 src/app 下创建一个新文件夹（例如：news）'),
          p('2. 在该文件夹中创建 page.tsx 文件'),
          p('3. 编写页面内容（可以参考其他页面的代码格式）'),
          p('4. 在 src/components/front/Navbar.tsx 中添加导航链接'),
          p('示例：新建一个"新闻动态"页面'),
          codeBlock('// 创建 src/app/news/page.tsx\n\nexport default function NewsPage() {\n  return (\n    <div>\n      <h1>新闻动态</h1>\n      <p>这里是新闻内容...</p>\n    </div>\n  )\n}'),
          p('然后在 Navbar.tsx 中添加：'),
          codeBlock(`<Link href="/news">新闻动态</Link>`),
        ],
      },

      // ============= 第五章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('五、添加图片', 1),

          heading('5.1 图片存放位置', 2),
          p('所有上传的图片都存放在项目目录下的 public/uploads/images/ 文件夹中。'),
          p('您有以下两种方式来添加图片：'),
          emptyLine(),

          heading('5.2 上传图片到后台', 2),
          p('最简单的方法：通过后台的"媒体文件管理"上传'),
          p('1. 登录后台 → 媒体文件管理'),
          p('2. 点击"选择文件"按钮，选择要上传的图片'),
          p('3. 点击"上传"按钮'),
          p('4. 上传成功后，会显示文件列表，复制文件链接'),
          p('5. 将链接粘贴到需要展示图片的位置'),
          p('图片链接格式：/uploads/images/文件名.jpg'),
          emptyLine(),

          heading('5.3 在前台引用图片', 2),
          p('企业详情页的图片关联：'),
          p('在"企业遗址管理"中编辑企业时，可以在"相关图片"字段中填入图片 URL 列表（每行一个 URL）。'),
          p('前台的企业详情页会自动展示这些图片。'),
          emptyLine(),

          p('手动在页面中插入图片：', 3, { bold: true }),
          p('编辑页面文件（如 src/app/about/page.tsx），在合适的位置加入：'),
          codeBlock(`<img
  src="/uploads/images/team-photo.jpg"
  alt="团队合照"
  className="w-full max-w-2xl mx-auto rounded-xl shadow-lg"
/>`),
          emptyLine(),

          heading('5.4 替换首页和各大页面的大图', 2),
          p('首页目前使用纯色渐变背景。如果您想使用图片背景，请编辑 src/app/page.tsx：'),
          p('找到以下代码：'),
          codeBlock(`<div className="absolute inset-0" style={{
  background: 'linear-gradient(135deg, ...)'
}} />`),
          p('替换为：'),
          codeBlock(`<div className="absolute inset-0 bg-cover bg-center"
  style={{ backgroundImage: "url('/uploads/images/hero-bg.jpg')" }} />`),
          p('然后将您的背景图片命名为 hero-bg.jpg，放到 public/uploads/images/ 目录下。'),
          p('推荐的图片尺寸：1920 × 1080 像素，文件大小不超过 2MB。'),
        ],
      },

      // ============= 第六章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('六、3D 展示集成', 1),

          heading('6.1 使用 @google/model-viewer（最简单方式）', 2),
          p('@google/model-viewer 是一个 Web Component，可以轻松在网页中嵌入 3D 模型。'),
          p('步骤1：安装依赖'),
          codeBlock('npm install @google/model-viewer'),
          emptyLine(),

          p('步骤2：创建一个 3D 展示页面组件', 3, { bold: true }),
          codeBlock(`// 创建文件 src/components/front/ModelViewer3D.tsx
"use client"

import { useEffect, useRef } from 'react'
import '@google/model-viewer'

export default function ModelViewer3D({ src, alt = '3D模型', poster = '' }) {
  return (
    <div className="w-full aspect-square max-w-lg mx-auto">
      <model-viewer
        src={src}
        alt={alt}
        poster={poster}
        camera-controls
        auto-rotate
        ar
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}`),
          emptyLine(),

          p('步骤3：在页面中使用（例如在数字复原场景页面）', 3, { bold: true }),
          p('将 3D 模型文件（.glb 或 .gltf 格式）放到 public/uploads/models/ 目录下，然后在页面中引用。'),
          p('编辑 src/app/scenes/page.tsx，添加：'),
          codeBlock(`import ModelViewer3D from '@/components/front/ModelViewer3D'

// 在合适位置添加
<ModelViewer3D
  src="/uploads/models/nanjing-factory.glb"
  alt="南京某工厂3D复原"
  poster="/uploads/images/factory-preview.jpg"
/>`),
          emptyLine(),

          heading('6.2 使用 Three.js（更高级）', 2),
          p('如果需要更复杂的 3D 交互效果，可以使用 Three.js：'),
          codeBlock('npm install three @types/three'),
          p('然后创建一个 Three.js 组件，参考 Three.js 官方文档进行开发。'),
          emptyLine(),

          heading('6.3 嵌入外部 3D 平台', 2),
          p('也可以直接嵌入 Sketchfab、ArtStation 等平台的 3D 展示：'),
          codeBlock(`<iframe
  src="https://sketchfab.com/models/模型ID/embed"
  className="w-full h-[500px]"
  allow="autoplay; fullscreen; xr-spatial-tracking"
/>`),
          p('只需将"模型ID"替换为 Sketchfab 上对应模型的 ID 即可。'),
          emptyLine(),

          heading('6.4 3D 展示页面路径', 2),
          p('平台已经预留了"数字复原场景"页面（/scenes），用于展示 3D 复原效果。'),
          p('您可以通过后台的"数字复原场景管理"上传场景图片和标注热点。'),
          p('如果要展示完整的 3D 模型，建议在场景详情中嵌入上述的 3D 查看器组件。'),
        ],
      },

      // ============= 第七章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('七、部署到服务器（外部访问）', 1),

          heading('7.1 准备服务器', 2),
          p('您需要一台云服务器（推荐配置）：'),
          bullet('操作系统：Ubuntu 22.04 / CentOS 7+ 或 Windows Server'),
          bullet('最低配置：1核 2GB 内存'),
          bullet('推荐配置：2核 4GB 内存'),
          bullet('带宽：5Mbps 以上'),
          p('国内常见云服务商：阿里云、腾讯云、华为云、UCloud'),
          emptyLine(),

          heading('7.2 在服务器上部署（以 Ubuntu 为例）', 2),
          p('步骤1：登录服务器', 3, { bold: true }),
          codeBlock('ssh root@你的服务器IP'),
          emptyLine(),

          p('步骤2：安装 Node.js 18+', 3, { bold: true }),
          codeBlock(`curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version  # 验证安装`),
          emptyLine(),

          p('步骤3：使用 PM2 运行（推荐）', 3, { bold: true }),
          codeBlock(`# 安装 PM2（进程管理器）
npm install -g pm2

# 进入项目目录
cd /var/www/jinling-archive

# 安装依赖
npm install

# 生成数据
npm run seed

# 构建生产版本
npm run build

# 使用 PM2 启动
pm2 start npm --name "jinling" -- start

# 设置 PM2 开机自启
pm2 startup
pm2 save`),
          emptyLine(),

          p('步骤4：配置防火墙（如果使用 Windows 服务器）', 3, { bold: true }),
          p('确保服务器防火墙允许 3000 端口访问，或者使用 Nginx 反向代理（推荐）。'),
          emptyLine(),

          heading('7.3 使用 Nginx 反向代理（推荐，Linux）', 2),
          p('Nginx 可以让用户通过 80（HTTP）/ 443（HTTPS）端口访问，而不是 3000 端口。'),
          codeBlock(`# 安装 Nginx
apt-get install -y nginx

# 创建配置文件
nano /etc/nginx/sites-available/jinling`),
          emptyLine(),
          p('在文件中写入以下配置：'),
          codeBlock(`server {
    listen 80;
    server_name 你的域名或IP;

    # 静态文件缓存
    location /_next/static {
        alias /var/www/jinling-archive/.next/static;
        expires 365d;
    }

    location /uploads {
        alias /var/www/jinling-archive/public/uploads;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`),
          emptyLine(),
          p('启用配置并重启 Nginx：'),
          codeBlock(`ln -s /etc/nginx/sites-available/jinling /etc/nginx/sites-enabled/
nginx -t  # 测试配置是否正确
systemctl restart nginx`),
          emptyLine(),

          heading('7.4 配置域名与 HTTPS', 2),
          p('配置域名：', 3, { bold: true }),
          bullet('在域名服务商（如阿里云万网、腾讯云DNSPod）将域名解析到服务器 IP'),
          bullet('在 Nginx 配置中将 server_name 改为你的域名'),
          emptyLine(),

          p('配置 HTTPS（使用 Let\'s Encrypt 免费证书）：', 3, { bold: true }),
          codeBlock(`# 安装 Certbot
apt-get install -y certbot python3-certbot-nginx

# 获取证书并自动配置 Nginx
certbot --nginx -d 你的域名.com

# 测试自动续期
certbot renew --dry-run`),
          p('配置完成后，访问 https://你的域名 即可通过 HTTPS 安全访问。'),
          emptyLine(),

          heading('Windows 服务器部署说明', 2),
          p('如果您使用 Windows Server：'),
          bullet('安装 Node.js（从官网下载安装包）'),
          bullet('使用 IIS 反向代理，或直接通过 PM2 + 防火墙规则开放 3000 端口'),
          bullet('或者安装 Nginx for Windows（https://nginx.org/en/download.html）'),
        ],
      },

      // ============= 第八章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('八、数据导出与备份', 1),

          heading('8.1 导出史实核验表', 2),
          p('在后台"史实核验管理"页面，点击"导出 CSV"按钮，即可下载史实核验表。'),
          p('导出的 CSV 文件可以用 Excel 打开，包含所有史实字段。'),
          emptyLine(),

          heading('8.2 导出史料台账', 2),
          p('在后台"史料管理"页面，点击"导出台账"按钮，即可下载史料台账 CSV 文件。'),
          emptyLine(),

          heading('8.3 一键备份', 2),
          p('在后台任意页面点击"备份"按钮（位于页面底部），系统会自动：'),
          bullet('打包 data/ 目录下的所有 JSON 数据文件'),
          bullet('打包 public/uploads/ 目录下的所有上传文件'),
          bullet('生成一个 ZIP 文件保存在 data/backups/ 目录下'),
          p('备份文件名格式：backup-YYYY-MM-DD-HHmmss.zip'),
          emptyLine(),

          heading('8.4 手动备份数据', 2),
          p('您也可以直接复制整个项目文件夹进行备份，或者只复制 data/ 和 public/uploads/ 目录。'),
          p('将 data/ 目录复制到新环境后，运行 npm run dev 即可恢复全部数据。'),
        ],
      },

      // ============= 第九章 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('九、AI 接口配置', 1),

          heading('9.1 开启 AI 功能', 2),
          p('默认情况下 AI 功能是关闭的。如需开启，编辑 .env.local 文件：'),
          codeBlock(`AI_ENABLED=true
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-你的API密钥
AI_MODEL=gpt-4o-mini`),
          p('保存后重启服务器。'),
          emptyLine(),

          heading('9.2 支持的 AI 能力', 2),
          p('开启 AI 后，平台可以提供以下功能（需二次开发具体调用）：'),
          bullet('史料摘要自动生成'),
          bullet('展览文案智能撰写'),
          bullet('课程脚本辅助生成'),
          bullet('史实表述风险检测'),
          emptyLine(),

          heading('9.3 注意事项', 2),
          p('本平台兼容任何 OpenAI-compatible 的 API 接口，包括：'),
          bullet('OpenAI 官方 API'),
          bullet('Azure OpenAI Service'),
          bullet('国内大模型服务商（如 DeepSeek、文心一言等，需兼容 OpenAI 接口）'),
          bullet('本地部署的大模型（如 Ollama + LiteLLM）'),
          p('AI 功能为可选增强，第一版本即使不配置 AI 也能完整运行所有功能。'),
        ],
      },

      // ============= 附录 =============
      {
        children: [
          new Paragraph({ children: [], spacing: { after: 200 } }),
          heading('附录：常用命令速查', 1),
          emptyLine(),
          bullet('npm install — 安装依赖'),
          bullet('npm run seed — 生成种子数据'),
          bullet('npm run dev — 启动开发服务器（热更新）'),
          bullet('npm run build — 构建生产版本'),
          bullet('npm start — 启动生产服务器'),
          bullet('pm2 start npm --name "jinling" -- start — PM2 启动'),
          bullet('pm2 stop jinling — PM2 停止'),
          bullet('pm2 restart jinling — PM2 重启'),
          bullet('pm2 logs jinling — 查看日志'),
          bullet('pm2 status — 查看状态'),
          emptyLine(),

          heading('附录：前台页面路径', 2),
          bullet('/ → 首页'),
          bullet('/timeline → 工业时间轴'),
          bullet('/map → 工业地图'),
          bullet('/sites → 企业遗址展厅'),
          bullet('/sites/[slug] → 企业详情页'),
          bullet('/people → 人物故事'),
          bullet('/facts → 工业第一与标杆史实'),
          bullet('/scenes → 数字复原场景'),
          bullet('/courses → 公益课程资源'),
          bullet('/activities → 活动记录'),
          bullet('/about → 关于项目'),
          emptyLine(),

          heading('附录：后台页面路径', 2),
          bullet('/admin/login → 后台登录'),
          bullet('/admin/dashboard → 数据看板'),
          bullet('/admin/sources → 史料管理'),
          bullet('/admin/sites → 企业遗址管理'),
          bullet('/admin/people → 人物管理'),
          bullet('/admin/facts → 史实核验管理'),
          bullet('/admin/timeline → 时间轴管理'),
          bullet('/admin/map → 地图点位管理'),
          bullet('/admin/scenes → 数字复原场景管理'),
          bullet('/admin/courses → 公益课程管理'),
          bullet('/admin/activities → 活动记录管理'),
          bullet('/admin/media → 媒体文件管理'),
          bullet('/admin/settings → 系统设置'),
          emptyLine(),

          new Paragraph({
            children: [new TextRun({
              text: '— 文档结束 —',
              size: 24,
              color: '999999',
              font: '微软雅黑',
              italics: true,
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),
        ],
      },
    ],
  });

  // Generate document
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '金陵工脉平台操作说明书.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Word 文档已生成：' + outputPath);
}

main().catch(console.error);