import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Try to find all tables that might contain EPA data
    const possibleTables = [
      'lcr_samples',
      'water_systems', 
      'violations',
      'sample_results',
      'monitoring_results',
      'contaminant_data',
      'water_quality_samples',
      'epa_data',
      'sdwis_data',
      'drinking_water_data',
      'chlorine_data',
      'disinfection_data',
      'treatment_data'
    ]

    const tableExplorations = []

    for (const tableName of possibleTables) {
      try {
        // Get table structure and sample data
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3)

        if (!sampleError && sampleData && sampleData.length > 0) {
          // Get column names from the first row
          const columns = Object.keys(sampleData[0])
          
          // Check if this table might contain chlorine data
          const hasChlorineIndicators = columns.some(col => 
            col.toLowerCase().includes('chlorine') ||
            col.toLowerCase().includes('cl') ||
            col.toLowerCase().includes('residual') ||
            col.toLowerCase().includes('disinfection') ||
            col.toLowerCase().includes('contaminant')
          )

          // Get total row count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })

          tableExplorations.push({
            table: tableName,
            exists: true,
            columns: columns,
            sampleData: sampleData,
            hasChlorineIndicators,
            totalRows: count || 0,
            error: null
          })
        } else {
          tableExplorations.push({
            table: tableName,
            exists: false,
            error: sampleError?.message || 'No data found'
          })
        }
      } catch (err) {
        tableExplorations.push({
          table: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Also try to find any tables with chlorine-related data
    const chlorineTables = tableExplorations.filter(t => t.hasChlorineIndicators)

    return NextResponse.json({
      success: true,
      allTables: tableExplorations,
      chlorineTables,
      summary: {
        totalTablesChecked: possibleTables.length,
        existingTables: tableExplorations.filter(t => t.exists).length,
        tablesWithChlorineIndicators: chlorineTables.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
