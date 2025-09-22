import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateChlorineData, validateGeographicConsistency, EPA_LIMITS } from '@/utils/chlorineValidation'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Scanning database for bad chlorine data...')

    // Get all chlorine data entries
    const { data: allData, error: fetchError } = await supabase
      .from('chlorine_data')
      .select('*')
      .order('pwsid')

    if (fetchError) {
      throw fetchError
    }

    const issues: Array<{
      pwsid: string
      utilityName: string
      city?: string
      state?: string
      issueType: string
      severity: 'critical' | 'warning' | 'info'
      details: string
      currentData: any
      recommendations: string[]
    }> = []

    let totalScanned = 0
    let validEntries = 0
    let entriesWithIssues = 0

    for (const entry of allData || []) {
      totalScanned++

      const utilityName = entry.utility_name || 'Unknown'
      const city = null // Will be populated separately if needed
      const state = entry.pwsid.substring(0, 2) // Extract from PWSID

      // Validate chlorine data ranges
      const validation = validateChlorineData({
        averageChlorine: entry.average_chlorine_ppm,
        minChlorine: entry.min_chlorine_ppm,
        maxChlorine: entry.max_chlorine_ppm,
        sampleCount: entry.sample_count,
        sourceUrl: entry.source_url,
        utilityName: utilityName,
        city: city,
        state: state,
        pwsid: entry.pwsid
      })

      // Check geographic consistency
      const geoValidation = validateGeographicConsistency(
        entry.pwsid,
        utilityName,
        city,
        state,
        entry.source_url
      )

      let hasIssues = false

      // Critical validation errors
      if (!validation.isValid) {
        hasIssues = true
        entriesWithIssues++
        issues.push({
          pwsid: entry.pwsid,
          utilityName,
          city,
          state,
          issueType: 'invalid_data',
          severity: 'critical',
          details: `Invalid chlorine data: ${validation.errors.join(', ')}`,
          currentData: {
            average: entry.average_chlorine_ppm,
            range: `${entry.min_chlorine_ppm}-${entry.max_chlorine_ppm}`,
            source: entry.data_source,
            url: entry.source_url
          },
          recommendations: [
            'Remove invalid data entry',
            'Re-extract data from verified source',
            'Verify EPA compliance'
          ]
        })
      }

      // Geographic inconsistencies
      if (!geoValidation.isConsistent) {
        hasIssues = true
        if (!validation.isValid) entriesWithIssues++ // Only count once per entry

        issues.push({
          pwsid: entry.pwsid,
          utilityName,
          city,
          state,
          issueType: 'geographic_mismatch',
          severity: geoValidation.confidence < 30 ? 'critical' : 'warning',
          details: `Geographic inconsistency: ${geoValidation.warnings.join(', ')}`,
          currentData: {
            average: entry.average_chlorine_ppm,
            range: `${entry.min_chlorine_ppm}-${entry.max_chlorine_ppm}`,
            source: entry.data_source,
            url: entry.source_url
          },
          recommendations: [
            'Verify utility location',
            'Check PWSID state code',
            'Validate source URL domain',
            'Consider removing if cross-state contamination'
          ]
        })
      }

      // Quality warnings (non-critical but suspicious)
      if (validation.isValid && geoValidation.isConsistent && validation.warnings.length > 0) {
        hasIssues = true
        issues.push({
          pwsid: entry.pwsid,
          utilityName,
          city,
          state,
          issueType: 'quality_warning',
          severity: validation.confidence < 60 ? 'warning' : 'info',
          details: `Quality issues: ${validation.warnings.join(', ')}`,
          currentData: {
            average: entry.average_chlorine_ppm,
            range: `${entry.min_chlorine_ppm}-${entry.max_chlorine_ppm}`,
            source: entry.data_source,
            confidence: validation.confidence,
            qualityScore: validation.qualityScore
          },
          recommendations: [
            'Verify data with additional sources',
            'Check sample count adequacy',
            'Review extraction method accuracy'
          ]
        })
      }

      // Detect potential cross-state contamination patterns
      if (entry.source_url) {
        const urlLower = entry.source_url.toLowerCase()
        const suspiciousPatterns = [
          { pattern: /franklin.*michigan|michigan.*franklin/i, expected: 'TN', warning: 'Franklin Michigan data may be contaminating Franklin Tennessee' },
          { pattern: /nashville\.gov/i, expected: 'TN', warning: 'Nashville data may be contaminating other utilities' },
          { pattern: /\.(mi|me|oh|ca)\.gov/i, expected: 'varies', warning: 'State government domain mismatch' }
        ]

        for (const { pattern, warning } of suspiciousPatterns) {
          if (pattern.test(urlLower)) {
            const expectedState = entry.pwsid.substring(0, 2)
            const urlState = urlLower.includes('mi.gov') ? 'MI' :
                           urlLower.includes('me.gov') ? 'ME' :
                           urlLower.includes('oh.gov') ? 'OH' :
                           urlLower.includes('ca.gov') ? 'CA' : 'TN'

            if (expectedState !== urlState) {
              hasIssues = true
              issues.push({
                pwsid: entry.pwsid,
                utilityName,
                city,
                state,
                issueType: 'cross_state_contamination',
                severity: 'critical',
                details: `${warning}. PWSID suggests ${expectedState} but URL suggests ${urlState}`,
                currentData: {
                  average: entry.average_chlorine_ppm,
                  range: `${entry.min_chlorine_ppm}-${entry.max_chlorine_ppm}`,
                  source: entry.data_source,
                  url: entry.source_url
                },
                recommendations: [
                  'Remove contaminated data immediately',
                  'Research correct utility data',
                  'Update search exclusions',
                  'Verify PWSID mapping'
                ]
              })
            }
          }
        }
      }

      if (!hasIssues) {
        validEntries++
      }
    }

    // Categorize issues by severity
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    const warnings = issues.filter(i => i.severity === 'warning')
    const infoItems = issues.filter(i => i.severity === 'info')

    // Generate summary statistics
    const summary = {
      totalEntries: totalScanned,
      validEntries,
      entriesWithIssues,
      healthScore: Math.round((validEntries / totalScanned) * 100),
      issueBreakdown: {
        critical: criticalIssues.length,
        warnings: warnings.length,
        info: infoItems.length
      },
      commonIssues: getCommonIssueTypes(issues)
    }

    console.log(`✅ Scan complete: ${totalScanned} entries, ${validEntries} valid, ${entriesWithIssues} with issues`)

    return NextResponse.json({
      success: true,
      summary,
      issues: {
        critical: criticalIssues,
        warnings,
        info: infoItems
      },
      recommendations: generateRecommendations(summary, issues)
    })

  } catch (error) {
    console.error('❌ Error scanning for bad data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getCommonIssueTypes(issues: any[]): Record<string, number> {
  const counts: Record<string, number> = {}
  issues.forEach(issue => {
    counts[issue.issueType] = (counts[issue.issueType] || 0) + 1
  })
  return counts
}

function generateRecommendations(summary: any, issues: any[]): string[] {
  const recommendations: string[] = []

  if (summary.healthScore < 80) {
    recommendations.push('Data quality is below acceptable threshold - immediate cleanup required')
  }

  if (summary.issueBreakdown.critical > 0) {
    recommendations.push(`${summary.issueBreakdown.critical} critical issues require immediate attention`)
  }

  const crossStateIssues = issues.filter(i => i.issueType === 'cross_state_contamination')
  if (crossStateIssues.length > 0) {
    recommendations.push('Cross-state contamination detected - review search patterns and validation')
  }

  const geoIssues = issues.filter(i => i.issueType === 'geographic_mismatch')
  if (geoIssues.length > 0) {
    recommendations.push('Geographic validation failures detected - verify PWSID mappings')
  }

  const invalidData = issues.filter(i => i.issueType === 'invalid_data')
  if (invalidData.length > 0) {
    recommendations.push('EPA compliance violations found - remove invalid chlorine readings')
  }

  if (summary.healthScore > 90) {
    recommendations.push('Data quality is excellent - maintain current validation standards')
  }

  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const { action, pwsid } = await request.json()

    if (action === 'fix_specific' && pwsid) {
      // Fix a specific utility's data
      const { data: existingData } = await supabase
        .from('chlorine_data')
        .select('*')
        .eq('pwsid', pwsid)
        .single()

      if (!existingData) {
        return NextResponse.json({
          success: false,
          error: 'No data found for specified PWSID'
        })
      }

      // Validate the existing data
      const validation = validateChlorineData({
        averageChlorine: existingData.average_chlorine_ppm,
        minChlorine: existingData.min_chlorine_ppm,
        maxChlorine: existingData.max_chlorine_ppm,
        sampleCount: existingData.sample_count,
        sourceUrl: existingData.source_url,
        utilityName: existingData.utility_name,
        pwsid: pwsid
      })

      if (!validation.isValid) {
        // Delete invalid data
        const { error: deleteError } = await supabase
          .from('chlorine_data')
          .delete()
          .eq('pwsid', pwsid)

        if (deleteError) {
          throw deleteError
        }

        return NextResponse.json({
          success: true,
          message: 'Invalid data removed',
          action: 'deleted',
          validation
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Data is valid, no action needed',
        action: 'none',
        validation
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    })

  } catch (error) {
    console.error('❌ Error fixing bad data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}