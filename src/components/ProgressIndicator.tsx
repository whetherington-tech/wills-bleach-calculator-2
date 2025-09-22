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
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-200' : ''}
                    ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? '✓' : step.icon}
                </div>
                <span className={`
                  mt-2 text-xs font-medium text-center max-w-20 leading-tight
                  ${isCompleted ? 'text-green-600' : ''}
                  ${isCurrent ? 'text-blue-600' : ''}
                  ${isUpcoming ? 'text-gray-400' : ''}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={`
                      h-1 rounded transition-all duration-300
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}