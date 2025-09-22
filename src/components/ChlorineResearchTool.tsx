'use client'

import { useState } from 'react'

export default function ChlorineResearchTool() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const researchSingleUtility = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/research-and-store?action=research_single&pwsid=TN0000247&utility=MILCROFTON%20UTILITY%20DISTRICT&city=Franklin&state=Tennessee', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data)
      } else {
        setError(data.message || 'Research failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const researchAllCities = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/research-and-store?action=research_cities', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data)
      } else {
        setError(data.message || 'Research failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔬 Chlorine Data Research Tool
      </h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={researchSingleUtility}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Researching...' : 'Research Milcrofton Utility'}
        </button>
        
        <button
          onClick={researchAllCities}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
        >
          {loading ? 'Researching All Cities...' : 'Research Nashville, Brentwood & Franklin'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ Error: {error}</p>
        </div>
      )}

      {results && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📊 Research Results
          </h3>
          
          {results.fromCache && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">💾 Data retrieved from cache (no new research needed)</p>
            </div>
          )}
          
          {results.data && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Chlorine Data:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Average:</span> {results.data.average_chlorine_ppm} PPM
                </div>
                <div>
                  <span className="font-medium">Range:</span> {results.data.min_chlorine_ppm} - {results.data.max_chlorine_ppm} PPM
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {results.data.last_updated}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {results.data.data_source}
                </div>
              </div>
              {results.sourceUrl && (
                <div className="mt-2">
                  <span className="font-medium">Source URL:</span> 
                  <a href={results.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    {results.sourceUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {results.results && (
            <div className="space-y-4">
              {results.results.map((cityResult: any, index: number) => (
                <div key={index} className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    🏙️ {cityResult.city}
                  </h4>
                  
                  {cityResult.utilities && cityResult.utilities.length > 0 ? (
                    <div className="space-y-2">
                      {cityResult.utilities.map((utility: any, utilIndex: number) => (
                        <div key={utilIndex} className="border-l-4 border-gray-200 pl-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{utility.utilityName}</p>
                              <p className="text-sm text-gray-600">PWSID: {utility.pwsid}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                utility.status === 'cached' ? 'bg-yellow-100 text-yellow-800' :
                                utility.status === 'researched' ? 'bg-green-100 text-green-800' :
                                utility.status === 'no_ccr_found' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {utility.status}
                              </span>
                            </div>
                          </div>
                          
                          {utility.data && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Chlorine:</span> {utility.data.average_chlorine_ppm} PPM 
                              ({utility.data.min_chlorine_ppm} - {utility.data.max_chlorine_ppm} PPM)
                            </div>
                          )}
                          
                          {utility.error && (
                            <div className="mt-2 text-sm text-red-600">
                              Error: {utility.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No utilities found for this city</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
