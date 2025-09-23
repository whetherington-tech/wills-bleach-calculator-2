'use client'

interface ProgressIndicatorProps {
  currentStep: 'zip' | 'utility' | 'glasses' | 'shower' | 'loading' | 'results'
}

const steps = [
  { key: 'zip', label: 'Enter Zip Code', icon: '📍' },
  { key: 'utility', label: 'Select Utility', icon: '🏢' },
  { key: 'glasses', label: 'Daily Intake', icon: '🥤' },
  { key: 'shower', label: 'Shower Duration', icon: '🚿' },
  { key: 'results', label: 'View Results', icon: '📊' }
]

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const getCurrentStepIndex = () => {
    if (currentStep === 'loading') return 3 // Show as step 4 when loading
    return steps.findIndex(step => step.key === currentStep)
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <div className="w-full mb-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto' }}>
              {/* Step Circle */}
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-lg
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-200' : ''}
                  ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span className={`
                mt-3 text-xs font-medium text-center leading-tight
                ${isCompleted ? 'text-green-600' : ''}
                ${isCurrent ? 'text-blue-600' : ''}
                ${isUpcoming ? 'text-gray-400' : ''}
              `} style={{ minWidth: '80px' }}>
                {step.label}
              </span>
            </div>
          )
        })}

        {/* Background connector line */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded" style={{ zIndex: 1 }}></div>

        {/* Progress connector line */}
        <div
          className="absolute top-6 h-1 bg-green-500 rounded transition-all duration-500"
          style={{
            zIndex: 2,
            left: '24px',
            right: currentStepIndex >= steps.length - 1 ? '24px' : 'auto',
            width: currentStepIndex >= steps.length - 1 ? 'calc(100% - 48px)' : `${(currentStepIndex / (steps.length - 1)) * (100 - 12)}%`,
            transform: 'translateX(0)'
          }}
        ></div>
      </div>
    </div>
  )
}