import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url') || 'https://milcrofton.gov/wp-content/uploads/CCR-2024.pdf'

    // Scrape the URL
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

    // Look for chlorine-related content
    const chlorineLines = content.split('\n').filter(line => 
      line.toLowerCase().includes('chlorine') || 
      line.includes('0.84') ||
      line.includes('0.23') ||
      line.includes('1.82')
    )

    // Try different patterns
    const patterns = [
      /Chlorine\s*\|\s*NO\s*\|\s*(\d+\.?\d*)\s*Avg\.\s*\|\s*([\d\.\s\-]+)/i,
      /Chlorine[\s\|]*NO[\s\|]*(\d+\.?\d*)\s*Avg\./i,
      /Chlorine[\s\|]*\w*[\s\|]*(\d+\.?\d*)\s*(?:ppm|mg\/l|Avg\.)/i,
      /chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i,
      /(\d+\.?\d*)\s*Avg\./i,
      /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/i
    ]

    const patternResults = patterns.map((pattern, index) => {
      const matches = content.match(pattern)
      return {
        pattern: index,
        matches: matches
      }
    })

    return NextResponse.json({
      success: true,
      url: url,
      contentLength: content.length,
      chlorineLines: chlorineLines,
      patternResults: patternResults,
      sampleContent: content.substring(0, 2000) + '...',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
