#!/usr/bin/env node

// Analyze zip codes and find water providers for the target area
const targetZipCodes = [
  '37204', '37205', '37211', '37212', '37215', '37220', '37221', // Nashville area
  '37064', '37067', '37069', '37027', '37135', '37014', '37179'  // Surrounding areas
];

async function analyzeZipCodes() {
  console.log('🔍 Analyzing zip codes to find water providers...\n');
  
  const foundUtilities = new Map(); // Use Map to avoid duplicates
  const zipCodeResults = {};
  
  for (const zip of targetZipCodes) {
    console.log(`📍 Analyzing ZIP ${zip}...`);
    
    try {
      // Test the utilities API for this zip code
      const response = await fetch(`http://localhost:3000/api/utilities?zip=${zip}`);
      const data = await response.json();
      
      zipCodeResults[zip] = {
        utilities: data.allUtilities || [],
        utilitiesByZip: data.utilitiesByZip || [],
        error: data.zipError || null
      };
      
      // Add utilities to our collection
      if (data.allUtilities && data.allUtilities.length > 0) {
        data.allUtilities.forEach(utility => {
          if (!foundUtilities.has(utility.pwsid)) {
            foundUtilities.set(utility.pwsid, {
              ...utility,
              foundInZips: [zip]
            });
          } else {
            foundUtilities.get(utility.pwsid).foundInZips.push(zip);
          }
        });
      }
      
      console.log(`  Found ${data.allUtilities ? data.allUtilities.length : 0} utilities`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      zipCodeResults[zip] = { error: error.message };
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 ANALYSIS RESULTS:');
  console.log('========================================');
  
  // Show utilities found
  console.log(`\n🏢 UTILITIES FOUND (${foundUtilities.size} total):`);
  foundUtilities.forEach((utility, pwsid) => {
    console.log(`\n  • ${utility.utility_name} (${utility.city}, ${utility.state})`);
    console.log(`    PWSID: ${pwsid}`);
    console.log(`    Population: ${utility.population_served.toLocaleString()}`);
    console.log(`    Found in ZIPs: ${utility.foundInZips.join(', ')}`);
    console.log(`    Active: ${utility.is_active}`);
  });
  
  // Show zip code breakdown
  console.log(`\n📍 ZIP CODE BREAKDOWN:`);
  Object.entries(zipCodeResults).forEach(([zip, result]) => {
    if (result.error) {
      console.log(`  ${zip}: ❌ ${result.error}`);
    } else {
      const count = result.utilities ? result.utilities.length : 0;
      console.log(`  ${zip}: ${count} utilities found`);
    }
  });
  
  // Check which utilities we have chlorine data for
  console.log(`\n🧪 CHLORINE DATA STATUS:`);
  try {
    const chlorineResponse = await fetch('http://localhost:3000/api/diagnose');
    const chlorineData = await chlorineResponse.json();
    
    if (chlorineData.tableData?.chlorine_data?.sample) {
      chlorineData.tableData.chlorine_data.sample.forEach(data => {
        const hasUtility = foundUtilities.has(data.pwsid);
        console.log(`  ${hasUtility ? '✅' : '❌'} ${data.utility_name} (${data.pwsid}): ${data.average_chlorine_ppm} ppm`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Error checking chlorine data: ${error.message}`);
  }
  
  console.log('\n✅ Analysis completed!');
  
  return {
    foundUtilities: Array.from(foundUtilities.values()),
    zipCodeResults,
    summary: {
      totalUtilities: foundUtilities.size,
      totalZipCodes: targetZipCodes.length,
      utilitiesWithChlorineData: 0 // Will be calculated
    }
  };
}

analyzeZipCodes().catch(console.error);
