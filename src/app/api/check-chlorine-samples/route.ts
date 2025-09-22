import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid') || 'TN0000511'

    // Check what contaminant codes exist in lcr_samples
    const { data: contaminants, error: contaminantsError } = await supabase
      .from('lcr_samples')
      .select('contaminant_code')
      .not('contaminant_code', 'is', null)
      .limit(100)

    if (contaminantsError) {
      return NextResponse.json({ error: contaminantsError.message }, { status: 500 })
    }

    // Get unique contaminant codes
    const uniqueContaminants = [...new Set(contaminants?.map(c => c.contaminant_code) || [])]

    // Look for chlorine-related contaminant codes
    const chlorineCodes = uniqueContaminants.filter(code => 
      code && (
        code.toLowerCase().includes('chlorine') ||
        code.toLowerCase().includes('cl') ||
        code.toLowerCase().includes('residual') ||
        code.toLowerCase().includes('free') ||
        code.toLowerCase().includes('total')
      )
    )

    // Check for samples for the specific PWSID
    const { data: pwsidSamples, error: pwsidError } = await supabase
      .from('lcr_samples')
      .select('*')
      .eq('pwsid', pwsid)
      .limit(10)

    // Check for any chlorine samples in the entire database
    const { data: chlorineSamples, error: chlorineError } = await supabase
      .from('lcr_samples')
      .select('*')
      .in('contaminant_code', chlorineCodes)
      .limit(10)

    // Check for any samples that might be chlorine (broader search)
    const { data: broadChlorineSamples, error: broadError } = await supabase
      .from('lcr_samples')
      .select('*')
      .or('contaminant_code.ilike.%chlorine%,contaminant_code.ilike.%cl%,contaminant_code.ilike.%residual%')
      .limit(10)

    return NextResponse.json({
      success: true,
      pwsid,
      uniqueContaminants: uniqueContaminants.slice(0, 20), // First 20 for reference
      chlorineCodes,
      pwsidSamples: pwsidSamples || [],
      chlorineSamples: chlorineSamples || [],
      broadChlorineSamples: broadChlorineSamples || [],
      totalContaminants: uniqueContaminants.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
