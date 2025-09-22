import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const results: any = {
      connection: 'success',
      timestamp: new Date().toISOString(),
      tables: [],
      errors: []
    }

    // Try to get all tables using different methods
    try {
      // Method 1: Try to get tables from information_schema
      const { data: tables1, error: error1 } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')

      if (error1) {
        results.errors.push({ method: 'information_schema', error: error1 })
      } else {
        results.tables = tables1 || []
      }
    } catch (err) {
      results.errors.push({ method: 'information_schema', error: err })
    }

    // Method 2: Try common table names
    const commonTableNames = [
      'water_utilities', 'utilities', 'zip_codes', 'water_data', 
      'water_utility', 'zip_code_data', 'users', 'profiles',
      'water_quality', 'chlorine_data', 'utility_data', 'locations',
      'zipcode_utilities', 'water_sources', 'treatment_plants',
      'water_systems', 'public_utilities', 'municipal_water',
      'water_providers', 'service_areas', 'water_districts',
      'water_authorities', 'water_commissions'
    ]

    results.tableData = {}
    results.tableErrors = {}

    for (const tableName of commonTableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3)

        if (error) {
          results.tableErrors[tableName] = {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          }
        } else if (data) {
          results.tableData[tableName] = {
            count: data.length,
            sample: data,
            columns: data.length > 0 ? Object.keys(data[0]) : []
          }
        }
      } catch (err) {
        results.tableErrors[tableName] = {
          message: err instanceof Error ? err.message : 'Unknown error',
          type: 'catch_error'
        }
      }
    }

    // Method 3: Try to get table list using RPC if available
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_tables')

      if (!rpcError && rpcData) {
        results.rpcTables = rpcData
      } else {
        results.errors.push({ method: 'rpc_get_tables', error: rpcError })
      }
    } catch (err) {
      results.errors.push({ method: 'rpc_get_tables', error: err })
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
