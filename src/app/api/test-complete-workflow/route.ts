import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing complete Firecrawl + Adobe PDF Services workflow...')
    
    // Test the complete workflow for Nolensville
    const testParams = {
      pwsid: 'TN0000511',
      utility: 'NOLENSVILLE-COLLEGE GROVE U.D.',
      city: 'Nolensville',
      state: 'TN'
    }

    // Step 1: Test Firecrawl search for CCR reports
    console.log('Step 1: Searching for CCR reports with Firecrawl...')
    const searchQuery = `${testParams.utility} ${testParams.city} ${testParams.state} Consumer Confidence Report CCR water quality chlorine levels`
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3
      })
    })

    if (!firecrawlResponse.ok) {
      throw new Error(`Firecrawl search error: ${firecrawlResponse.status}`)
    }

    const searchData = await firecrawlResponse.json()
    const ccrUrls = searchData.data?.filter((result: any) => 
      result.url.includes('CCR') || 
      result.title.toLowerCase().includes('water quality') ||
      result.title.toLowerCase().includes('consumer confidence')
    ) || []

    console.log(`Found ${ccrUrls.length} potential CCR reports`)

    // Step 2: Test Adobe PDF extraction on the first PDF found
    let adobeResult = null
    if (ccrUrls.length > 0) {
      const firstCcr = ccrUrls[0]
      console.log(`Step 2: Testing Adobe PDF extraction on: ${firstCcr.url}`)
      
      if (firstCcr.url.toLowerCase().includes('.pdf') || firstCcr.url.toLowerCase().includes('pdf')) {
        const adobeResponse = await fetch('http://localhost:3000/api/extract-pdf-adobe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdfUrl: firstCcr.url,
            utilityName: testParams.utility,
            city: testParams.city,
            state: testParams.state
          })
        })

        if (adobeResponse.ok) {
          adobeResult = await adobeResponse.json()
          console.log('Adobe PDF extraction successful')
        } else {
          console.error('Adobe PDF extraction failed:', await adobeResponse.text())
        }
      }
    }

    // Step 3: Test the complete research workflow
    console.log('Step 3: Testing complete research workflow...')
    const researchResponse = await fetch(`http://localhost:3000/api/research-and-store?action=research_single&pwsid=${testParams.pwsid}&utility=${encodeURIComponent(testParams.utility)}&city=${testParams.city}&state=${testParams.state}`, {
      method: 'POST'
    })

    let researchResult = null
    if (researchResponse.ok) {
      researchResult = await researchResponse.json()
      console.log('Complete research workflow successful')
    } else {
      console.error('Research workflow failed:', await researchResponse.text())
    }

    return NextResponse.json({
      success: true,
      message: 'Complete workflow test completed',
      testResults: {
        step1_firecrawl_search: {
          success: firecrawlResponse.ok,
          ccrUrlsFound: ccrUrls.length,
          ccrUrls: ccrUrls.map((u: any) => ({ url: u.url, title: u.title }))
        },
        step2_adobe_extraction: {
          success: adobeResult ? true : false,
          result: adobeResult
        },
        step3_complete_workflow: {
          success: researchResult ? true : false,
          result: researchResult
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Workflow test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
