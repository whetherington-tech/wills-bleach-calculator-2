import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pdfUrl = searchParams.get('pdfUrl')
    const utilityName = searchParams.get('utilityName') || 'NOLENSVILLE-COLLEGE GROVE U.D.'
    
    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL parameter required' }, { status: 400 })
    }

    // Use Perplexity to analyze the PDF content
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a water quality expert. Extract chlorine levels from water quality reports. Return data in JSON format with average_chlorine_ppm, min_chlorine_ppm, max_chlorine_ppm, and sample_count.'
          },
          {
            role: 'user',
            content: `Please analyze this water quality report PDF and extract the chlorine levels for ${utilityName}. The PDF URL is: ${pdfUrl}. Look for chlorine, free chlorine, or total chlorine measurements in ppm or mg/L. Return the data in this exact JSON format:
            {
              "average_chlorine_ppm": number,
              "min_chlorine_ppm": number,
              "max_chlorine_ppm": number,
              "sample_count": number,
              "data_source": "string",
              "notes": "string"
            }`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    })

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text()
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`)
    }

    const perplexityData = await perplexityResponse.json()
    const responseContent = perplexityData.choices?.[0]?.message?.content || ''

    // Try to parse JSON from the response
    let extractedData = null
    try {
      // Look for JSON in the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.log('Could not parse JSON from Perplexity response')
    }

    return NextResponse.json({
      success: true,
      pdfUrl,
      utilityName,
      perplexityResponse: responseContent,
      extractedData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
