import { NextRequest, NextResponse } from 'next/server';
import { semanticSearchSources } from '@/lib/semanticSearch';
import { getLinkNetwork } from '@/lib/linkService';
import { narrateChain } from '@/lib/aiClient';
import { db } from '@/lib/dataService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const maxDepth = Math.min(5, Number(searchParams.get('maxDepth')) || 3);
  const maxItems = Math.min(20, Number(searchParams.get('maxItems')) || 10);

  if (!q.trim()) {
    return NextResponse.json({ success: true, chain: null, narrative: null });
  }

  // 1. 语义检索找入口史料
  const searchResults = await semanticSearchSources(q, 3);
  const entryIds = searchResults.map(r => r.id);

  if (entryIds.length === 0) {
    return NextResponse.json({ success: true, chain: null, narrative: '未找到相关史料入口。' });
  }

  // 2. BFS展开关联网络
  const network = await getLinkNetwork(entryIds, maxDepth);

  // 3. 补充所有图节点摘要，避免非入口节点弹窗为空
  const [sources, people, sites] = await Promise.all([
    db.sources.getAll(),
    db.people.getAll(),
    db.sites.getAll(),
  ]);
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  const peopleMap = new Map(people.map(p => [p.id, p]));
  const siteMap = new Map(sites.map(s => [s.id, s]));
  const limitedNodes = network.nodes.slice(0, maxItems);
  const nodeSummaries = limitedNodes.map(n => {
    const source = sourceMap.get(n.id);
    const person = peopleMap.get(n.id);
    const site = siteMap.get(n.id);
    const title = source?.title || person?.name || site?.name || n.title || n.id;
    return {
      id: n.id,
      title,
      summary: source?.aiSummary || source?.description || person?.biography || site?.description || '',
      grade: source?.credibilityLevel || '',
      fileType: source?.fileType || '',
      type: n.type || (person ? 'person' : site ? 'site' : 'source'),
    };
  });
  const nodeDetails = nodeSummaries.map(n => ({ title: n.title, summary: n.summary }));

  const edgeDetails = network.edges.map(e => ({
    relationType: e.relationType,
    confidence: e.confidence,
    reason: e.aiReason || '',
  }));

  // 4. AI讲解
  const narrative = await narrateChain({ nodes: nodeDetails, edges: edgeDetails });

  return NextResponse.json({
    success: true,
    chain: {
      nodes: limitedNodes,
      edges: network.edges,
      entryIds,
    },
    narrative,
    nodeSummaries,
    entrySources: searchResults.slice(0, 3),
  });
}
