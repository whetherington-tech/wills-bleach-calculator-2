'use client'

import { useState } from 'react'

interface ShowerDurationInputProps {
  onDurationSelected: (minutes: number) => void
  initialDuration?: number
}

export default function ShowerDurationInput({ onDurationSelected, initialDuration = 10 }: ShowerDurationInputProps) {
  const [selectedDuration, setSelectedDuration] = useState(initialDuration)
  const [customDuration, setCustomDuration] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  const commonDurations = [
    { minutes: 5, label: '5 minutes', description: 'Quick shower' },
    { minutes: 10, label: '10 minutes', description: 'Average shower' },
    { minutes: 15, label: '15 minutes', description: 'Longer shower' },
    { minutes: 20, label: '20 minutes', description: 'Extended shower' },
    { minutes: 25, label: '25+ minutes', description: 'Very long shower' }
  ]

  const handleDurationSelect = (minutes: number) => {
    setSelectedDuration(minutes)
    setIsCustom(false)
    setCustomDuration('')
    onDurationSelected(minutes)
  }

  const handleCustomDuration = (value: string) => {
    setCustomDuration(value)
    const minutes = parseInt(value)
    if (!isNaN(minutes) && minutes > 0 && minutes <= 60) {
      setSelectedDuration(minutes)
      onDurationSelected(minutes)
    }
  }

  const handleCustomToggle = () => {
    setIsCustom(true)
    setSelectedDuration(0)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
      <h3 className="wf-h3 mb-4 flex items-center gap-3">
        <span className="text-xl">🚿</span>
        HOW LONG ARE YOUR SHOWERS?
      </h3>
      <p className="wf-body text-gray-600 mb-6 text-center">
        Chlorine absorption through skin and inhalation during showers can exceed drinking water exposure
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {commonDurations.map((option) => (
          <button
            key={option.minutes}
            onClick={() => handleDurationSelect(option.minutes)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedDuration === option.minutes && !isCustom
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
              }
            `}
          >
            <div className="font-semibold text-gray-800 mb-1">
              {option.label}
            </div>
            <div className="text-sm text-gray-600">
              {option.description}
            </div>
          </button>
        ))}

        <button
          onClick={handleCustomToggle}
          className={`
            p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${isCustom
              ? 'border-purple-500 bg-purple-50 shadow-md'
              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
            }
          `}
        >
          <div className="font-semibold text-gray-800 mb-1">
            Custom
          </div>
          <div className="text-sm text-gray-600">
            Enter your own time
          </div>
        </button>
      </div>

      {isCustom && (
        <div className="bg-purple-50 p-4 rounded-lg mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter shower duration (1-60 minutes):
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={customDuration}
            onChange={(e) => handleCustomDuration(e.target.value)}
            placeholder="e.g., 12"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {customDuration && parseInt(customDuration) > 0 && parseInt(customDuration) <= 60 && (
            <div className="mt-2 text-sm text-green-600">
              ✓ {customDuration} minute shower selected
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Did You Know?</h4>
        <p className="text-sm text-blue-700">
          Studies show that a 10-minute shower can expose you to more chlorine through
          skin absorption and inhalation than drinking 8 glasses of water throughout the day.
        </p>
      </div>

      {selectedDuration > 0 && (
        <div className="mt-4 text-center">
          <div className="inline-block bg-purple-100 px-4 py-2 rounded-lg">
            <span className="text-purple-800 font-medium">
              Selected: {selectedDuration} minute{selectedDuration !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}