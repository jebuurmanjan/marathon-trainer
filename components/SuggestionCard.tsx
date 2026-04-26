import { Suggestion } from '@/types'

interface SuggestionCardProps {
  suggestion: Suggestion
  isLatest?: boolean
}

export default function SuggestionCard({ suggestion, isLatest }: SuggestionCardProps) {
  const date = new Date(suggestion.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#EDE9DE',
        border: '1px solid rgba(43,49,23,0.08)',
        borderLeft: `3px solid ${isLatest ? '#EE6B17' : '#8879E1'}`,
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {isLatest && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(238,107,23,0.12)', color: '#EE6B17' }}
              >
                Latest
              </span>
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(43,49,23,0.08)', color: '#736554' }}
            >
              Week {suggestion.weekNumber}
            </span>
          </div>
          <span className="text-xs shrink-0" style={{ color: '#736554' }}>{date}</span>
        </div>

        <div
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: '#1E1611' }}
        >
          {suggestion.suggestion}
        </div>
      </div>
    </div>
  )
}
