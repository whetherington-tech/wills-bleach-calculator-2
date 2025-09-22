import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'

    // Target utilities for Middle TN focus areas
    const targetUtilities = [
      { pwsid: 'TN0000128', name: 'Metro Water Services', area: 'Nashville' },
      { pwsid: 'TN0000247', name: 'Milcrofton Utility District', area: 'Franklin' },
      { pwsid: 'TN0000125', name: 'Franklin Water Department', area: 'Franklin' },
      { pwsid: 'TN0000246', name: 'Franklin Water Dept (EPA)', area: 'Franklin' },
      { pwsid: 'TN0000345', name: 'H.B. & T.S. Utility District', area: 'Franklin' },
      { pwsid: 'TN0000699', name: 'H.B.& T.S. Utility District (EPA)', area: 'Franklin' },
      { pwsid: 'TN0000789', name: 'Brentwood Water Department', area: 'Brentwood' },
      { pwsid: 'TN0000BRW001', name: 'City of Brentwood Water Services', area: 'Brentwood' },
      { pwsid: 'TN0000HVUD001', name: 'Harpeth Valley Utility District', area: 'Brentwood' },
      { pwsid: 'TN0000CUDRC001', name: 'Consolidated Utility District of Rutherford County', area: 'Antioch' }
    ]

    const auditResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUtilities: targetUtilities.length,
        withChlorineData: 0,
        withRecentData: 0,
        needingUpdate: 0,
        missingData: 0
      },
      utilities: [],
      recommendations: []
    }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    for (const utility of targetUtilities) {
      const utilityAudit = {
        pwsid: utility.pwsid,
        name: utility.name,
        area: utility.area,
        hasData: false,
        dataAge: null,
        lastUpdated: null,
        dataSource: null,
        chlorineLevels: null,
        status: 'missing',
        issues: []
      }

      // Check chlorine_data table
      const { data: chlorineData, error: chlorineError } = await supabase
        .from('chlorine_data')
        .select('*')
        .eq('pwsid', utility.pwsid)
        .maybeSingle()

      if (!chlorineError && chlorineData) {
        utilityAudit.hasData = true
        utilityAudit.lastUpdated = chlorineData.last_updated
        utilityAudit.dataSource = chlorineData.data_source
        utilityAudit.chlorineLevels = {
          average: parseFloat(chlorineData.average_chlorine_ppm),
          min: parseFloat(chlorineData.min_chlorine_ppm),
          max: parseFloat(chlorineData.max_chlorine_ppm),
          sampleCount: chlorineData.sample_count
        }

        const dataDate = new Date(chlorineData.last_updated)
        const ageInDays = Math.floor((Date.now() - dataDate.getTime()) / (1000 * 60 * 60 * 24))
        utilityAudit.dataAge = ageInDays

        if (dataDate > sixMonthsAgo) {
          utilityAudit.status = 'recent'
          auditResults.summary.withRecentData++
        } else {
          utilityAudit.status = 'outdated'
          auditResults.summary.needingUpdate++
          utilityAudit.issues.push(`Data is ${ageInDays} days old (>${Math.floor(ageInDays/30)} months)`)
        }

        auditResults.summary.withChlorineData++

        // Validate chlorine levels
        const avg = utilityAudit.chlorineLevels.average
        if (avg < 0.1 || avg > 4.0) {
          utilityAudit.issues.push(`Suspicious chlorine level: ${avg} ppm (typical range: 0.2-2.0)`)
        }

        if (detailed) {
          utilityAudit.chlorineLevels.notes = chlorineData.notes
          utilityAudit.chlorineLevels.fullData = chlorineData
        }
      } else {
        // Check lcr_samples table as fallback
        const { data: lcrSamples, error: lcrError } = await supabase
          .from('lcr_samples')
          .select('*')
          .eq('pwsid', utility.pwsid)
          .in('contaminant_code', ['CL2', 'CHLORINE', 'FREE_CHLORINE', 'TOTAL_CHLORINE'])
          .order('sampling_end_date', { ascending: false })
          .limit(5)

        if (!lcrError && lcrSamples && lcrSamples.length > 0) {
          utilityAudit.hasData = true
          utilityAudit.status = 'lcr_only'
          utilityAudit.dataSource = 'EPA LCR Samples'
          utilityAudit.lastUpdated = lcrSamples[0].sampling_end_date

          const validSamples = lcrSamples.filter(s =>
            s.sample_measure && !isNaN(parseFloat(s.sample_measure)) && parseFloat(s.sample_measure) > 0
          )

          if (validSamples.length > 0) {
            const avg = validSamples.reduce((sum, s) => sum + parseFloat(s.sample_measure), 0) / validSamples.length
            utilityAudit.chlorineLevels = {
              average: avg,
              sampleCount: validSamples.length,
              source: 'EPA_LCR'
            }
          }

          utilityAudit.issues.push('Only EPA LCR data available, no curated CCR data')
          auditResults.summary.needingUpdate++
        } else {
          utilityAudit.status = 'missing'
          utilityAudit.issues.push('No chlorine data found in any table')
          auditResults.summary.missingData++
        }
      }

      auditResults.utilities.push(utilityAudit)
    }

    // Generate recommendations
    const missingUtilities = auditResults.utilities.filter(u => u.status === 'missing')
    const outdatedUtilities = auditResults.utilities.filter(u => u.status === 'outdated')

    if (missingUtilities.length > 0) {
      auditResults.recommendations.push({
        priority: 'high',
        issue: 'Missing chlorine data',
        utilities: missingUtilities.map(u => `${u.name} (${u.pwsid})`),
        action: 'Trigger AI research for these utilities immediately'
      })
    }

    if (outdatedUtilities.length > 0) {
      auditResults.recommendations.push({
        priority: 'medium',
        issue: 'Outdated chlorine data (>6 months)',
        utilities: outdatedUtilities.map(u => `${u.name} (${Math.floor(u.dataAge/30)} months old)`),
        action: 'Refresh data from latest CCR reports'
      })
    }

    const suspiciousUtilities = auditResults.utilities.filter(u =>
      u.chlorineLevels && (u.chlorineLevels.average < 0.1 || u.chlorineLevels.average > 4.0)
    )

    if (suspiciousUtilities.length > 0) {
      auditResults.recommendations.push({
        priority: 'medium',
        issue: 'Suspicious chlorine levels detected',
        utilities: suspiciousUtilities.map(u => `${u.name} (${u.chlorineLevels.average} ppm)`),
        action: 'Manual verification recommended'
      })
    }

    return NextResponse.json(auditResults, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}