'use client'

import { WaterUtility, WaterSystem } from '@/types/database'

interface UtilitySelectorProps {
  utilities: (WaterUtility | WaterSystem)[]
  selectedUtility: WaterUtility | WaterSystem | null
  onSelect: (pwsid: string) => void
  onContinue: () => void
  loading?: boolean
}

export default function UtilitySelector({
  utilities,
  selectedUtility,
  onSelect,
  onContinue,
  loading = false
}: UtilitySelectorProps) {
  const formatUtilityName = (utility: WaterUtility | WaterSystem) => {
    const name = 'utility_name' in utility ? utility.utility_name : utility.pws_name
    const city = 'city' in utility ? utility.city : utility.city_name
    const state = 'state' in utility ? utility.state : utility.state_code
    const population = 'population_served' in utility ? utility.population_served : utility.population_served_count
    const isMunicipal = 'owner_type_code' in utility && ['L', 'M'].includes(utility.owner_type_code)

    return {
      name,
      location: `${city}, ${state}`,
      population: typeof population === 'number' ? population.toLocaleString() : population,
      type: isMunicipal ? 'Municipal' : 'Private'
    }
  }

  return (
    <div className="wf-gradient-card wf-card">
      <div className="mb-6">
        <h2 className="wf-h2 wf-text-gradient mb-4 flex items-center gap-3">
          <span className="text-xl">🏢</span>
          SELECT YOUR WATER UTILITY
        </h2>
        <p className="wf-body mb-6">
          Found {utilities.length} water {utilities.length === 1 ? 'utility' : 'utilities'} in your area. Select yours to discover your chlorine consumption.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {utilities.map((utility) => {
          const info = formatUtilityName(utility)
          const isSelected = selectedUtility?.pwsid === utility.pwsid

          return (
            <div
              key={utility.pwsid}
              onClick={() => onSelect(utility.pwsid)}
              className={`
                p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                ${isSelected
                  ? 'border-[#012B45] bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-[#012B45] ring-opacity-20 transform scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-[#004F71] hover:shadow-lg hover:transform hover:scale-[1.01]'
                }
              `}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(utility.pwsid)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`font-bold text-xl ${isSelected ? 'text-[#012B45]' : 'text-gray-900'}`}>
                    {info.name}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-[#485258]' : 'text-gray-600'} flex items-center gap-2`}>
                    <span className="text-base">📍</span>
                    {info.location}
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      info.type === 'Municipal'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {info.type}
                    </span>
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#012B45]' : 'text-gray-600'} flex items-center gap-1`}>
                      <span className="text-base">👥</span>
                      {info.population} served
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  {isSelected && (
                    <div className="w-8 h-8 bg-[#012B45] rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">✓</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-200 pt-6 mt-6">
        <button
          onClick={onContinue}
          disabled={!selectedUtility || loading}
          className={`
            wf-button-primary w-full py-4 px-8 text-lg
            ${!selectedUtility || loading ? 'opacity-50' : ''}
          `}
          aria-label="Continue to water intake input"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading...
            </span>
          ) : (
            'CONTINUE →'
          )}
        </button>
      </div>

      {selectedUtility && (
        <p className="mt-2 text-sm text-gray-600 text-center">
          Selected: {formatUtilityName(selectedUtility).name}
        </p>
      )}
    </div>
  )
}