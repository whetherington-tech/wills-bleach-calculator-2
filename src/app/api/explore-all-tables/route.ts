import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Try to get all table names from information_schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')

    if (tablesError) {
      return NextResponse.json({ 
        error: 'Cannot access information_schema', 
        details: tablesError.message 
      }, { status: 500 })
    }

    const allTableNames = tables?.map(t => t.table_name) || []
    
    console.log(`Found ${allTableNames.length} tables:`, allTableNames)

    const tableExplorations = []

    for (const tableName of allTableNames) {
      try {
        // Get sample data and structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(2)

        if (sampleError) {
          tableExplorations.push({
            table: tableName,
            exists: false,
            error: sampleError.message
          })
          continue
        }

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
          col.toLowerCase().includes('total')
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
        tableExplorations.push({
          table: tableName,
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Categorize tables
    const chlorineTables = tableExplorations.filter(t => t.hasChlorineIndicators)
    const pwsidTables = tableExplorations.filter(t => t.hasPwsid)
    const nolensvilleTables = tableExplorations.filter(t => t.hasNolensvilleData)
    const largeTables = tableExplorations.filter(t => t.totalRows > 1000)

    return NextResponse.json({
      success: true,
      totalTables: allTableNames.length,
      allTableNames,
      allTables: tableExplorations,
      chlorineTables,
      pwsidTables,
      nolensvilleTables,
      largeTables,
      summary: {
        totalTables: allTableNames.length,
        existingTables: tableExplorations.filter(t => t.exists).length,
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
