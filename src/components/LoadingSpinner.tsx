'use client'

interface LoadingSpinnerProps {
  message: string
  size?: 'small' | 'medium' | 'large'
  showProgress?: boolean
}

export default function LoadingSpinner({
  message,
  size = 'medium',
  showProgress = false
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'p-4',
          spinner: 'w-6 h-6',
          text: 'text-sm'
        }
      case 'large':
        return {
          container: 'p-8',
          spinner: 'w-12 h-12',
          text: 'text-lg'
        }
      default:
        return {
          container: 'p-6',
          spinner: 'w-8 h-8',
          text: 'text-base'
        }
    }
  }

  const { container, spinner, text } = getSizeClasses()

  return (
    <div className={`bg-white rounded-lg shadow-lg ${container} flex flex-col items-center`}>
      {/* Animated spinner */}
      <div className={`${spinner} mb-4 relative`}>
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>

      {/* Message */}
      <p className={`${text} font-medium text-gray-800 text-center mb-2`}>
        {message}
      </p>

      {/* Progress dots */}
      {showProgress && (
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
    </div>
  )
}