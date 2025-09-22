import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('term') || 'MILCROFTON'

    const results: any = {
      searchTerm,
      timestamp: new Date().toISOString(),
      tables: {},
      errors: []
    }

    // List of all tables we know about
    const tables = [
      'water_utilities',
      'water_systems', 
      'zip_code_mapping',
      'lcr_samples',
      'water_quality_data',
      'utility_contacts',
      'service_areas',
      'water_rates',
      'infrastructure_data',
      'compliance_data',
      'treatment_facilities',
      'distribution_systems',
      'water_sources',
      'monitoring_data',
      'violations',
      'permits',
      'financial_data',
      'customer_data',
      'billing_data',
      'maintenance_records',
      'emergency_contacts',
      'regulatory_data'
    ]

    // Search each table for the term
    for (const tableName of tables) {
      try {
        // First, let's see if the table exists by trying to get its structure
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (tableError) {
          results.errors.push({ table: tableName, error: tableError.message })
          continue
        }

        // If table exists, search for our term in all text columns
        let searchQuery = supabase.from(tableName).select('*')
        
        // Build search conditions based on known column names for each table
        if (tableName === 'water_utilities') {
          searchQuery = searchQuery.or(`utility_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`)
        } else if (tableName === 'water_systems') {
          searchQuery = searchQuery.or(`pws_name.ilike.%${searchTerm}%,city_name.ilike.%${searchTerm}%,state_code.ilike.%${searchTerm}%,org_name.ilike.%${searchTerm}%`)
        } else if (tableName === 'zip_code_mapping') {
          searchQuery = searchQuery.or(`pwsid.ilike.%${searchTerm}%`)
        } else if (tableName === 'lcr_samples') {
          searchQuery = searchQuery.or(`pwsid.ilike.%${searchTerm}%,sample_id.ilike.%${searchTerm}%`)
        } else {
          // Generic search for other tables
          searchQuery = searchQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
        }
        
        const { data: searchData, error: searchError } = await searchQuery.limit(10)

        if (searchError) {
          results.errors.push({ table: tableName, searchError: searchError.message })
        } else {
          results.tables[tableName] = {
            exists: true,
            sampleData: tableData,
            searchResults: searchData || [],
            resultCount: searchData?.length || 0
          }
        }
      } catch (err) {
        results.errors.push({ table: tableName, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
