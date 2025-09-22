import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const pwsid = 'TN0000511' // Nolensville
    const results = []

    // Search CCR reports table
    try {
      const { data: ccrData, error: ccrError } = await supabase
        .from('ccr_reports')
        .select('*')
        .eq('pwsid', pwsid)

      if (!ccrError && ccrData && ccrData.length > 0) {
        results.push({
          table: 'ccr_reports',
          data: ccrData,
          hasChlorineData: true,
          chlorineColumns: ['chlorine_avg', 'chlorine_max', 'chlorine_min', 'chlorine_mcl', 'chlorine_mrgl', 'chlorine_units']
        })
      }
    } catch (err) {
      results.push({ table: 'ccr_reports', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search SYR4 HAA5 table
    try {
      const { data: syr4Haa5Data, error: syr4Haa5Error } = await supabase
        .from('syr4_haa5')
        .select('*')
        .eq('pwsid', pwsid)

      if (!syr4Haa5Error && syr4Haa5Data && syr4Haa5Data.length > 0) {
        results.push({
          table: 'syr4_haa5',
          data: syr4Haa5Data,
          hasChlorineData: true,
          chlorineColumns: ['residual_field_free_chlorine_mg_l', 'residual_field_total_chlorine_mg_l']
        })
      }
    } catch (err) {
      results.push({ table: 'syr4_haa5', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search SYR4 Inorganics table
    try {
      const { data: syr4InorganicsData, error: syr4InorganicsError } = await supabase
        .from('syr4_inorganics')
        .select('*')
        .eq('pwsid', pwsid)

      if (!syr4InorganicsError && syr4InorganicsData && syr4InorganicsData.length > 0) {
        results.push({
          table: 'syr4_inorganics',
          data: syr4InorganicsData,
          hasChlorineData: true,
          chlorineColumns: ['residual_field_free_chlorine_mg_l', 'residual_field_total_chlorine_mg_l']
        })
      }
    } catch (err) {
      results.push({ table: 'syr4_inorganics', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search SYR4 TTHM table
    try {
      const { data: syr4TthmData, error: syr4TthmError } = await supabase
        .from('syr4_tthm')
        .select('*')
        .eq('pwsid', pwsid)

      if (!syr4TthmError && syr4TthmData && syr4TthmData.length > 0) {
        results.push({
          table: 'syr4_tthm',
          data: syr4TthmData,
          hasChlorineData: true,
          chlorineColumns: ['residual_field_free_chlorine_mg_l', 'residual_field_total_chlorine_mg_l']
        })
      }
    } catch (err) {
      results.push({ table: 'syr4_tthm', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search all contaminant results table
    try {
      const { data: allContaminantData, error: allContaminantError } = await supabase
        .from('all_contaminant_results')
        .select('*')
        .eq('pwsid', pwsid)
        .limit(20)

      if (!allContaminantError && allContaminantData && allContaminantData.length > 0) {
        // Filter for chlorine-related contaminants
        const chlorineData = allContaminantData.filter(row => 
          row.contaminant_code && (
            row.contaminant_code.toLowerCase().includes('chlorine') ||
            row.contaminant_code.toLowerCase().includes('cl') ||
            row.contaminant_code.toLowerCase().includes('residual') ||
            row.contaminant_code.toLowerCase().includes('disinfection')
          )
        )

        if (chlorineData.length > 0) {
          results.push({
            table: 'all_contaminant_results',
            data: chlorineData,
            hasChlorineData: true,
            chlorineColumns: ['contaminant_code', 'value_ppb', 'units', 'test_date']
          })
        }
      }
    } catch (err) {
      results.push({ table: 'all_contaminant_results', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search UCMR4 results table
    try {
      const { data: ucmr4Data, error: ucmr4Error } = await supabase
        .from('ucmr4_results')
        .select('*')
        .eq('pwsid', pwsid)
        .limit(20)

      if (!ucmr4Error && ucmr4Data && ucmr4Data.length > 0) {
        // Filter for chlorine-related contaminants
        const chlorineData = ucmr4Data.filter(row => 
          row.contaminant && (
            row.contaminant.toLowerCase().includes('chlorine') ||
            row.contaminant.toLowerCase().includes('cl') ||
            row.contaminant.toLowerCase().includes('residual') ||
            row.contaminant.toLowerCase().includes('disinfection')
          )
        )

        if (chlorineData.length > 0) {
          results.push({
            table: 'ucmr4_results',
            data: chlorineData,
            hasChlorineData: true,
            chlorineColumns: ['contaminant', 'analyticalresultvalue', 'analyticalresultssign']
          })
        }
      }
    } catch (err) {
      results.push({ table: 'ucmr4_results', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    // Search UCMR5 results table
    try {
      const { data: ucmr5Data, error: ucmr5Error } = await supabase
        .from('ucmr5_results')
        .select('*')
        .eq('pwsid', pwsid)
        .limit(20)

      if (!ucmr5Error && ucmr5Data && ucmr5Data.length > 0) {
        // Filter for chlorine-related contaminants
        const chlorineData = ucmr5Data.filter(row => 
          row.contaminant && (
            row.contaminant.toLowerCase().includes('chlorine') ||
            row.contaminant.toLowerCase().includes('cl') ||
            row.contaminant.toLowerCase().includes('residual') ||
            row.contaminant.toLowerCase().includes('disinfection')
          )
        )

        if (chlorineData.length > 0) {
          results.push({
            table: 'ucmr5_results',
            data: chlorineData,
            hasChlorineData: true,
            chlorineColumns: ['contaminant', 'analyticalresultvalue', 'analyticalresultssign']
          })
        }
      }
    } catch (err) {
      results.push({ table: 'ucmr5_results', error: err instanceof Error ? err.message : 'Unknown error' })
    }

    return NextResponse.json({
      success: true,
      pwsid,
      searchResults: results,
      summary: {
        totalTablesSearched: results.length,
        tablesWithChlorineData: results.filter(r => r.hasChlorineData).length,
        tablesWithErrors: results.filter(r => r.error).length
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
