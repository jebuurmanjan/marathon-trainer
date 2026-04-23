import { Suggestion } from '@/types'

interface SuggestionCardProps {
  suggestion: Suggestion
  isLatest?: boolean
}

export default function SuggestionCard({ suggestion, isLatest }: SuggestionCardProps) {
  const date = new Date(suggestion.generatedAt).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className={`rounded-xl border p-5 ${
        isLatest
          ? 'border-orange-500/50 bg-gray-900 shadow-lg shadow-orange-500/10'
          : 'border-gray-800 bg-gray-950'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isLatest && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
              Latest
            </span>
          )}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            Week {suggestion.weekNumber}
          </span>
        </div>
        <span className="text-xs text-gray-600 shrink-0">{date}</span>
      </div>

      <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
        {suggestion.suggestion}
      </div>
    </div>
  )
}
