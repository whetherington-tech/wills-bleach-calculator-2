import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid') || 'TN0000511'
    const utilityName = searchParams.get('utilityName') || 'NOLENSVILLE-COLLEGE GROVE U.D.'
    
    const testResults = {
      pwsid,
      utilityName,
      tests: []
    }

    // Test 1: Try to access EPA ECHO with a simple search
    try {
      console.log('Testing EPA ECHO access...')
      const echoUrl = `https://echo.epa.gov/help/facility-search/drinking-water-search-results-help`
      const echoResponse = await fetch(echoUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      testResults.tests.push({
        test: 'EPA ECHO Basic Access',
        url: echoUrl,
        status: echoResponse.status,
        success: echoResponse.ok,
        contentType: echoResponse.headers.get('content-type'),
        contentLength: echoResponse.headers.get('content-length'),
        note: echoResponse.ok ? 'ECHO system accessible' : 'ECHO system not accessible'
      })
    } catch (error) {
      testResults.tests.push({
        test: 'EPA ECHO Basic Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Try to access Water Quality Portal
    try {
      console.log('Testing Water Quality Portal access...')
      const wqpUrl = `https://www.epa.gov/waterdata/water-quality-data-download`
      const wqpResponse = await fetch(wqpUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      testResults.tests.push({
        test: 'Water Quality Portal Access',
        url: wqpUrl,
        status: wqpResponse.status,
        success: wqpResponse.ok,
        contentType: wqpResponse.headers.get('content-type'),
        contentLength: wqpResponse.headers.get('content-length'),
        note: wqpResponse.ok ? 'WQP accessible' : 'WQP not accessible'
      })
    } catch (error) {
      testResults.tests.push({
        test: 'Water Quality Portal Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Try to access SDWIS
    try {
      console.log('Testing SDWIS access...')
      const sdwisUrl = `https://sdwis.epa.gov/`
      const sdwisResponse = await fetch(sdwisUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      testResults.tests.push({
        test: 'SDWIS Access',
        url: sdwisUrl,
        status: sdwisResponse.status,
        success: sdwisResponse.ok,
        contentType: sdwisResponse.headers.get('content-type'),
        contentLength: sdwisResponse.headers.get('content-length'),
        note: sdwisResponse.ok ? 'SDWIS accessible' : 'SDWIS not accessible'
      })
    } catch (error) {
      testResults.tests.push({
        test: 'SDWIS Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Try to find any API endpoints or data access methods
    try {
      console.log('Testing for API endpoints...')
      
      // Try common API patterns
      const apiUrls = [
        'https://echo.epa.gov/api/',
        'https://www.epa.gov/api/',
        'https://sdwis.epa.gov/api/',
        'https://echo.epa.gov/rest/',
        'https://www.epa.gov/rest/'
      ]
      
      const apiTests = []
      for (const apiUrl of apiUrls) {
        try {
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)',
              'Accept': 'application/json,application/xml,text/plain'
            }
          })
          
          apiTests.push({
            url: apiUrl,
            status: apiResponse.status,
            success: apiResponse.ok,
            contentType: apiResponse.headers.get('content-type')
          })
        } catch (error) {
          apiTests.push({
            url: apiUrl,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      testResults.tests.push({
        test: 'API Endpoint Discovery',
        results: apiTests,
        note: 'Testing common API patterns'
      })
    } catch (error) {
      testResults.tests.push({
        test: 'API Endpoint Discovery',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 5: Try to search for the specific PWSID
    try {
      console.log('Testing PWSID search...')
      
      // Try different search patterns
      const searchUrls = [
        `https://echo.epa.gov/facility-search?pws_id=${pwsid}`,
        `https://echo.epa.gov/facility-search?pwsid=${pwsid}`,
        `https://echo.epa.gov/facility-search?pws_id=${pwsid}&facility_type=drinking_water`,
        `https://www.epa.gov/waterdata/water-quality-data-download?pws_id=${pwsid}`
      ]
      
      const searchTests = []
      for (const searchUrl of searchUrls) {
        try {
          const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          })
          
          searchTests.push({
            url: searchUrl,
            status: searchResponse.status,
            success: searchResponse.ok,
            contentType: searchResponse.headers.get('content-type'),
            note: searchResponse.ok ? 'Search URL accessible' : 'Search URL not accessible'
          })
        } catch (error) {
          searchTests.push({
            url: searchUrl,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      testResults.tests.push({
        test: 'PWSID Search Tests',
        pwsid,
        results: searchTests,
        note: 'Testing different search patterns for PWSID'
      })
    } catch (error) {
      testResults.tests.push({
        test: 'PWSID Search Tests',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      testResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
