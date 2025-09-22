import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pwsid = searchParams.get('pwsid') || 'TN0000511'
    const utilityName = searchParams.get('utilityName') || 'NOLENSVILLE-COLLEGE GROVE U.D.'
    
    // Try multiple EPA data sources
    const results = {
      pwsid,
      utilityName,
      dataSources: []
    }

    // 1. Try EPA ECHO system
    try {
      const echoUrl = `https://echo.epa.gov/help/facility-search/drinking-water-search-results-help`
      const echoResponse = await fetch(echoUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)'
        }
      })
      
      if (echoResponse.ok) {
        results.dataSources.push({
          source: 'EPA ECHO',
          url: echoUrl,
          accessible: true,
          note: 'ECHO system accessible - can search for compliance data'
        })
      }
    } catch (error) {
      results.dataSources.push({
        source: 'EPA ECHO',
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 2. Try EPA Water Quality Portal
    try {
      const wqpUrl = `https://www.epa.gov/waterdata/water-quality-data-download`
      const wqpResponse = await fetch(wqpUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)'
        }
      })
      
      if (wqpResponse.ok) {
        results.dataSources.push({
          source: 'EPA Water Quality Portal',
          url: wqpUrl,
          accessible: true,
          note: 'WQP accessible - contains water quality monitoring data'
        })
      }
    } catch (error) {
      results.dataSources.push({
        source: 'EPA Water Quality Portal',
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 3. Try EPA SDWIS (if accessible)
    try {
      const sdwisUrl = `https://sdwis.epa.gov/`
      const sdwisResponse = await fetch(sdwisUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WaterQualityBot/1.0)'
        }
      })
      
      if (sdwisResponse.ok) {
        results.dataSources.push({
          source: 'EPA SDWIS',
          url: sdwisUrl,
          accessible: true,
          note: 'SDWIS accessible - contains drinking water system data'
        })
      }
    } catch (error) {
      results.dataSources.push({
        source: 'EPA SDWIS',
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 4. Try to find specific data for the PWSID
    try {
      // Search for chlorine data in EPA databases
      const searchQuery = `${utilityName} chlorine levels EPA database PWSID ${pwsid}`
      
      results.dataSources.push({
        source: 'EPA Data Search',
        searchQuery,
        note: 'Search query for chlorine data in EPA databases',
        recommendations: [
          'Check EPA ECHO for compliance violations',
          'Search Water Quality Portal for monitoring data',
          'Look for SDWIS sample results data',
          'Check state-level databases (Tennessee Department of Environment and Conservation)'
        ]
      })
    } catch (error) {
      results.dataSources.push({
        source: 'EPA Data Search',
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
