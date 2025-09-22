import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zipCode = searchParams.get('zip') || '37203'

    const results: any = {
      zipCode,
      timestamp: new Date().toISOString(),
      utilities: [],
      errors: []
    }

    // Test the filtering logic
    try {
      // First, try to find in zip_code_mapping table
      const { data: zipMappings, error: zipError } = await supabase
        .from('zip_code_mapping')
        .select('*')
        .eq('zip_code', zipCode)

      if (zipError) throw zipError

      let utilities: any[] = []

      if (zipMappings && zipMappings.length > 0) {
        const pwsids = zipMappings.map(mapping => mapping.pwsid)
        
        // Get custom utilities
        const { data: customUtilities, error: customError } = await supabase
          .from('water_utilities')
          .select('*')
          .in('pwsid', pwsids)

        if (customError) throw customError
        if (customUtilities) utilities.push(...customUtilities)

        // Get municipal systems only
        const { data: systemUtilities, error: systemError } = await supabase
          .from('water_systems')
          .select('*')
          .in('pwsid', pwsids)
          .gte('population_served_count', '1000')
          .in('pws_type_code', ['CWS'])
          .limit(5)

        if (systemError) throw systemError
        if (systemUtilities) utilities.push(...systemUtilities)
      } else {
        // Direct search with filtering
        const { data: directSystems, error: directError } = await supabase
          .from('water_systems')
          .select('*')
          .eq('zip_code', zipCode)
          .gte('population_served_count', '1000')
          .in('pws_type_code', ['CWS'])
          .eq('pws_activity_code', 'A') // Only active utilities
          .limit(5)

        if (directError) throw directError
        if (directSystems) {
          // Apply geographic filtering to direct systems
          const zipCodeUtilityMap: Record<string, string[]> = {
            '37203': ['metro water services'],
            '37215': ['metro water services'],
            '37067': ['milcrofton', 'franklin', 'h.b.', 'hbts'],
            '37064': ['franklin', 'h.b.', 'hbts', 'milcrofton'],
            '37027': ['brentwood', 'harpeth valley', 'mallory valley'],
          }

          const allowedUtilities = zipCodeUtilityMap[zipCode]
          if (allowedUtilities) {
            const filteredSystems = directSystems.filter(system => {
              const systemName = system.pws_name.toLowerCase()
              // Filter out utilities that clearly don't serve this area
              if (systemName.includes('columbia power') && !allowedUtilities.includes('columbia')) {
                return false
              }
              return true
            })
            utilities.push(...filteredSystems)
          } else {
            utilities.push(...directSystems)
          }
        }

        // Geographic-specific utility lookup based on zip code location
        const zipCodeUtilityMap: Record<string, string[]> = {
          // Nashville (Davidson County) - Metro Water Services only
          '37203': ['metro water services'],
          '37215': ['metro water services'],
          '37204': ['metro water services'],
          '37205': ['metro water services'],
          '37206': ['metro water services'],
          '37207': ['metro water services'],
          '37208': ['metro water services'],
          '37209': ['metro water services'],
          '37210': ['metro water services'],
          '37211': ['metro water services'],
          '37212': ['metro water services'],
          '37213': ['metro water services'],
          '37214': ['metro water services'],
          '37216': ['metro water services'],
          '37217': ['metro water services'],
          '37218': ['metro water services'],
          '37219': ['metro water services'],
          '37220': ['metro water services'],
          '37221': ['metro water services'],
          '37228': ['metro water services'],
          '37240': ['metro water services'],

          // Franklin area (Williamson County)
          '37067': ['milcrofton', 'franklin', 'h.b.', 'hbts'],
          '37064': ['franklin', 'h.b.', 'hbts', 'milcrofton'],
          '37069': ['franklin', 'h.b.', 'hbts'], // Franklin

          // Brentwood (Williamson County)
          '37027': ['brentwood', 'harpeth valley', 'mallory valley'],

          // Thompson's Station (Williamson County)
          '37179': ['h.b.', 'hbts'], // H.B.&T.S. serves Thompson's Station

          // Rutherford County
          '37014': ['consolidated utility district', 'rutherford'], // Antioch/CUDRC

          // Other Williamson County areas
          '37135': ['nolensville', 'college grove'], // Nolensville-College Grove U.D.
          '37046': ['nolensville', 'college grove'], // College Grove/Nolensville area
        }

        const allowedUtilities = zipCodeUtilityMap[zipCode]

        if (allowedUtilities) {
          // Get utilities from curated table based on geographic mapping
          const { data: curatedUtilities, error: curatedError } = await supabase
            .from('water_utilities')
            .select('*')
            .eq('is_active', true)

          if (!curatedError && curatedUtilities) {
            const relevantUtilities = curatedUtilities.filter(utility => {
              const utilityName = utility.utility_name.toLowerCase()
              return allowedUtilities.some(allowed =>
                utilityName.includes(allowed) ||
                (allowed === 'hbts' && (utilityName.includes('h.b.') || utilityName.includes('hb')))
              )
            })
            utilities.push(...relevantUtilities)
          }
        }
      }

      // Final filtering and deduplication
      const finalFiltered = utilities.filter((utility, index, self) => {
        // Remove duplicates by PWSID
        const isDuplicate = index !== self.findIndex(u => u.pwsid === utility.pwsid)
        if (isDuplicate) {
          // If duplicate, prefer the one from water_utilities table (has 'id' field)
          const hasId = 'id' in utility
          const otherHasId = self.find(u => u.pwsid === utility.pwsid && 'id' in u)
          return hasId && !otherHasId
        }

        // Apply final geographic filtering
        const utilityName = utility.utility_name?.toLowerCase() || utility.pws_name?.toLowerCase() || ''

        // For Nashville zip codes, only allow Metro Water Services
        if (['37203', '37215'].includes(zipCode)) {
          return utilityName.includes('metro water services') && !utilityName.includes('columbia')
        }

        // For Franklin area zip codes, only allow Franklin area utilities
        if (['37067', '37064', '37069'].includes(zipCode)) {
          return utilityName.includes('milcrofton') ||
                 utilityName.includes('franklin') ||
                 utilityName.includes('h.b.') ||
                 utilityName.includes('hbts')
        }

        // For Thompson's Station, only allow H.B.&T.S.
        if (zipCode === '37179') {
          return utilityName.includes('h.b.') || utilityName.includes('hbts')
        }

        // For Nolensville/College Grove areas
        if (['37135', '37046'].includes(zipCode)) {
          return utilityName.includes('nolensville') || utilityName.includes('college grove')
        }

        // For Rutherford County (Antioch area)
        if (zipCode === '37014') {
          return utilityName.includes('consolidated') || utilityName.includes('rutherford')
        }

        // For Brentwood, only allow Brentwood area utilities
        if (zipCode === '37027') {
          return utilityName.includes('brentwood') ||
                 utilityName.includes('harpeth valley') ||
                 utilityName.includes('mallory valley')
        }

        return true
      })

      results.utilities = finalFiltered

    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
