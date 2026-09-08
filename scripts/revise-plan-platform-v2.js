const fs = require('fs');
const JSZip = require('jszip');

const input = '_plan_v7_edit_base.docx';
const output = '_plan_v7_platform_v2.docx';

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paraText(paragraphXml) {
  return [...paragraphXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXml(match[1]))
    .join('')
    .trim();
}

function setParaText(paragraphXml, text) {
  let replaced = false;
  return paragraphXml.replace(/<w:t([^>]*)>[\s\S]*?<\/w:t>/g, (match, attrs) => {
    if (replaced) return match.replace(/<w:t([^>]*)>[\s\S]*?<\/w:t>/, '<w:t$1></w:t>');
    replaced = true;
    return `<w:t${attrs}>${escapeXml(text)}</w:t>`;
  });
}

function paraStyle(paragraphXml) {
  return (paragraphXml.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
}

function bodyPara(text) {
  return [
    '<w:p>',
    '<w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:ind w:firstLine="420"/>',
    '<w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/><w:lang w:eastAsia="zh-CN"/></w:rPr></w:pPr>',
    '<w:r><w:rPr><w:sz w:val="24"/><w:lang w:eastAsia="zh-CN"/></w:rPr>',
    `<w:t>${escapeXml(text)}</w:t>`,
    '</w:r></w:p>',
  ].join('');
}

function heading2Para(text) {
  return [
    '<w:p>',
    '<w:pPr><w:pStyle w:val="21"/><w:spacing w:before="0" w:line="360" w:lineRule="auto"/>',
    '<w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:cs="宋体" w:hint="eastAsia"/>',
    '<w:color w:val="F36219"/><w:sz w:val="32"/><w:lang w:eastAsia="zh-CN"/></w:rPr></w:pPr>',
    '<w:r><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体" w:cs="宋体"/>',
    '<w:color w:val="F36219"/><w:sz w:val="32"/><w:lang w:eastAsia="zh-CN"/></w:rPr>',
    `<w:t>${escapeXml(text)}</w:t>`,
    '</w:r></w:p>',
  ].join('');
}

function findContentParagraph(paragraphs, anchorText) {
  return paragraphs.findIndex((paragraph) => paraText(paragraph) === anchorText && !paraStyle(paragraph).startsWith('TOC'));
}

function insertAfter(paragraphs, anchorText, newParagraphs) {
  const index = findContentParagraph(paragraphs, anchorText);
  if (index < 0) throw new Error(`Anchor not found: ${anchorText}`);
  paragraphs.splice(index + 1, 0, ...newParagraphs);
}

function replaceText(paragraphs, oldText, newText) {
  const index = findContentParagraph(paragraphs, oldText);
  if (index < 0) throw new Error(`Text not found: ${oldText}`);
  paragraphs[index] = setParaText(paragraphs[index], newText);
}

function replaceRange(paragraphs, startText, endText, replacement) {
  const start = findContentParagraph(paragraphs, startText);
  const end = findContentParagraph(paragraphs, endText);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Range not found: ${startText} -> ${endText}`);
  }
  paragraphs.splice(start, end - start, ...replacement);
}

function splitDocumentXml(xml) {
  const bodyStart = xml.indexOf('<w:body>');
  const bodyEnd = xml.indexOf('</w:body>');
  if (bodyStart < 0 || bodyEnd < 0) throw new Error('word/document.xml body not found');
  const prefix = xml.slice(0, bodyStart + '<w:body>'.length);
  const body = xml.slice(bodyStart + '<w:body>'.length, bodyEnd);
  const suffix = xml.slice(bodyEnd);
  const sectMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/);
  const sectPr = sectMatch ? sectMatch[0] : '';
  const contentBody = sectPr ? body.slice(0, body.length - sectPr.length) : body;
  const paragraphs = contentBody.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  return { prefix, suffix, sectPr, paragraphs };
}

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(input));
  let xml = await zip.file('word/document.xml').async('string');
  const doc = splitDocumentXml(xml);
  const { paragraphs } = doc;

  // Fix chapter 8 title style: it was accidentally using the subsection style.
  const chapter8Index = findContentParagraph(paragraphs, '第八章 实施计划与进度安排');
  if (chapter8Index < 0) throw new Error('Chapter 8 title not found');
  paragraphs[chapter8Index] = paragraphs[chapter8Index]
    .replace(/<w:pStyle w:val="21"\/>/, '<w:pStyle w:val="1"/>')
    .replace(/<w:color w:val="F36219"\/>/g, '<w:color w:val="2D231C"/>');

  insertAfter(paragraphs, '这一特色使项目具备更强的社会服务能力。传统公益项目往往依赖线下宣讲人数和活动场次，服务半径有限；本项目通过平台把课程、云展、史料检索、AI问答、数字复原、群众投稿和后台审核统一起来，使未能到场的公众也能在线访问、学习、提问和参与共建。线下实践提供真实材料和服务场景，线上平台负责长期保存、二次加工和持续传播，两者不是并列关系，而是相互转化、相互增值的整体。', [
    heading2Para('5.6 特色五：以平台化UI实现史料治理与公益服务一体化'),
    bodyPara('本项目第五项特色，是把线上平台从“成果展示页”提升为项目运行的主界面和公共服务入口。平台首页以全站搜索、工业时间轴、工业地图、企业遗址、人物故事、史实核验、数字复原、公益课程、活动记录和史料投稿等功能形成清晰导航，用户进入平台后能够像进入一座线上博物馆、线上史料馆和公益教育工作台一样，自主检索、阅读、提问、投稿和下载资源。'),
    bodyPara('平台UI不是把资料简单堆放在网页上，而是以“对象卡片+时间线+地图+信息链图谱+详情页”的方式组织内容。线下调查获得的照片、访谈、地图点位和口述线索，进入后台后先转化为结构化史料；史料再通过AI摘要、关键词、人物地点识别和关联推荐形成线索链；最终在前台输出为人物关系、企业脉络、空间位置和历史事件组成的完整历史链条。'),
    bodyPara('这一平台能力使项目完成了知识的高度转化。普通搜索只能回答“有没有相关资料”，而本项目的AI融合搜索可以进一步提供概述、问答、证据片段、相关史料和关系图谱，帮助公众从零散线索中理解南京民族工业的发展脉络。教师可以用它备课，志愿者可以用它生成讲解提纲，群众可以通过投稿参与史料共建，后台团队则通过审核机制把社会记忆转化为可公开使用的公益资源。'),
    bodyPara('平台还承载数字复原成果的长期复用。根据史料、旧照和实地调研形成的复原图、热点说明和三维模型，可集中在数字复原页面展示，并为课程、展板、短视频、研学活动和后续研究提供模型下载或素材调用入口。由此，项目不只服务一次展览或一次课堂，而是形成面向更广泛群众、可持续开放的南京民族工业数字资源平台。'),
  ]);

  replaceText(paragraphs, '5.6 创新点概括', '5.7 创新点概括');
  insertAfter(paragraphs, '线上云展、流动微展、传播矩阵。', [
    bodyPara('平台创新'),
    bodyPara('构建集线上史料馆、AI搜索问答、信息链图谱、公众投稿、后台审核和数字复原资源管理于一体的平台化UI。'),
    bodyPara('解决传统项目线上线下割裂、资料沉淀弱、群众参与入口少、知识转化不足的问题。'),
    bodyPara('线上博物馆、史料馆、AI问答系统、信息链图谱、投稿审核工作台、数字模型资源库。'),
  ]);
  replaceText(paragraphs, '5.7 与同类项目的差异化优势', '5.8 与同类项目的差异化优势');
  replaceText(paragraphs, '5.8 项目特色总结', '5.9 项目特色总结');
  replaceText(
    paragraphs,
    '概括而言，本项目以南京民族工业群为叙事对象，以史料证据链为专业基础，以场景化数字表达为方法，以公益课程和流动微展为落地载体，以青年志愿服务为组织机制。其特色不是“做一次工业遗产宣传”，而是构建一套能够持续服务青少年、能够被学校社区复用、能够体现南京城市精神和工业红色记忆的公益教育体系。',
    '概括而言，本项目以南京民族工业群为叙事对象，以史料证据链为专业基础，以平台化UI和AI辅助治理为核心支撑，以场景化数字表达、公益课程和流动微展为落地载体，以青年志愿服务和公众史料共建为组织机制。其特色不是“做一次工业遗产宣传”，也不是简单的线上展示加线下活动，而是构建一套能够持续服务青少年、能够被学校社区复用、能够面向公众开放、能够把线下实践不断转化为线上知识资产的公益教育平台。'
  );

  replaceRange(paragraphs, '5.8 与同类项目的差异化优势', '5.9 项目特色总结', [
    heading2Para('5.8 与同类项目的差异化优势'),
    bodyPara('比较维度'),
    bodyPara('传统项目常见模式'),
    bodyPara('本项目平台UI与功能模式'),
    bodyPara('形成的特色优势'),
    bodyPara('服务入口'),
    bodyPara('线上多为宣传页、活动报道或资料下载页，线下活动另行组织。'),
    bodyPara('平台以首页导航和功能模块统一承载搜索、云展、时间轴、地图、遗址、人物、史实、课程、活动和投稿入口。'),
    bodyPara('公众进入一个平台即可完成浏览、检索、学习、提问、投稿和资源获取，服务半径远大于单次线下活动。'),
    bodyPara('史料组织'),
    bodyPara('资料多以表格、文件夹或展板文案保存，后续复用依赖人工查找。'),
    bodyPara('平台将史料转化为对象卡片和详情页，记录来源等级、摘要、关键词、人物地点、关联对象和审核状态。'),
    bodyPara('线下调查成果可以持续回流史料库，避免资料散落，形成可维护、可追溯、可复用的线上史料馆。'),
    bodyPara('知识检索'),
    bodyPara('普通搜索只能返回标题或关键词匹配结果，难以解释史料之间的关系。'),
    bodyPara('AI融合搜索结合史料摘要、实体标签和上下文关系，提供概述、问答、证据片段、相关史料和信息链图谱。'),
    bodyPara('平台输出的是历史链条和解释框架，而不是零散资料列表，能够支撑教师备课、志愿讲解和公众自学。'),
    bodyPara('线上线下联动'),
    bodyPara('线下调研和活动常常停留在照片记录、新闻稿和一次性反馈。'),
    bodyPara('线下访谈、拍摄、问卷和群众线索进入后台，经AI预审和人工核查后转化为史料、课程、云展和数字复原素材。'),
    bodyPara('线上与线下不是并列关系，而是“线下采集—线上沉淀—AI整理—人工核查—公益输出”的闭环。'),
    bodyPara('公众共建'),
    bodyPara('资料来源主要依赖团队收集，社会公众参与多停留在观看和点赞。'),
    bodyPara('平台设置群众史料投稿入口，后台对投稿进行摘要、可信提示、审核和入库管理。'),
    bodyPara('项目能够持续吸收社会记忆，扩大工业遗产保护传播的参与面。'),
    bodyPara('数字复原'),
    bodyPara('复原成果多以图片或视频展示，使用场景有限。'),
    bodyPara('平台集中展示复原图、热点说明、三维模型和相关史料，并预留模型下载或素材调用入口。'),
    bodyPara('数字复原成果可服务课程、展板、短视频、研学活动和后续研究，资源利用效率更高。'),
  ]);

  const body = paragraphs.join('') + doc.sectPr;
  xml = doc.prefix + body + doc.suffix;

  zip.file('word/document.xml', xml);

  const settingsFile = zip.file('word/settings.xml');
  if (settingsFile) {
    let settings = await settingsFile.async('string');
    if (!settings.includes('<w:updateFields')) {
      settings = settings.replace('</w:settings>', '<w:updateFields w:val="true"/></w:settings>');
      zip.file('word/settings.xml', settings);
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(output, buffer);
  console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
