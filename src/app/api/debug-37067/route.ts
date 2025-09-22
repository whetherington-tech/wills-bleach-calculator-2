import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const zip = '37067'
    const debug = {
      zipCode: zip,
      timestamp: new Date().toISOString(),
      steps: [],
      finalUtilities: [],
      errors: []
    }

    let utilities: any[] = []

    // Step 0: Check zip_code_mapping table
    debug.steps.push("=== STEP 0: ZIP CODE MAPPING ===")
    const { data: zipMappings, error: zipError } = await supabase
      .from('zip_code_mapping')
      .select('*')
      .eq('zip_code', zip)

    debug.steps.push(`Zip mappings found: ${zipMappings?.length || 0}`)
    if (zipMappings?.length) {
      debug.steps.push(`PWSIDs: ${zipMappings.map(m => m.pwsid).join(', ')}`)
    }

    if (!zipError && zipMappings && zipMappings.length > 0) {
      const pwsids = zipMappings.map(mapping => mapping.pwsid)

      const { data: customUtilities, error: customError } = await supabase
        .from('water_utilities')
        .select('*')
        .in('pwsid', pwsids)
        .eq('is_active', true)

      debug.steps.push(`Water utilities from mapping: ${customUtilities?.length || 0}`)
      if (customUtilities?.length) {
        customUtilities.forEach(u => {
          debug.steps.push(`  - ${u.utility_name} (${u.pwsid})`)
        })
        utilities.push(...customUtilities)
      }
    }

    // Step 1: Municipal systems with geographic filtering
    debug.steps.push("=== STEP 1: MUNICIPAL SYSTEMS ===")
    const { data: municipalSystems, error: municipalError } = await supabase
      .from('water_systems')
      .select('*')
      .eq('zip_code', zip)
      .gte('population_served_count', '1000')
      .in('pws_type_code', ['CWS'])
      .in('owner_type_code', ['L', 'M'])
      .eq('pws_activity_code', 'A')
      .limit(5)

    debug.steps.push(`Municipal systems found: ${municipalSystems?.length || 0}`)
    if (municipalSystems?.length) {
      municipalSystems.forEach(s => {
        debug.steps.push(`  - ${s.pws_name} (${s.pwsid})`)
      })

      const allowedUtilities = ['milcrofton', 'franklin', 'h.b.', 'hbts']
      const relevantMunicipal = municipalSystems.filter(system => {
        const systemName = system.pws_name.toLowerCase()
        const isAllowed = allowedUtilities.some(allowed =>
          systemName.includes(allowed) ||
          system.city_name?.toLowerCase().includes(allowed)
        )
        debug.steps.push(`  ${system.pws_name}: ${isAllowed ? 'ALLOWED' : 'FILTERED OUT'}`)
        return isAllowed
      })
      utilities.push(...relevantMunicipal)
    }

    // Step 1.5: Curated utilities with geographic mapping
    debug.steps.push("=== STEP 1.5: CURATED UTILITIES ===")
    const allowedUtilities = ['milcrofton', 'franklin', 'h.b.', 'hbts']

    const { data: curatedUtilities, error: curatedError } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('is_active', true)

    debug.steps.push(`All curated utilities: ${curatedUtilities?.length || 0}`)
    if (curatedUtilities?.length) {
      const relevantUtilities = curatedUtilities.filter(utility => {
        const utilityName = utility.utility_name.toLowerCase()
        const isAllowed = allowedUtilities.some(allowed =>
          utilityName.includes(allowed) ||
          (allowed === 'hbts' && (utilityName.includes('h.b.') || utilityName.includes('hb')))
        )
        if (isAllowed) {
          debug.steps.push(`  - ${utility.utility_name} (${utility.pwsid}): ALLOWED`)
        }
        return isAllowed
      })
      debug.steps.push(`Relevant curated utilities: ${relevantUtilities.length}`)
      utilities.push(...relevantUtilities)
    }

    // Step 2: Municipal systems in the same city (THIS IS MISSING FROM TEST API!)
    debug.steps.push("=== STEP 2: CITY MUNICIPAL SYSTEMS ===")
    const { data: cityInfo, error: cityError } = await supabase
      .from('water_systems')
      .select('city_name, state_code')
      .eq('zip_code', zip)
      .limit(1)

    debug.steps.push(`City info found: ${cityInfo?.length || 0}`)
    if (cityInfo?.length) {
      debug.steps.push(`City: ${cityInfo[0].city_name}, State: ${cityInfo[0].state_code}`)
    }

    if (!cityError && cityInfo && cityInfo.length > 0) {
      const cityName = cityInfo[0].city_name
      const stateCode = cityInfo[0].state_code

      const { data: cityMunicipal, error: cityMunicipalError } = await supabase
        .from('water_systems')
        .select('*')
        .ilike('city_name', cityName)
        .eq('state_code', stateCode)
        .gte('population_served_count', '1000')
        .in('pws_type_code', ['CWS'])
        .in('owner_type_code', ['L', 'M'])
        .eq('pws_activity_code', 'A')
        .order('population_served_count', { ascending: false })
        .limit(5)

      debug.steps.push(`City municipal systems found: ${cityMunicipal?.length || 0}`)
      if (cityMunicipal?.length) {
        cityMunicipal.forEach(s => {
          debug.steps.push(`  - ${s.pws_name} (${s.pwsid})`)
        })
        utilities.push(...cityMunicipal)
      }
    }

    debug.steps.push(`=== BEFORE FINAL FILTERING: ${utilities.length} utilities ===`)
    utilities.forEach(u => {
      debug.steps.push(`  - ${u.utility_name || u.pws_name} (${u.pwsid})`)
    })

    // Final filtering
    debug.steps.push("=== FINAL FILTERING ===")
    const finalUtilities = utilities.filter((utility, index, self) => {
      // Remove duplicates by PWSID
      const isDuplicate = index !== self.findIndex(u => u.pwsid === utility.pwsid)
      if (isDuplicate) {
        const hasId = 'id' in utility
        const otherHasId = self.find(u => u.pwsid === utility.pwsid && 'id' in u)
        const shouldKeep = hasId && !otherHasId
        debug.steps.push(`  ${utility.utility_name || utility.pws_name}: DUPLICATE - ${shouldKeep ? 'KEPT' : 'REMOVED'}`)
        return shouldKeep
      }

      // Only active utilities
      const isActive = 'pws_activity_code' in utility ? utility.pws_activity_code === 'A' : true
      if (!isActive) {
        debug.steps.push(`  ${utility.utility_name || utility.pws_name}: INACTIVE - REMOVED`)
        return false
      }

      // Geographic filtering
      const utilityName = (utility.utility_name || utility.pws_name || '').toLowerCase()
      const isAllowed = utilityName.includes('milcrofton') ||
                       utilityName.includes('franklin') ||
                       utilityName.includes('h.b.') ||
                       utilityName.includes('hbts')

      debug.steps.push(`  ${utility.utility_name || utility.pws_name}: ${isAllowed ? 'PASSED' : 'FAILED'} geographic filter`)
      return isAllowed
    })

    debug.finalUtilities = finalUtilities
    debug.steps.push(`=== FINAL RESULT: ${finalUtilities.length} utilities ===`)
    finalUtilities.forEach(u => {
      debug.steps.push(`  - ${u.utility_name || u.pws_name} (${u.pwsid})`)
    })

    return NextResponse.json(debug, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}