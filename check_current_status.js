#!/usr/bin/env node

// Check current status of utilities and chlorine data
async function checkStatus() {
  console.log('🔍 Checking current status of utilities and chlorine data...\n');
  
  // Check water_utilities
  console.log('📋 WATER_UTILITIES TABLE:');
  try {
    const utilitiesResponse = await fetch('http://localhost:3000/api/diagnose');
    const utilitiesData = await utilitiesResponse.json();
    
    if (utilitiesData.tableData?.water_utilities?.sample) {
      utilitiesData.tableData.water_utilities.sample.forEach(utility => {
        console.log(`  • ${utility.utility_name} (${utility.city}, ${utility.state})`);
        console.log(`    PWSID: ${utility.pwsid}`);
        console.log(`    Population: ${utility.population_served.toLocaleString()}`);
        console.log(`    Active: ${utility.is_active}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Error checking water_utilities:', error.message);
  }
  
  // Check chlorine_data
  console.log('🧪 CHLORINE_DATA TABLE:');
  try {
    const chlorineResponse = await fetch('http://localhost:3000/api/diagnose');
    const chlorineData = await chlorineResponse.json();
    
    if (chlorineData.tableData?.chlorine_data?.sample) {
      chlorineData.tableData.chlorine_data.sample.forEach(data => {
        console.log(`  • ${data.utility_name} (${data.pwsid})`);
        console.log(`    Average Chlorine: ${data.average_chlorine_ppm} ppm`);
        console.log(`    Range: ${data.min_chlorine_ppm} - ${data.max_chlorine_ppm} ppm`);
        console.log(`    Source: ${data.data_source}`);
        console.log(`    Last Updated: ${data.last_updated}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Error checking chlorine_data:', error.message);
  }
  
  // Test a few zip codes
  console.log('🏠 TESTING ZIP CODES:');
  const testZips = ['37204', '37064', '37027'];
  
  for (const zip of testZips) {
    try {
      const zipResponse = await fetch(`http://localhost:3000/api/utilities?zip=${zip}`);
      const zipData = await zipResponse.json();
      
      console.log(`  ZIP ${zip}:`);
      if (zipData.allUtilities && zipData.allUtilities.length > 0) {
        zipData.allUtilities.forEach(utility => {
          console.log(`    • ${utility.utility_name} (${utility.city})`);
        });
      } else {
        console.log(`    • No utilities found`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ZIP ${zip}: Error - ${error.message}`);
    }
  }
  
  console.log('✅ Status check completed!');
}

checkStatus().catch(console.error);
