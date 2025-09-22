import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'research_single'
    const pwsid = searchParams.get('pwsid')
    const utilityName = searchParams.get('utility')
    const city = searchParams.get('city')
    const state = searchParams.get('state') || 'Tennessee'

    if (action === 'research_single' && pwsid && utilityName) {
      // Check if we already have recent data for this utility
      const { data: existingData, error: checkError } = await supabase
        .from('chlorine_data')
        .select('*')
        .eq('pwsid', pwsid)
        .gte('last_updated', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Within last year
        .single()

      if (!checkError && existingData) {
        return NextResponse.json({
          success: true,
          message: 'Recent data already exists',
          data: existingData,
          fromCache: true
        })
      }

              // Research new data using Firecrawl - be more specific to avoid wrong state
              const searchQuery = `${utilityName} ${city || ''} ${state} Consumer Confidence Report CCR water quality chlorine sodium hypochlorite disinfectant residual levels -Maine -ME`
      
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
      console.log('🔧 Firecrawl search results:', searchData.data?.length, 'results')
      const ccrUrls = searchData.data?.filter((result: any) => {
        const title = result.title.toLowerCase()
        const url = result.url.toLowerCase()
        const hasCCR = url.includes('ccr') || title.includes('water quality') || title.includes('consumer confidence')
        console.log(`🔧 Filtering: ${result.title} - hasCCR: ${hasCCR}`)
        return hasCCR
      }) || []

      let chlorineData = null
      let sourceUrl = null

      // Try to extract data using Adobe PDF Services for PDFs, Firecrawl for HTML
      console.log(`🔧 Found ${ccrUrls.length} CCR URLs to search:`, ccrUrls.map(u => u.url))
      for (const ccr of ccrUrls.slice(0, 2)) { // Try up to 2 reports
        try {
          // Check if it's a PDF file
          if (ccr.url.toLowerCase().includes('.pdf') || ccr.url.toLowerCase().includes('pdf')) {
            console.log(`🔍 Processing PDF with AI-powered extraction: ${ccr.url}`)
            
            // Use download-and-analyze method (most robust for protected PDFs)
            const aiResponse = await fetch('http://localhost:3000/api/download-and-analyze-pdf', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pdfUrl: ccr.url,
                utilityName: utilityName,
                city: city,
                state: state
              })
            })

            if (aiResponse.ok) {
              const aiData = await aiResponse.json()
              console.log(`🔧 AI extraction response for ${ccr.url}:`, JSON.stringify(aiData, null, 2))
              const extractedChlorine = aiData.data?.chlorineData
              console.log(`🔧 Extracted chlorine data:`, extractedChlorine)
              
              if (extractedChlorine && extractedChlorine.averageChlorine) {
                chlorineData = {
                  averageChlorine: extractedChlorine.averageChlorine,
                  minChlorine: extractedChlorine.minChlorine || extractedChlorine.averageChlorine * 0.7,
                  maxChlorine: extractedChlorine.maxChlorine || extractedChlorine.averageChlorine * 1.3,
                  sampleCount: extractedChlorine.sampleCount || 12,
                  sourceUrl: ccr.url,
                  reportTitle: ccr.title,
                  extractionMethod: 'AI-powered PDF Analysis',
                  confidence: extractedChlorine.confidence
                }
                sourceUrl = ccr.url
                break
              } else {
                console.log(`🔧 AI extraction found no chlorine data, trying Python fallback...`)
                
                // Fallback to Python extraction if AI didn't find data
                const pythonResponse = await fetch('http://localhost:3000/api/extract-pdf-python', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    pdfUrl: ccr.url,
                    utilityName: utilityName,
                    city: city,
                    state: state
                  })
                })

                if (pythonResponse.ok) {
                  const pythonData = await pythonResponse.json()
                  console.log(`🔧 Python fallback response for ${ccr.url}:`, JSON.stringify(pythonData, null, 2))
                  const extractedChlorine = pythonData.data?.chlorineData
                  console.log(`🔧 Extracted chlorine data:`, extractedChlorine)
                  
                  if (extractedChlorine && extractedChlorine.averageChlorine) {
                    chlorineData = {
                      averageChlorine: extractedChlorine.averageChlorine,
                      minChlorine: extractedChlorine.minChlorine || extractedChlorine.averageChlorine * 0.7,
                      maxChlorine: extractedChlorine.maxChlorine || extractedChlorine.averageChlorine * 1.3,
                      sampleCount: extractedChlorine.sampleCount || 12,
                      sourceUrl: ccr.url,
                      reportTitle: ccr.title,
                      extractionMethod: 'Python PDF Extraction (Fallback)'
                    }
                    sourceUrl = ccr.url
                    break
                  }
                } else {
                  console.error(`Python fallback extraction failed for ${ccr.url}:`, await pythonResponse.text())
                }
              }
            } else {
              console.error(`AI PDF extraction failed for ${ccr.url}:`, await aiResponse.text())
            }
          } else {
            // Use Firecrawl for HTML content
            console.log(`🔍 Processing HTML with Firecrawl: ${ccr.url}`)
            
            const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: ccr.url
              })
            })

            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json()
              const content = scrapeData.data?.content || ''
              
                      // Extract chlorine data using multiple patterns
                      let chlorineMatch = content.match(/Chlorine\s*\|\s*NO\s*\|\s*(\d+\.?\d*)\s*Avg\.\s*\|\s*([\d\.\s\-]+)/i)
                      
                      // Try alternative patterns
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/Chlorine[\s\|]*NO[\s\|]*(\d+\.?\d*)\s*Avg\./i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/Chlorine[\s\|]*\w*[\s\|]*(\d+\.?\d*)\s*(?:ppm|mg\/l|Avg\.)/i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/sodium\s*hypochlorite[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/hypochlorite[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/disinfectant\s*residual[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                      }
                      if (!chlorineMatch) {
                        chlorineMatch = content.match(/disinfectant[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                      }
              
              if (chlorineMatch) {
                const avgLevel = parseFloat(chlorineMatch[1])
                
                if (!isNaN(avgLevel) && avgLevel > 0 && avgLevel < 10) {
                  // Try to find range in the same line or nearby
                  let minLevel = avgLevel * 0.7
                  let maxLevel = avgLevel * 1.3
                  
                  const rangeMatch = content.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
                  if (rangeMatch) {
                    const rangeMin = parseFloat(rangeMatch[1])
                    const rangeMax = parseFloat(rangeMatch[2])
                    if (!isNaN(rangeMin) && !isNaN(rangeMax) && rangeMin < rangeMax) {
                      minLevel = rangeMin
                      maxLevel = rangeMax
                    }
                  }
                  
                  chlorineData = {
                    averageChlorine: avgLevel,
                    minChlorine: minLevel,
                    maxChlorine: maxLevel,
                    sampleCount: 12, // Typical for CCR reports
                    sourceUrl: ccr.url,
                    reportTitle: ccr.title,
                    extractionMethod: 'Firecrawl'
                  }
                  sourceUrl = ccr.url
                  break
                }
              }
            }
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`Error processing ${ccr.url}:`, error)
          continue
        }
      }

      if (chlorineData) {
        // Store the data in Supabase
        const { data: storedData, error: storeError } = await supabase
          .from('chlorine_data')
          .upsert({
            pwsid: pwsid,
            utility_name: utilityName,
            average_chlorine_ppm: chlorineData.averageChlorine,
            min_chlorine_ppm: chlorineData.minChlorine,
            max_chlorine_ppm: chlorineData.maxChlorine,
            sample_count: chlorineData.sampleCount,
            last_updated: new Date().toISOString().split('T')[0],
            data_source: 'Consumer Confidence Report',
            notes: `Extracted from ${chlorineData.reportTitle} via Firecrawl API`,
            source_url: sourceUrl
          }, { onConflict: 'pwsid' })
          .select()
          .single()

        if (storeError) {
          throw new Error(`Database error: ${storeError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Chlorine data researched and stored successfully',
          data: storedData,
          fromCache: false,
          sourceUrl: sourceUrl
        })
      } else {
        // Enhanced error handling with specific error types
        let errorType = 'no_data_found'
        let errorMessage = 'No chlorine data found in CCR reports'
        let userMessage = 'We were unable to extract chlorine data from the available CCR reports.'
        let manualEntryAvailable = true

        if (ccrUrls.length === 0) {
          errorType = 'no_ccr_found'
          errorMessage = 'No CCR reports found for this utility'
          userMessage = 'We could not find any Consumer Confidence Reports for this utility. This may be due to:'
          manualEntryAvailable = true
        } else if (ccrUrls.length > 0) {
          errorType = 'extraction_failed'
          errorMessage = 'Found CCR reports but could not extract chlorine data'
          userMessage = 'We found CCR reports but were unable to extract chlorine data. This may be due to:'
          manualEntryAvailable = true
        }

        return NextResponse.json({
          success: false,
          errorType: errorType,
          message: errorMessage,
          userMessage: userMessage,
          searchedUrls: ccrUrls.map((u: any) => u.url),
          manualEntryAvailable: manualEntryAvailable,
          manualEntryInstructions: manualEntryAvailable ? [
            'Protected or restricted government PDFs',
            'Complex PDF formatting that requires manual review',
            'Missing or unclear chlorine data in the reports',
            'Technical issues with PDF processing'
          ] : [],
          nextSteps: manualEntryAvailable ? [
            'You can manually enter the chlorine data from your utility\'s CCR report',
            'Look for the "Water Quality Data" or "Disinfectant Residual" section',
            'Find the average chlorine level (usually in ppm or mg/L)',
            'Enter the data using the manual entry form'
          ] : []
        })
      }
    }

    if (action === 'research_cities') {
      // Research all major utilities in Nashville, Brentwood, and Franklin
      const cities = [
        { name: 'Nashville', state: 'TN' },
        { name: 'Brentwood', state: 'TN' },
        { name: 'Franklin', state: 'TN' }
      ]

      const results = []

      for (const city of cities) {
        // Get utilities for this city from our database
        const { data: utilities, error: utilitiesError } = await supabase
          .from('water_systems')
          .select('pwsid, pws_name, city_name, state_code')
          .ilike('city_name', `%${city.name}%`)
          .eq('state_code', city.state)
          .eq('pws_type_code', 'CWS')
          .gte('population_served_count', '5000')
          .eq('owner_type_code', 'L')
          .limit(5)

        if (utilitiesError) {
          results.push({
            city: city.name,
            error: utilitiesError.message
          })
          continue
        }

        const cityResults = []
        for (const utility of utilities || []) {
          try {
            // Check if we already have recent data
            const { data: existingData } = await supabase
              .from('chlorine_data')
              .select('*')
              .eq('pwsid', utility.pwsid)
              .gte('last_updated', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              .single()

            if (existingData) {
              cityResults.push({
                pwsid: utility.pwsid,
                utilityName: utility.pws_name,
                status: 'cached',
                data: existingData
              })
              continue
            }

                    // Research new data
                    const searchQuery = `${utility.pws_name} ${utility.city_name} ${utility.state_code} Consumer Confidence Report CCR water quality chlorine sodium hypochlorite disinfectant residual levels`
            
            const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: searchQuery,
                limit: 2
              })
            })

            if (firecrawlResponse.ok) {
              const searchData = await firecrawlResponse.json()
              const ccrUrls = searchData.data?.filter((result: any) => 
                result.url.includes('CCR') || 
                result.title.toLowerCase().includes('water quality')
              ) || []

              let chlorineData = null
              let sourceUrl = null

              // Try to scrape the first CCR report
              if (ccrUrls.length > 0) {
                try {
                  const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: ccrUrls[0].url
                    })
                  })

                  if (scrapeResponse.ok) {
                    const scrapeData = await scrapeResponse.json()
                    const content = scrapeData.data?.content || ''
                    
                    let chlorineMatch = content.match(/Chlorine\s*\|\s*NO\s*\|\s*(\d+\.?\d*)\s*Avg\.\s*\|\s*([\d\.\s\-]+)/i)
                    
                    // Try alternative patterns
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/Chlorine[\s\|]*NO[\s\|]*(\d+\.?\d*)\s*Avg\./i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/Chlorine[\s\|]*\w*[\s\|]*(\d+\.?\d*)\s*(?:ppm|mg\/l|Avg\.)/i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/chlorine[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/sodium\s*hypochlorite[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/hypochlorite[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/disinfectant\s*residual[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                    }
                    if (!chlorineMatch) {
                      chlorineMatch = content.match(/disinfectant[:\s]*(\d+\.?\d*)\s*(?:ppm|mg\/l)/i)
                    }
                    
                    if (chlorineMatch) {
                      const avgLevel = parseFloat(chlorineMatch[1])
                      
                      if (!isNaN(avgLevel) && avgLevel > 0 && avgLevel < 10) {
                        // Try to find range
                        let minLevel = avgLevel * 0.7
                        let maxLevel = avgLevel * 1.3
                        
                        const rangeMatch = content.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
                        if (rangeMatch) {
                          const rangeMin = parseFloat(rangeMatch[1])
                          const rangeMax = parseFloat(rangeMatch[2])
                          if (!isNaN(rangeMin) && !isNaN(rangeMax) && rangeMin < rangeMax) {
                            minLevel = rangeMin
                            maxLevel = rangeMax
                          }
                        }
                        
                        chlorineData = {
                          averageChlorine: avgLevel,
                          minChlorine: minLevel,
                          maxChlorine: maxLevel,
                          sampleCount: 12
                        }
                        sourceUrl = ccrUrls[0].url

                        // Store in database
                        const { data: storedData, error: storeError } = await supabase
                          .from('chlorine_data')
                          .upsert({
                            pwsid: utility.pwsid,
                            utility_name: utility.pws_name,
                            average_chlorine_ppm: chlorineData.averageChlorine,
                            min_chlorine_ppm: chlorineData.minChlorine,
                            max_chlorine_ppm: chlorineData.maxChlorine,
                            sample_count: chlorineData.sampleCount,
                            last_updated: new Date().toISOString().split('T')[0],
                            data_source: 'Consumer Confidence Report',
                            notes: `Extracted from CCR report via Firecrawl API`,
                            source_url: sourceUrl
                          }, { onConflict: 'pwsid' })
                          .select()
                          .single()

                        if (!storeError) {
                          cityResults.push({
                            pwsid: utility.pwsid,
                            utilityName: utility.pws_name,
                            status: 'researched',
                            data: storedData,
                            sourceUrl: sourceUrl
                          })
                        } else {
                          cityResults.push({
                            pwsid: utility.pwsid,
                            utilityName: utility.pws_name,
                            status: 'error',
                            error: storeError.message
                          })
                        }
                      }
                    }
                  }
                } catch (error) {
                  cityResults.push({
                    pwsid: utility.pwsid,
                    utilityName: utility.pws_name,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                  })
                }
              } else {
                cityResults.push({
                  pwsid: utility.pwsid,
                  utilityName: utility.pws_name,
                  status: 'no_ccr_found'
                })
              }
            }

            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, 3000))
          } catch (error) {
            cityResults.push({
              pwsid: utility.pwsid,
              utilityName: utility.pws_name,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        results.push({
          city: city.name,
          utilities: cityResults
        })
      }

      return NextResponse.json({
        success: true,
        message: 'City research completed',
        results: results,
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
