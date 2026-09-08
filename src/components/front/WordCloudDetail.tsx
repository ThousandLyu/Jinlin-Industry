'use client'
import type { WordCloudItem } from '@/lib/wordCloudUtils'

interface WordCloudDetailProps {
  word: WordCloudItem
  onClose: () => void
}

export default function WordCloudDetail({ word, onClose }: WordCloudDetailProps) {
  if (!word) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-panel rounded-t-2xl max-h-[50vh] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-brown">
            "{word.text}" — {word.totalRelated}条相关史料
          </h3>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-brown text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {(word.relatedSources || []).slice(0, 20).map((source, idx) => (
            <a
              key={source.id}
              href={`/sources/${source.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-cream transition-colors group no-underline"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold/20 text-gold text-xs flex items-center justify-center font-medium">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-brown group-hover:text-gold transition-colors truncate">
                  {source.title}
                </div>
                <div className="text-xs text-ink-soft mt-0.5">
                  <span className={`font-medium ${
                    source.grade === 'A' ? 'text-green-600' :
                    source.grade === 'B' ? 'text-blue-600' : 'text-gray-500'
                  }`}>[{source.grade}级]</span>
                  {' · '}
                  关联度 {'★'.repeat(Math.min(5, source.count))}
                </div>
              </div>
              <span className="text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                查看 →
              </span>
            </a>
          ))}
        </div>

        {word.totalRelated > 20 && (
          <p className="text-xs text-ink-soft text-center mt-4">
            仅显示前20条，共{word.totalRelated}条关联史料
          </p>
        )}
      </div>
    </div>
  )
}
