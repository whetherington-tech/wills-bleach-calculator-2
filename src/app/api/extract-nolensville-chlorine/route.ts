import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const pwsid = 'TN0000511' // Nolensville
    const results = {
      pwsid,
      extractedData: null,
      fallbackData: null,
      recommendations: []
    }

    // Try to get chlorine data from all_contaminant_results
    try {
      const { data: contaminantData, error: contaminantError } = await supabase
        .from('all_contaminant_results')
        .select('*')
        .eq('pwsid', pwsid)
        .or('contaminant_code.ilike.%chlorine%,contaminant_code.ilike.%cl%,contaminant_code.ilike.%residual%')

      if (!contaminantError && contaminantData && contaminantData.length > 0) {
        // Look for actual chlorine residual data
        const chlorineResiduals = contaminantData.filter(row => 
          row.contaminant_code && (
            row.contaminant_code.toLowerCase().includes('free_chlorine') ||
            row.contaminant_code.toLowerCase().includes('total_chlorine') ||
            row.contaminant_code.toLowerCase().includes('chlorine_residual') ||
            row.contaminant_code.toLowerCase().includes('disinfectant_residual')
          )
        )

        if (chlorineResiduals.length > 0) {
          // Calculate average from actual chlorine residual data
          const values = chlorineResiduals
            .map(row => parseFloat(row.value_ppb))
            .filter(val => !isNaN(val) && val > 0)

          if (values.length > 0) {
            const average = values.reduce((sum, val) => sum + val, 0) / values.length
            const min = Math.min(...values)
            const max = Math.max(...values)

            results.extractedData = {
              averageChlorine: average,
              minChlorine: min,
              maxChlorine: max,
              sampleCount: values.length,
              dataSource: 'EPA all_contaminant_results',
              lastUpdated: new Date().toISOString().split('T')[0],
              notes: 'Extracted from EPA contaminant results database',
              sourceUrl: 'EPA Water Quality Database'
            }
          }
        }
      }
    } catch (err) {
      console.error('Error extracting from all_contaminant_results:', err)
    }

    // If no direct chlorine data found, create fallback based on available data
    if (!results.extractedData) {
      try {
        // Get recent UCMR5 data for chlorine compounds
        const { data: ucmr5Data, error: ucmr5Error } = await supabase
          .from('ucmr5_results')
          .select('*')
          .eq('pwsid', pwsid)
          .ilike('contaminant', '%cl%')
          .order('collectiondate', { ascending: false })
          .limit(5)

        if (!ucmr5Error && ucmr5Data && ucmr5Data.length > 0) {
          // Use a conservative estimate based on the fact that chlorine compounds are present
          // This indicates the system uses chlorine disinfection
          results.fallbackData = {
            averageChlorine: 0.8, // Conservative estimate for municipal system
            minChlorine: 0.4,
            maxChlorine: 1.2,
            sampleCount: ucmr5Data.length,
            dataSource: 'EPA UCMR5 chlorine compounds + municipal estimate',
            lastUpdated: ucmr5Data[0].collectiondate || new Date().toISOString().split('T')[0],
            notes: 'Estimated based on presence of chlorine compounds in UCMR5 data. Municipal systems typically maintain 0.4-1.2 PPM chlorine residual.',
            sourceUrl: 'EPA UCMR5 Database',
            confidence: 'Medium - Based on chlorine compound presence'
          }
        }
      } catch (err) {
        console.error('Error extracting UCMR5 data:', err)
      }
    }

    // Add recommendations
    if (!results.extractedData && !results.fallbackData) {
      results.recommendations.push('No chlorine data found in EPA databases')
      results.recommendations.push('Consider manual data entry from recent CCR reports')
      results.recommendations.push('Contact utility directly for current chlorine levels')
    } else if (results.fallbackData) {
      results.recommendations.push('Using estimated data based on chlorine compound presence')
      results.recommendations.push('Consider verifying with recent CCR reports')
      results.recommendations.push('Data confidence is medium - based on system characteristics')
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
