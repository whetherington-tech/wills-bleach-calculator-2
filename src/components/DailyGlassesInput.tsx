'use client'

import { useState, useEffect } from 'react'

interface DailyGlassesInputProps {
  value: number
  onChange: (value: number) => void
  onCalculate: () => void
  loading: boolean
  utilityName?: string
}

export default function DailyGlassesInput({
  value,
  onChange,
  onCalculate,
  loading,
  utilityName
}: DailyGlassesInputProps) {
  const [inputError, setInputError] = useState('')

  useEffect(() => {
    if (value <= 0) {
      setInputError('Please enter a number greater than 0')
    } else if (value > 50) {
      setInputError('That seems like a lot! Please enter a reasonable number (1-50)')
    } else {
      setInputError('')
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0
    onChange(newValue)
  }

  const presetValues = [6, 8, 10, 12]

  const getHealthTip = (glasses: number) => {
    if (glasses < 6) return 'Consider drinking more water for better hydration'
    if (glasses <= 8) return 'Great! This meets recommended daily intake'
    if (glasses <= 12) return 'Excellent hydration habits!'
    return 'Wow, you drink a lot of water!'
  }

  return (
    <div className="wf-gradient-card wf-card">
      <div className="mb-6">
        <h2 className="wf-h2 wf-text-gradient mb-4 flex items-center gap-3">
          <span className="text-xl">🥤</span>
          DAILY WATER INTAKE
        </h2>
        <p className="wf-body mb-4">
          Tell us how many 16oz glasses of tap water you drink per day from {utilityName || 'your utility'}
        </p>
        {utilityName && (
          <p className="text-sm wf-body mb-4">
            We&apos;ll calculate your chlorine intake from <strong>{utilityName}</strong>
          </p>
        )}
      </div>

      {/* Preset buttons */}
      <div className="mb-6">
        <p className="text-sm font-medium wf-body mb-3">Quick select:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presetValues.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`
                px-4 py-3 rounded-2xl border-2 transition-all duration-300 font-medium
                ${value === preset
                  ? 'bg-[#012B45] text-white border-[#012B45] transform scale-105'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#004F71] hover:shadow-md'
                }
              `}
              type="button"
            >
              {preset} glasses
            </button>
          ))}
        </div>
      </div>

      {/* Number input */}
      <div className="mb-6">
        <label htmlFor="glasses" className="block text-sm font-medium wf-body mb-2">
          Or enter a custom amount:
        </label>
        <input
          type="number"
          id="glasses"
          value={value || ''}
          onChange={handleInputChange}
          min="1"
          max="50"
          className={`
            wf-input w-full text-lg
            ${inputError ? 'border-red-400 focus:border-red-500' : ''}
          `}
          placeholder="Enter number of glasses"
          disabled={loading}
          aria-describedby={inputError ? 'glasses-error' : 'glasses-help'}
          aria-invalid={!!inputError}
        />

        {inputError && (
          <p id="glasses-error" className="mt-1 text-sm text-red-600" role="alert">
            {inputError}
          </p>
        )}

        {!inputError && value > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-600">
              {getHealthTip(value)}
            </p>
            <p id="glasses-help" className="text-xs text-gray-500">
              That&apos;s about {(value * 16 * 0.0295735).toFixed(1)} liters per day
            </p>
          </div>
        )}
      </div>

      {/* Calculate button */}
      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={onCalculate}
          disabled={value <= 0 || !!inputError || loading}
          className={`
            wf-button-primary w-full py-4 px-8 text-lg
            ${value <= 0 || !!inputError || loading ? 'opacity-50' : ''}
          `}
          aria-label="Calculate chlorine intake based on daily water consumption"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Calculating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg">🧮</span>
              CONTINUE
            </span>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> We use 16oz glasses as the standard measurement.
          Adjust the number if your glasses are different sizes.
        </p>
      </div>
    </div>
  )
}