'use client'

import { useState } from 'react'

export default function DatabaseDiagnostic() {
  const [diagnosing, setDiagnosing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const runDiagnostic = async () => {
    setDiagnosing(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('/api/diagnose')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Diagnostic failed')
      }
      
      setResults(data)
    } catch (err) {
      setError('Diagnostic failed: ' + (err as Error).message)
    } finally {
      setDiagnosing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-bold mb-4">Supabase Database Diagnostic</h2>
      <p className="text-gray-600 mb-4">
        This will scan your database and show all available tables and their structure.
      </p>
      
      <button
        onClick={runDiagnostic}
        disabled={diagnosing}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg mb-4"
      >
        {diagnosing ? 'Running Diagnostic...' : 'Run Full Database Diagnostic'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-6 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Connection Status</h3>
            <p className="text-green-700">✅ Connected successfully at {results.timestamp}</p>
          </div>

          {results.tables && results.tables.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Tables Found ({results.tables.length}):</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {results.tables.map((table: any, index: number) => (
                    <li key={index} className="bg-white p-2 rounded border text-sm">
                      {table.table_name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {results.tableData && Object.keys(results.tableData).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Tables with Data:</h3>
              <div className="space-y-4">
                {Object.entries(results.tableData).map(([tableName, data]: [string, any]) => (
                  <div key={tableName} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">{tableName}</h4>
                    <div className="text-sm text-blue-700 mb-2">
                      <strong>Columns:</strong> {data.columns.join(', ')}
                    </div>
                    <div className="text-sm text-blue-700 mb-2">
                      <strong>Sample Data:</strong>
                    </div>
                    <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(data.sample, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.tableErrors && Object.keys(results.tableErrors).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Tables with Errors:</h3>
              <div className="space-y-2">
                {Object.entries(results.tableErrors).map(([tableName, error]: [string, any]) => (
                  <div key={tableName} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-semibold text-red-800">{tableName}</h4>
                    <p className="text-sm text-red-600">{error.message}</p>
                    {error.code && <p className="text-xs text-red-500">Code: {error.code}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors && results.errors.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">System Errors:</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <pre className="text-sm text-red-600 overflow-auto">
                  {JSON.stringify(results.errors, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Full Diagnostic Results:</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
