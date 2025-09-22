import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search_ccr'
    const utilityName = searchParams.get('utility') || 'MILCROFTON UTILITY DISTRICT'
    const state = searchParams.get('state') || 'Tennessee'

    if (action === 'search_ccr') {
      // Use Firecrawl to search for CCR reports
      const searchQuery = `${utilityName} ${state} Consumer Confidence Report CCR water quality chlorine levels`
      
      const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5
        })
      })

      if (!firecrawlResponse.ok) {
        throw new Error(`Firecrawl API error: ${firecrawlResponse.status}`)
      }

      const firecrawlData = await firecrawlResponse.json()
      
      // Extract CCR URLs for scraping
      const results = firecrawlData.data?.map((result: any) => ({
        url: result.url,
        title: result.title,
        description: result.description
      })) || []

      return NextResponse.json({
        success: true,
        utilityName,
        searchQuery,
        results,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'scrape_url') {
      const url = searchParams.get('url')
      if (!url) {
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
      }

      // Use Firecrawl to scrape a specific URL with better PDF handling
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url
        })
      })

      if (!scrapeResponse.ok) {
        throw new Error(`Firecrawl scrape error: ${scrapeResponse.status}`)
      }

      const scrapeData = await scrapeResponse.json()
      const content = scrapeData.data?.content || ''

      // Extract chlorine data from scraped content with comprehensive patterns
      const chlorinePatterns = [
        // Milcrofton format
        /Chlorine[\s\|]*NO[\s\|]*(\d+\.?\d*)\s*Avg\./gi,
        /Chlorine[\s\|]*\w*[\s\|]*(\d+\.?\d*)\s*(?:ppm|mg\/l|Avg\.)/gi,
        
        // General chlorine patterns
        /chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
        /free chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
        /residual chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
        /total chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
        
        // Table format patterns
        /Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        /Chlorine\s+(\d+\.?\d*)\s+Avg/gi,
        /Chlorine\s+(\d+\.?\d*)\s+Range/gi,
        
        // Nolensville specific patterns (based on common CCR formats)
        /Chlorine\s+\(Free\)\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        /Chlorine\s+\(Total\)\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        /Free\s+Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        /Total\s+Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        
        // Range patterns
        /Chlorine\s+(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
        /Chlorine\s+Range\s+(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/gi,
        
        // Average patterns
        /Chlorine\s+Average\s+(\d+\.?\d*)/gi,
        /Chlorine\s+Avg\.\s+(\d+\.?\d*)/gi,
        
        // Contaminant table patterns
        /Chlorine\s+NO\s+(\d+\.?\d*)\s+Avg\.\s+([\d\.\s\-]+)/gi,
        /Chlorine\s+NO\s+(\d+\.?\d*)\s+Range\s+([\d\.\s\-]+)/gi,
        
        // Generic number patterns near "chlorine"
        /chlorine[^0-9]*(\d+\.?\d*)[^0-9]*(?:ppm|mg\/l)/gi,
        /(\d+\.?\d*)[^0-9]*chlorine[^0-9]*(?:ppm|mg\/l)/gi
      ]

      const foundLevels = []
      const foundRanges = []
      
      // Look for specific patterns from the Milcrofton report
      const milcroftonMatch = content.match(/Chlorine\s*\|\s*NO\s*\|\s*(\d+\.?\d*)\s*Avg\.\s*\|\s*([\d\.\s\-]+)/i)
      if (milcroftonMatch) {
        const avgLevel = parseFloat(milcroftonMatch[1])
        if (!isNaN(avgLevel)) {
          foundLevels.push(avgLevel)
        }
        
        // Extract range
        const rangeMatch = milcroftonMatch[2].match(/([\d\.]+)\s*-\s*([\d\.]+)/)
        if (rangeMatch) {
          const minLevel = parseFloat(rangeMatch[1])
          const maxLevel = parseFloat(rangeMatch[2])
          if (!isNaN(minLevel) && !isNaN(maxLevel)) {
            foundRanges.push({ min: minLevel, max: maxLevel })
          }
        }
      }

      // Enhanced extraction with better range handling
      for (const pattern of chlorinePatterns) {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach(match => {
            // Handle range patterns (e.g., "1.2 - 2.5")
            const rangeMatch = match.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
            if (rangeMatch) {
              const minLevel = parseFloat(rangeMatch[1])
              const maxLevel = parseFloat(rangeMatch[2])
              if (!isNaN(minLevel) && !isNaN(maxLevel) && minLevel > 0 && maxLevel > 0 && minLevel < 10 && maxLevel < 10) {
                foundRanges.push({ min: minLevel, max: maxLevel })
                // Add average of range
                foundLevels.push((minLevel + maxLevel) / 2)
              }
            } else {
              // Handle single number patterns
              const numberMatch = match.match(/(\d+\.?\d*)/)
              if (numberMatch) {
                const level = parseFloat(numberMatch[1])
                if (!isNaN(level) && level > 0 && level < 10) { // Reasonable range
                  foundLevels.push(level)
                }
              }
            }
          })
        }
      }

      return NextResponse.json({
        success: true,
        url,
        content: content.substring(0, 1000) + '...',
        foundLevels,
        foundRanges,
        averageLevel: foundLevels.length > 0 ? foundLevels.reduce((sum, level) => sum + level, 0) / foundLevels.length : null,
        minLevel: foundRanges.length > 0 ? foundRanges[0].min : null,
        maxLevel: foundRanges.length > 0 ? foundRanges[0].max : null,
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
