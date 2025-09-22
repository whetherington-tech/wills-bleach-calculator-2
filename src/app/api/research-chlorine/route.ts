import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'research_utility'
    const pwsid = searchParams.get('pwsid') || 'TN0000247'
    const utilityName = searchParams.get('utility') || 'MILCROFTON UTILITY DISTRICT'

    if (action === 'research_utility') {
      // Use Perplexity to research chlorine levels for a specific utility
      const researchQuery = `Find the current chlorine levels, residual chlorine, or free chlorine levels for ${utilityName} (PWSID: ${pwsid}) from their Consumer Confidence Report (CCR), water quality report, or official utility website. Include average levels, ranges, and any recent testing data. Focus on free chlorine residual levels in PPM or mg/L.`
      
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: researchQuery
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      })

      if (!perplexityResponse.ok) {
        throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
      }

      const perplexityData = await perplexityResponse.json()
      const researchResult = perplexityData.choices?.[0]?.message?.content || 'No data found'

      // Try to extract chlorine levels from the response
      const chlorineMatch = researchResult.match(/(\d+\.?\d*)\s*(?:ppm|mg\/l|mg\/L)/gi)
      const extractedLevels = chlorineMatch ? chlorineMatch.map(match => {
        const number = parseFloat(match.replace(/[^\d.]/g, ''))
        return isNaN(number) ? null : number
      }).filter(Boolean) : []

      const averageChlorine = extractedLevels.length > 0 
        ? extractedLevels.reduce((sum, level) => sum + level, 0) / extractedLevels.length
        : null

      const minChlorine = extractedLevels.length > 0 ? Math.min(...extractedLevels) : null
      const maxChlorine = extractedLevels.length > 0 ? Math.max(...extractedLevels) : null

      return NextResponse.json({
        success: true,
        pwsid,
        utilityName,
        researchResult,
        extractedLevels,
        averageChlorine,
        minChlorine,
        maxChlorine,
        sampleCount: extractedLevels.length,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'research_multiple') {
      // Research multiple utilities at once
      const utilities = [
        { pwsid: 'TN0000247', name: 'MILCROFTON UTILITY DISTRICT' },
        { pwsid: 'TN0000246', name: 'FRANKLIN WATER DEPT' },
        { pwsid: 'TN0000128', name: 'Nashville Water Services' },
        { pwsid: 'TN0000699', name: 'H.B.& T.S. UTILITY DISTRICT' },
        { pwsid: 'TN0000428', name: 'MALLORY VALLEY U.D.' }
      ]

      const results = []
      
      for (const utility of utilities) {
        try {
          const researchQuery = `Find chlorine levels for ${utility.name} (PWSID: ${utility.pwsid}) from CCR reports or official sources. Include free chlorine residual levels in PPM.`
          
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'You are a water quality expert. Find specific chlorine levels from official sources. Provide exact numbers in PPM when available.'
                },
                {
                  role: 'user',
                  content: researchQuery
                }
              ],
              max_tokens: 500,
              temperature: 0.1
            })
          })

          if (perplexityResponse.ok) {
            const data = await perplexityResponse.json()
            const content = data.choices?.[0]?.message?.content || ''
            
            // Extract chlorine levels
            const chlorineMatch = content.match(/(\d+\.?\d*)\s*(?:ppm|mg\/l|mg\/L)/gi)
            const extractedLevels = chlorineMatch ? chlorineMatch.map(match => {
              const number = parseFloat(match.replace(/[^\d.]/g, ''))
              return isNaN(number) ? null : number
            }).filter(Boolean) : []

            const averageChlorine = extractedLevels.length > 0 
              ? extractedLevels.reduce((sum, level) => sum + level, 0) / extractedLevels.length
              : null

            results.push({
              pwsid: utility.pwsid,
              utilityName: utility.name,
              averageChlorine,
              extractedLevels,
              content: content.substring(0, 200) + '...',
              success: true
            })
          } else {
            results.push({
              pwsid: utility.pwsid,
              utilityName: utility.name,
              success: false,
              error: `API error: ${perplexityResponse.status}`
            })
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          results.push({
            pwsid: utility.pwsid,
            utilityName: utility.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
