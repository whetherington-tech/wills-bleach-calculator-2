import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid') || 'TN0000247'

    // Simulate the fetchChlorineData function from the calculator
    const { data: chlorineData, error: chlorineError } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', pwsid)
      .single()

    if (!chlorineError && chlorineData) {
      return NextResponse.json({
        success: true,
        pwsid: pwsid,
        chlorineData: {
          averageChlorine: parseFloat(chlorineData.average_chlorine_ppm),
          minChlorine: parseFloat(chlorineData.min_chlorine_ppm),
          maxChlorine: parseFloat(chlorineData.max_chlorine_ppm),
          sampleCount: chlorineData.sample_count,
          lastUpdated: chlorineData.last_updated,
          dataSource: chlorineData.data_source,
          notes: chlorineData.notes,
          fromDatabase: true
        }
      })
    }

    // Fallback: Look for chlorine data in lcr_samples table (if available)
    const { data: chlorineSamples, error: lcrError } = await supabase
      .from('lcr_samples')
      .select('*')
      .eq('pwsid', pwsid)
      .in('contaminant_code', ['CL2', 'CHLORINE', 'FREE_CHLORINE', 'TOTAL_CHLORINE'])
      .order('sampling_end_date', { ascending: false })
      .limit(10)

    if (!lcrError && chlorineSamples && chlorineSamples.length > 0) {
      const validSamples = chlorineSamples.filter(sample => 
        sample.sample_measure && 
        !isNaN(parseFloat(sample.sample_measure)) &&
        parseFloat(sample.sample_measure) > 0
      )

      if (validSamples.length > 0) {
        const totalChlorine = validSamples.reduce((sum, sample) => 
          sum + parseFloat(sample.sample_measure), 0
        )
        const averageChlorine = totalChlorine / validSamples.length
        
        return NextResponse.json({
          success: true,
          pwsid: pwsid,
          chlorineData: {
            averageChlorine: averageChlorine,
            sampleCount: validSamples.length,
            latestSample: validSamples[0],
            allSamples: validSamples,
            fromDatabase: true
          }
        })
      }
    }

    return NextResponse.json({
      success: false,
      pwsid: pwsid,
      message: 'No chlorine data found',
      chlorineData: null
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
