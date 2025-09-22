'use client'

interface ErrorDisplayProps {
  error: string
  type?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  suggestions?: string[]
}

export default function ErrorDisplay({
  error,
  type = 'error',
  onRetry,
  suggestions = []
}: ErrorDisplayProps) {
  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          accentColor: 'text-yellow-600'
        }
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          accentColor: 'text-blue-600'
        }
      default:
        return {
          icon: '⚠️',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          accentColor: 'text-red-600'
        }
    }
  }

  const { icon, bgColor, borderColor, textColor, accentColor } = getIconAndColors()

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-lg p-6`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1">
          <p className={`${textColor} text-lg font-medium mb-2`}>
            {error}
          </p>

          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className={`${accentColor} font-medium text-sm mb-2`}>
                Try these suggestions:
              </p>
              <ul className={`${textColor} text-sm space-y-1 list-disc list-inside`}>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}