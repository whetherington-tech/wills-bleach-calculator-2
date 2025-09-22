'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DatabaseExplorer() {
  const [exploring, setExploring] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const exploreDatabase = async () => {
    setExploring(true)
    setError('')
    setResults(null)

    try {
      // Try to get all tables using a different approach
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables')

      if (tablesError) {
        console.log('Tables RPC error:', tablesError)
      }

      // Try common table names and capture detailed error info
      const commonTables = ['water_utilities', 'utilities', 'zip_codes', 'water_data', 'water_utility', 'zip_code_data']
      const tableResults: any = {}
      const tableErrors: any = {}

      for (const tableName of commonTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(5)

          if (error) {
            tableErrors[tableName] = {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            }
          } else if (data) {
            tableResults[tableName] = data
          }
        } catch (err) {
          tableErrors[tableName] = {
            message: (err as Error).message,
            type: 'catch_error'
          }
        }
      }

      setResults({
        tables: tables || [],
        tableResults,
        tableErrors,
        tablesError: tablesError ? {
          message: tablesError.message,
          details: tablesError.details,
          hint: tablesError.hint,
          code: tablesError.code
        } : null
      })

    } catch (err) {
      setError('Error exploring database: ' + (err as Error).message)
    } finally {
      setExploring(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-bold mb-4">Database Explorer</h2>
      <p className="text-gray-600 mb-4">
        This tool helps us understand your Supabase database structure.
      </p>
      
      <button
        onClick={exploreDatabase}
        disabled={exploring}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
      >
        {exploring ? 'Exploring...' : 'Explore Database'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Available Tables:</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(results.tables, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Table Data:</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(results.tableResults, null, 2)}
            </pre>
          </div>

          {Object.keys(results.tableErrors || {}).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Table Errors:</h3>
              <pre className="bg-red-50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(results.tableErrors, null, 2)}
              </pre>
            </div>
          )}

          {results.tablesError && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Tables Query Error:</h3>
              <pre className="bg-red-50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(results.tablesError, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
