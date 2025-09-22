'use client'

import React, { useState } from 'react'

interface ManualChlorineEntryProps {
  utilityInfo: {
    pwsid: string
    utilityName: string
    city: string
    state: string
  }
  errorInfo: {
    errorType: string
    userMessage: string
    searchedUrls: string[]
    manualEntryInstructions: string[]
    nextSteps: string[]
  }
  onSuccess: (data: any) => void
  onCancel: () => void
}

export default function ManualChlorineEntry({ 
  utilityInfo, 
  errorInfo, 
  onSuccess, 
  onCancel 
}: ManualChlorineEntryProps) {
  const [formData, setFormData] = useState({
    averageChlorine: '',
    minChlorine: '',
    maxChlorine: '',
    sampleCount: '',
    sourceUrl: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/manual-chlorine-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pwsid: utilityInfo.pwsid,
          utilityName: utilityInfo.utilityName,
          city: utilityInfo.city,
          state: utilityInfo.state,
          averageChlorine: formData.averageChlorine,
          minChlorine: formData.minChlorine || null,
          maxChlorine: formData.maxChlorine || null,
          sampleCount: formData.sampleCount || null,
          sourceUrl: formData.sourceUrl || null,
          notes: formData.notes || null
        })
      })

      const result = await response.json()

      if (result.success) {
        onSuccess(result.data)
      } else {
        setSubmitError(result.error || 'Failed to save chlorine data')
      }
    } catch (error) {
      setSubmitError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Manual Chlorine Data Entry
        </h2>
        <p className="text-gray-600">
          {errorInfo.userMessage}
        </p>
      </div>

      {/* Error Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-800 mb-2">Why Manual Entry is Needed:</h3>
        <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
          {errorInfo.manualEntryInstructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ul>
      </div>

      {/* Utility Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">Utility Information:</h3>
        <p className="text-blue-700">
          <strong>{utilityInfo.utilityName}</strong><br />
          {utilityInfo.city}, {utilityInfo.state}<br />
          PWSID: {utilityInfo.pwsid}
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">How to Find Chlorine Data:</h3>
        <ul className="list-disc list-inside text-green-700 text-sm space-y-1">
          {errorInfo.nextSteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="averageChlorine" className="block text-sm font-medium text-gray-700 mb-1">
              Average Chlorine Level (ppm) *
            </label>
            <input
              type="number"
              step="0.01"
              id="averageChlorine"
              name="averageChlorine"
              value={formData.averageChlorine}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1.25"
            />
          </div>

          <div>
            <label htmlFor="sampleCount" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Samples (optional)
            </label>
            <input
              type="number"
              id="sampleCount"
              name="sampleCount"
              value={formData.sampleCount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minChlorine" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Level (ppm) (optional)
            </label>
            <input
              type="number"
              step="0.01"
              id="minChlorine"
              name="minChlorine"
              value={formData.minChlorine}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 0.8"
            />
          </div>

          <div>
            <label htmlFor="maxChlorine" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Level (ppm) (optional)
            </label>
            <input
              type="number"
              step="0.01"
              id="maxChlorine"
              name="maxChlorine"
              value={formData.maxChlorine}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1.8"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
            CCR Report URL (optional)
          </label>
          <input
            type="url"
            id="sourceUrl"
            name="sourceUrl"
            value={formData.sourceUrl}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/ccr-report.pdf"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional information about the chlorine data..."
          />
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{submitError}</p>
          </div>
        )}

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.averageChlorine}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Chlorine Data'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Searched URLs */}
      {errorInfo.searchedUrls.length > 0 && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">CCR Reports Found:</h3>
          <ul className="space-y-1">
            {errorInfo.searchedUrls.map((url, index) => (
              <li key={index}>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
