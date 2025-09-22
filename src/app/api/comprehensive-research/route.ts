import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'research_all'
    
    if (action === 'research_all') {
      // Get all major utilities from the database
      const { data: utilities, error } = await supabase
        .from('water_systems')
        .select('pwsid, pws_name, city_name, state_code')
        .eq('pws_type_code', 'CWS')
        .gte('population_served_count', '10000')
        .eq('owner_type_code', 'L')
        .limit(10)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const results = []
      
      for (const utility of utilities || []) {
        try {
          console.log(`Researching ${utility.pws_name}...`)
          
          // Step 1: Use Perplexity to find CCR reports and chlorine data
          const perplexityQuery = `Find the Consumer Confidence Report (CCR) or water quality report for ${utility.pws_name} in ${utility.city_name}, ${utility.state_code}. Look for free chlorine residual levels, chlorine levels, or disinfectant levels in PPM or mg/L. Include the official website URL if available.`
          
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
                  content: perplexityQuery
                }
              ],
              max_tokens: 800,
              temperature: 0.1
            })
          })

          let perplexityData = null
          if (perplexityResponse.ok) {
            perplexityData = await perplexityResponse.json()
          }

          // Step 2: Use Firecrawl to search for CCR reports
          const firecrawlQuery = `${utility.pws_name} ${utility.city_name} ${utility.state_code} Consumer Confidence Report CCR water quality`
          
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: firecrawlQuery,
              pageOptions: {
                fetchPageContent: true,
                onlyMainContent: true
              },
              searchOptions: {
                limit: 3
              }
            })
          })

          let firecrawlData = null
          if (firecrawlResponse.ok) {
            firecrawlData = await firecrawlResponse.json()
          }

          // Extract chlorine levels from both sources
          const allLevels = []
          let sources = []

          // From Perplexity
          if (perplexityData?.choices?.[0]?.message?.content) {
            const content = perplexityData.choices[0].message.content
            const chlorineMatch = content.match(/(\d+\.?\d*)\s*(?:ppm|mg\/l|mg\/L)/gi)
            if (chlorineMatch) {
              chlorineMatch.forEach(match => {
                const number = parseFloat(match.replace(/[^\d.]/g, ''))
                if (!isNaN(number) && number > 0 && number < 10) {
                  allLevels.push(number)
                }
              })
            }
            sources.push('Perplexity Research')
          }

          // From Firecrawl
          if (firecrawlData?.data) {
            firecrawlData.data.forEach((result: any) => {
              const content = result.content || ''
              const chlorinePatterns = [
                /free chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
                /residual chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
                /chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi
              ]

              chlorinePatterns.forEach(pattern => {
                const matches = content.match(pattern)
                if (matches) {
                  matches.forEach(match => {
                    const number = parseFloat(match.replace(/[^\d.]/g, ''))
                    if (!isNaN(number) && number > 0 && number < 10) {
                      allLevels.push(number)
                    }
                  })
                }
              })
            })
            sources.push('Firecrawl CCR Search')
          }

          // Calculate statistics
          const averageChlorine = allLevels.length > 0 
            ? allLevels.reduce((sum, level) => sum + level, 0) / allLevels.length
            : null

          const minChlorine = allLevels.length > 0 ? Math.min(...allLevels) : null
          const maxChlorine = allLevels.length > 0 ? Math.max(...allLevels) : null

          results.push({
            pwsid: utility.pwsid,
            utilityName: utility.pws_name,
            city: utility.city_name,
            state: utility.state_code,
            averageChlorine,
            minChlorine,
            maxChlorine,
            allLevels,
            sampleCount: allLevels.length,
            sources: sources.join(', '),
            success: allLevels.length > 0,
            perplexityContent: perplexityData?.choices?.[0]?.message?.content?.substring(0, 200) + '...',
            firecrawlResults: firecrawlData?.data?.length || 0
          })

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000))
        } catch (error) {
          results.push({
            pwsid: utility.pwsid,
            utilityName: utility.pws_name,
            city: utility.city_name,
            state: utility.state_code,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          withData: results.filter(r => r.averageChlorine).length
        },
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
