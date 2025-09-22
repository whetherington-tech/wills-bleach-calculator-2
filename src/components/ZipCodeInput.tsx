'use client'

import { useState, useEffect } from 'react'

interface ZipCodeInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  error?: string
}

export default function ZipCodeInput({
  value,
  onChange,
  onSubmit,
  loading,
  error
}: ZipCodeInputProps) {
  const [validationError, setValidationError] = useState('')
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (value.length === 0) {
      setValidationError('')
      setIsValid(false)
      return
    }

    if (value.length < 5) {
      setValidationError('Zip code must be 5 digits')
      setIsValid(false)
      return
    }

    if (!/^\d{5}$/.test(value)) {
      setValidationError('Zip code must contain only numbers')
      setIsValid(false)
      return
    }

    setValidationError('')
    setIsValid(true)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, '').slice(0, 5)
    onChange(input)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !loading) {
      onSubmit()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !loading) {
      onSubmit()
    }
  }

  return (
    <div className="wf-gradient-card wf-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xl">🌍</span>
        <h2 className="wf-h2 wf-text-gradient">
          ENTER YOUR ZIP CODE
        </h2>
      </div>
      <p className="wf-body mb-6">
        Let's find your local water utility to reveal how much chlorine you're actually consuming
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              id="zipCode"
              value={value}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 37067"
              className={`
                wf-input w-full text-lg
                ${validationError || error
                  ? 'border-red-400 focus:border-red-500'
                  : isValid
                    ? 'border-green-400 focus:border-green-500'
                    : ''
                }
              `}
              maxLength={5}
              disabled={loading}
              aria-describedby={validationError || error ? 'zip-error' : undefined}
              aria-invalid={!!(validationError || error)}
            />

            {/* Validation feedback */}
            {validationError && (
              <p id="zip-error" className="mt-1 text-sm text-red-600" role="alert">
                {validationError}
              </p>
            )}

            {value.length === 5 && isValid && (
              <p className="mt-1 text-sm text-green-600 flex items-center">
                <span className="mr-1">✓</span>
                Valid zip code
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            className={`
              wf-button-primary text-lg px-8 py-4 min-w-[180px]
              ${!isValid || loading ? 'opacity-50' : ''}
            `}
            aria-label="Find water utilities for entered zip code"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                FIND UTILITIES
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Helper text */}
      <p className="mt-2 text-sm wf-body">
        Enter your 5-digit zip code to find water utilities in your area
      </p>
    </div>
  )
}