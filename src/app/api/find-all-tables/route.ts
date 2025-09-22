import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Comprehensive list of possible table names based on common EPA database patterns
    const possibleTables = [
      // EPA SDWIS tables
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
      'treatment_data',
      
      // EPA ECHO tables
      'echo_violations',
      'echo_facilities',
      'echo_enforcement',
      'echo_compliance',
      
      // EPA Water Quality Portal tables
      'wqp_results',
      'wqp_sites',
      'wqp_activities',
      'wqp_characteristics',
      'wqp_organizations',
      
      // Common EPA table variations
      'epa_sample_results',
      'epa_violations',
      'epa_water_systems',
      'epa_monitoring',
      'epa_compliance',
      'epa_enforcement',
      
      // Disinfection/Chlorine specific
      'disinfection_byproducts',
      'chlorine_residual',
      'free_chlorine',
      'total_chlorine',
      'chlorine_samples',
      'disinfection_samples',
      'treatment_samples',
      
      // Water quality monitoring
      'water_quality_monitoring',
      'monitoring_data',
      'sample_data',
      'test_results',
      'laboratory_results',
      
      // State/Regional variations
      'tennessee_data',
      'tdec_data',
      'state_data',
      'regional_data',
      
      // Generic data tables
      'data',
      'results',
      'samples',
      'tests',
      'measurements',
      'records',
      'reports',
      
      // Your custom tables
      'water_utilities',
      'zip_code_mapping',
      'chlorine_data'
    ]

    const tableExplorations = []
    const foundTables = []

    for (const tableName of possibleTables) {
      try {
        // Get sample data and structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(2)

        if (sampleError) {
          // Table doesn't exist or can't access
          continue
        }

        foundTables.push(tableName)

        // Get column names from the first row
        const columns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
        
        // Check if this table might contain chlorine data
        const hasChlorineIndicators = columns.some(col => 
          col.toLowerCase().includes('chlorine') ||
          col.toLowerCase().includes('cl') ||
          col.toLowerCase().includes('residual') ||
          col.toLowerCase().includes('disinfection') ||
          col.toLowerCase().includes('contaminant') ||
          col.toLowerCase().includes('free') ||
          col.toLowerCase().includes('total') ||
          col.toLowerCase().includes('measure') ||
          col.toLowerCase().includes('result')
        )

        // Check for PWSID column (EPA water system identifier)
        const hasPwsid = columns.some(col => 
          col.toLowerCase().includes('pwsid') ||
          col.toLowerCase().includes('pws_id')
        )

        // Get total row count
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        // Check if this table has data for TN0000511 (Nolensville)
        let hasNolensvilleData = false
        let nolensvilleSamples = []
        if (hasPwsid) {
          try {
            const { data: nolensvilleData, error: nolensvilleError } = await supabase
              .from(tableName)
              .select('*')
              .eq('pwsid', 'TN0000511')
              .limit(3)

            if (!nolensvilleError && nolensvilleData) {
              hasNolensvilleData = nolensvilleData.length > 0
              nolensvilleSamples = nolensvilleData
            }
          } catch (err) {
            // Ignore errors for this check
          }
        }

        tableExplorations.push({
          table: tableName,
          exists: true,
          columns: columns,
          sampleData: sampleData,
          hasChlorineIndicators,
          hasPwsid,
          hasNolensvilleData,
          nolensvilleSamples,
          totalRows: count || 0,
          error: null
        })

      } catch (err) {
        // Table doesn't exist, continue to next
        continue
      }
    }

    // Categorize tables
    const chlorineTables = tableExplorations.filter(t => t.hasChlorineIndicators)
    const pwsidTables = tableExplorations.filter(t => t.hasPwsid)
    const nolensvilleTables = tableExplorations.filter(t => t.hasNolensvilleData)
    const largeTables = tableExplorations.filter(t => t.totalRows > 1000)

    return NextResponse.json({
      success: true,
      totalTablesFound: foundTables.length,
      foundTables,
      allTables: tableExplorations,
      chlorineTables,
      pwsidTables,
      nolensvilleTables,
      largeTables,
      summary: {
        totalTablesFound: foundTables.length,
        tablesWithChlorineIndicators: chlorineTables.length,
        tablesWithPwsid: pwsidTables.length,
        tablesWithNolensvilleData: nolensvilleTables.length,
        largeTables: largeTables.length
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