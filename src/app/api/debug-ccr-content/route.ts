import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
    }

    // Use Firecrawl to scrape a specific URL with enhanced PDF handling
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

    // Test chlorine patterns on the content
    const chlorinePatterns = [
      /chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/gi,
      /Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /Chlorine\s+\(Free\)\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /Chlorine\s+\(Total\)\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /Free\s+Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /Total\s+Chlorine\s+(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /Chlorine\s+(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s+(?:ppm|mg\/l)/gi,
      /chlorine[^0-9]*(\d+\.?\d*)[^0-9]*(?:ppm|mg\/l)/gi
    ]

    const foundChlorineData = []
    for (const pattern of chlorinePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        foundChlorineData.push({
          pattern: pattern.toString(),
          matches: matches
        })
      }
    }

    return NextResponse.json({
      success: true,
      url,
      fullContent: content,
      contentLength: content.length,
      foundChlorineData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
