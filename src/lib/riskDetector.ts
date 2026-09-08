import type { Source } from '@/types';

export const RISK_WORDS: string[] = [
  '第一',
  '首创',
  '最大',
  '唯一',
  '最早',
  '奠基',
  '标志性',
  '全国第一',
  '中国第一',
  '远东第一',
  '亚洲第一',
];

export function detectRiskWords(text: string): string[] {
  if (!text) return [];
  return RISK_WORDS.filter((word) => text.includes(word));
}

export function assessRiskLevel(
  riskWords: string[],
  sources: { credibilityLevel: string }[]
): 'high' | 'medium' | 'low' {
  if (riskWords.length >= 2) {
    return 'high';
  }

  if (riskWords.length === 1) {
    const ultraHighRiskWords = ['全国第一', '中国第一', '远东第一', '亚洲第一'];
    if (ultraHighRiskWords.some(w => riskWords.includes(w))) {
      return 'high';
    }
    return 'medium';
  }

  return 'low';
}

export function canPublishFact(
  fact: { riskWords: string[]; sourceIds: string[] },
  sources: { id: string; credibilityLevel: string }[]
): { canPublish: boolean; reason?: string } {
  if (!fact.sourceIds || fact.sourceIds.length === 0) {
    return { canPublish: false, reason: '未绑定史料来源' };
  }

  if (fact.riskWords && fact.riskWords.length > 0) {
    const boundSources = sources.filter(s => fact.sourceIds.includes(s.id));
    if (boundSources.length > 0 && boundSources.every(s => s.credibilityLevel === 'C')) {
      return { canPublish: false, reason: 'C级史料不能单独支撑含有风险词的史实' };
    }
  }

  return { canPublish: true };
}

export function validatePublicExpression(
  claimText: string,
  publicExpression: string
): { valid: boolean; suggestion?: string } {
  if (!publicExpression || publicExpression.trim() === '') {
    return { valid: false, suggestion: '请提供公开展示表述' };
  }

  const matchedRiskWords = detectRiskWords(publicExpression);
  if (matchedRiskWords.length > 0) {
    return {
      valid: false,
      suggestion: `公开展示表述包含风险词：${matchedRiskWords.join('、')}，请改写为更温和的表述`,
    };
  }

  return { valid: true };
}