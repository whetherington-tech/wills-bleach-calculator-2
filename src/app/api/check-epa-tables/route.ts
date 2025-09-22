import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check what tables exist in the database
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (tablesError) {
      // If we can't access information_schema, try to query some common EPA table names
      const commonEpaTables = [
        'epa_sample_results',
        'epa_violations', 
        'epa_water_systems',
        'sample_results',
        'violations',
        'water_quality_data',
        'chlorine_samples',
        'lcr_samples',
        'water_systems'
      ]

      const tableChecks = []
      for (const tableName of commonEpaTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)

          tableChecks.push({
            table: tableName,
            exists: !error,
            error: error?.message || null,
            sampleData: data ? data[0] : null
          })
        } catch (err) {
          tableChecks.push({
            table: tableName,
            exists: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        success: true,
        method: 'table_check',
        tables: tableChecks,
        timestamp: new Date().toISOString()
      })
    }

    // If we can access information_schema, get all table names
    const tableNames = tables?.map(t => t.table_name) || []
    
    // Check each table for EPA-related data
    const tableChecks = []
    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        tableChecks.push({
          table: tableName,
          exists: !error,
          error: error?.message || null,
          sampleData: data ? data[0] : null,
          columnCount: data ? Object.keys(data[0] || {}).length : 0
        })
      } catch (err) {
        tableChecks.push({
          table: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      method: 'information_schema',
      allTables: tableNames,
      tableChecks,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
