import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateGeographicConsistency, validateSourceUrlDomain } from '@/utils/chlorineValidation'

interface ContaminationPattern {
  name: string
  description: string
  urlPattern: RegExp
  utilityPattern?: RegExp
  suspiciousStates: string[]
  autoCleanup: boolean
  severity: 'critical' | 'warning'
}

const CONTAMINATION_PATTERNS: ContaminationPattern[] = [
  {
    name: 'Franklin Michigan Contamination',
    description: 'Franklin Michigan water quality data being assigned to Franklin Tennessee utilities',
    urlPattern: /franklin.*michigan|michigan.*franklin|\/franklin.*mi\.|\.mi\..*franklin/i,
    utilityPattern: /franklin.*michigan|michigan.*franklin/i,
    suspiciousStates: ['TN', 'KY', 'GA', 'AL', 'NC', 'VA'],
    autoCleanup: true,
    severity: 'critical'
  },
  {
    name: 'Nashville Metro Cross-contamination',
    description: 'Nashville Metro Water data contaminating other Tennessee utilities',
    urlPattern: /nashville\.gov|metro.*nashville|nashville.*metro/i,
    suspiciousStates: ['MI', 'OH', 'KY', 'GA'],
    autoCleanup: false,
    severity: 'warning'
  },
  {
    name: 'State Government Domain Mismatch',
    description: 'Utilities assigned data from wrong state government domains',
    urlPattern: /\.(mi|me|oh|ca|ny|fl|tx)\.gov/i,
    suspiciousStates: ['ALL'], // Check all mismatches
    autoCleanup: false,
    severity: 'warning'
  },
  {
    name: 'Common City Name Confusion',
    description: 'Data from utilities with common city names (Columbus, Springfield, etc.) crossing state lines',
    urlPattern: /columbus|springfield|franklin|georgetown|clinton|madison|washington/i,
    suspiciousStates: ['ALL'],
    autoCleanup: false,
    severity: 'warning'
  },
  {
    name: 'Third-party Site Contamination',
    description: 'Data from third-party utility management sites with mixed geographic data',
    urlPattern: /noviams\.com|utilitymanager\.com|civicplus\.com/i,
    suspiciousStates: ['ALL'],
    autoCleanup: false,
    severity: 'warning'
  }
]

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pattern = url.searchParams.get('pattern')
    const autoCleanupOnly = url.searchParams.get('auto_cleanup_only') === 'true'

    console.log('🔍 Scanning for cross-state contamination patterns...')

    // Get all chlorine data
    const { data: allData, error: fetchError } = await supabase
      .from('chlorine_data')
      .select('*')

    if (fetchError) {
      throw fetchError
    }

    const contaminations: Array<{
      pwsid: string
      utilityName: string
      city?: string
      state?: string
      patternName: string
      severity: 'critical' | 'warning'
      description: string
      evidence: string[]
      sourceUrl?: string
      dataSource?: string
      autoCleanup: boolean
      recommendations: string[]
    }> = []

    let patternsToCheck = CONTAMINATION_PATTERNS
    if (pattern) {
      patternsToCheck = CONTAMINATION_PATTERNS.filter(p => p.name.toLowerCase().includes(pattern.toLowerCase()))
    }
    if (autoCleanupOnly) {
      patternsToCheck = patternsToCheck.filter(p => p.autoCleanup)
    }

    for (const entry of allData || []) {
      const utilityName = entry.utility_name || 'Unknown'
      const city = null // Will be populated separately if needed
      const state = entry.pwsid.substring(0, 2) // Extract from PWSID
      const pwsidState = entry.pwsid.substring(0, 2)

      for (const contaminationPattern of patternsToCheck) {
        const evidence: string[] = []
        let isContaminated = false

        // Check URL pattern match
        if (entry.source_url && contaminationPattern.urlPattern.test(entry.source_url)) {
          evidence.push(`Source URL matches suspicious pattern: ${entry.source_url}`)

          // For state-specific patterns, check if PWSID state is in suspicious list
          if (contaminationPattern.suspiciousStates.includes('ALL') ||
              contaminationPattern.suspiciousStates.includes(pwsidState)) {
            isContaminated = true
          }

          // Special handling for state domain mismatches
          if (contaminationPattern.name === 'State Government Domain Mismatch') {
            const urlMatch = entry.source_url.match(/\.(mi|me|oh|ca|ny|fl|tx)\.gov/i)
            if (urlMatch) {
              const urlStateCode = urlMatch[1].toUpperCase()
              const fullStateMap: Record<string, string> = {
                'MI': 'MI', 'ME': 'ME', 'OH': 'OH', 'CA': 'CA',
                'NY': 'NY', 'FL': 'FL', 'TX': 'TX'
              }
              const urlStateAbbrev = fullStateMap[urlStateCode]

              if (urlStateAbbrev && pwsidState !== urlStateAbbrev) {
                isContaminated = true
                evidence.push(`PWSID state (${pwsidState}) doesn't match URL state (${urlStateAbbrev})`)
              }
            }
          }
        }

        // Check utility name pattern match
        if (contaminationPattern.utilityPattern &&
            contaminationPattern.utilityPattern.test(utilityName)) {
          evidence.push(`Utility name matches suspicious pattern: ${utilityName}`)

          if (contaminationPattern.suspiciousStates.includes(pwsidState)) {
            isContaminated = true
          }
        }

        // Additional validation using geographic consistency
        if (isContaminated && entry.source_url) {
          const geoValidation = validateGeographicConsistency(
            entry.pwsid,
            utilityName,
            city,
            state,
            entry.source_url
          )

          if (!geoValidation.isConsistent) {
            evidence.push(...geoValidation.warnings)
          }
        }

        if (isContaminated) {
          const recommendations = generateRecommendations(contaminationPattern, entry, pwsidState)

          contaminations.push({
            pwsid: entry.pwsid,
            utilityName,
            city,
            state,
            patternName: contaminationPattern.name,
            severity: contaminationPattern.severity,
            description: contaminationPattern.description,
            evidence,
            sourceUrl: entry.source_url,
            dataSource: entry.data_source,
            autoCleanup: contaminationPattern.autoCleanup,
            recommendations
          })
        }
      }
    }

    // Sort by severity and auto-cleanup priority
    contaminations.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1
      }
      if (a.autoCleanup !== b.autoCleanup) {
        return a.autoCleanup ? -1 : 1
      }
      return 0
    })

    const summary = {
      totalContaminations: contaminations.length,
      criticalContaminations: contaminations.filter(c => c.severity === 'critical').length,
      autoCleanupCandidates: contaminations.filter(c => c.autoCleanup).length,
      patternBreakdown: getPatternBreakdown(contaminations),
      affectedStates: getAffectedStates(contaminations)
    }

    console.log(`✅ Contamination scan complete: ${contaminations.length} potential contaminations found`)

    return NextResponse.json({
      success: true,
      summary,
      contaminations,
      patternsScanned: patternsToCheck.map(p => p.name)
    })

  } catch (error) {
    console.error('❌ Error scanning for contamination:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, pwsids, pattern, dryRun = true } = await request.json()

    let results: any[] = []

    if (action === 'cleanup_pattern' && pattern) {
      // Cleanup all contaminations matching a specific pattern
      const contaminationPattern = CONTAMINATION_PATTERNS.find(p =>
        p.name.toLowerCase().includes(pattern.toLowerCase())
      )

      if (!contaminationPattern) {
        return NextResponse.json({
          success: false,
          error: 'Pattern not found'
        })
      }

      if (!contaminationPattern.autoCleanup && !dryRun) {
        return NextResponse.json({
          success: false,
          error: 'Pattern is not marked for auto-cleanup. Use manual review.'
        })
      }

      // Get contaminated data matching this pattern
      const { data: contaminatedData } = await supabase
        .from('chlorine_data')
        .select('pwsid, utility_name, source_url')

      const toCleanup = (contaminatedData || []).filter(entry => {
        if (entry.source_url && contaminationPattern.urlPattern.test(entry.source_url)) {
          const pwsidState = entry.pwsid.substring(0, 2)
          return contaminationPattern.suspiciousStates.includes('ALL') ||
                 contaminationPattern.suspiciousStates.includes(pwsidState)
        }
        return false
      })

      for (const entry of toCleanup) {
        if (!dryRun) {
          const { error: deleteError } = await supabase
            .from('chlorine_data')
            .delete()
            .eq('pwsid', entry.pwsid)

          if (deleteError) {
            console.error(`Failed to delete ${entry.pwsid}:`, deleteError)
            results.push({
              pwsid: entry.pwsid,
              action: 'failed',
              error: deleteError.message
            })
          } else {
            results.push({
              pwsid: entry.pwsid,
              action: 'deleted',
              utilityName: entry.utility_name
            })
          }
        } else {
          results.push({
            pwsid: entry.pwsid,
            action: 'would_delete',
            utilityName: entry.utility_name,
            reason: `Matches ${contaminationPattern.name} pattern`
          })
        }
      }

    } else if (action === 'cleanup_specific' && pwsids) {
      // Cleanup specific PWSIDs
      for (const pwsid of pwsids) {
        if (!dryRun) {
          const { error: deleteError } = await supabase
            .from('chlorine_data')
            .delete()
            .eq('pwsid', pwsid)

          if (deleteError) {
            results.push({
              pwsid,
              action: 'failed',
              error: deleteError.message
            })
          } else {
            results.push({
              pwsid,
              action: 'deleted'
            })
          }
        } else {
          results.push({
            pwsid,
            action: 'would_delete'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      summary: {
        totalProcessed: results.length,
        deleted: results.filter(r => r.action === 'deleted').length,
        failed: results.filter(r => r.action === 'failed').length,
        wouldDelete: results.filter(r => r.action === 'would_delete').length
      }
    })

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(
  pattern: ContaminationPattern,
  entry: any,
  pwsidState: string
): string[] {
  const recommendations: string[] = []

  if (pattern.autoCleanup) {
    recommendations.push('AUTO-CLEANUP: Safe to remove automatically')
  } else {
    recommendations.push('MANUAL REVIEW: Requires human verification before removal')
  }

  if (pattern.severity === 'critical') {
    recommendations.push('URGENT: Remove immediately to prevent user confusion')
  }

  recommendations.push(`Verify correct data exists for ${pwsidState} utilities`)

  if (entry.source_url) {
    recommendations.push('Update search exclusions to prevent re-contamination')
  }

  if (pattern.name.includes('Franklin')) {
    recommendations.push('Ensure TN0000246 (correct Franklin TN) has valid data')
  }

  return recommendations
}

function getPatternBreakdown(contaminations: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {}
  contaminations.forEach(c => {
    breakdown[c.patternName] = (breakdown[c.patternName] || 0) + 1
  })
  return breakdown
}

function getAffectedStates(contaminations: any[]): Record<string, number> {
  const states: Record<string, number> = {}
  contaminations.forEach(c => {
    const state = c.pwsid.substring(0, 2)
    states[state] = (states[state] || 0) + 1
  })
  return states
}