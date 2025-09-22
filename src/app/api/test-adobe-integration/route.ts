import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test with Nolensville CCR PDF URL
    const testPdfUrl = 'https://www.ncgud.com/wp-content/uploads/2025/05/CCR-2024-New.pdf'
    
    console.log('🧪 Testing Adobe PDF Services integration...')
    
    // Test the Adobe PDF extraction
    const adobeResponse = await fetch('http://localhost:3000/api/extract-pdf-with-adobe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfUrl: testPdfUrl,
        utilityName: 'NOLENSVILLE-COLLEGE GROVE U.D.',
        city: 'Nolensville',
        state: 'TN'
      })
    })

    if (adobeResponse.ok) {
      const adobeData = await adobeResponse.json()
      
      return NextResponse.json({
        success: true,
        message: 'Adobe PDF Services integration test successful',
        testResults: {
          pdfUrl: testPdfUrl,
          adobeResponse: adobeData,
          chlorineData: adobeData.data?.chlorineData,
          extractedText: adobeData.data?.extractedText?.substring(0, 500) + '...'
        }
      })
    } else {
      const errorText = await adobeResponse.text()
      return NextResponse.json({
        success: false,
        message: 'Adobe PDF Services integration test failed',
        error: errorText,
        status: adobeResponse.status
      })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test failed with error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
