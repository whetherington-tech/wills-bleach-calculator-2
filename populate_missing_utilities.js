#!/usr/bin/env node

// Add missing utilities to water_utilities table based on chlorine_data
const missingUtilities = [
  {
    pwsid: 'TN0000234',
    utility_name: 'Sweetwater Utilities Board',
    utility_type: 'Community water system',
    city: 'Sweetwater',
    state: 'TN',
    county: 'Monroe',
    population_served: 6000,
    service_connections: 0,
    is_active: true
  },
  {
    pwsid: 'TN0000247',
    utility_name: 'Milcrofton Utility District',
    utility_type: 'Community water system',
    city: 'Nashville',
    state: 'TN',
    county: 'Davidson',
    population_served: 15000,
    service_connections: 0,
    is_active: true
  },
  {
    pwsid: 'TN0000246', // Note: Using TN0000246 for Franklin (correct PWSID)
    utility_name: 'Franklin Water Department',
    utility_type: 'Community water system',
    city: 'Franklin',
    state: 'TN',
    county: 'Williamson',
    population_served: 85000,
    service_connections: 0,
    is_active: true
  },
  {
    pwsid: 'TN0000789',
    utility_name: 'Brentwood Water Department',
    utility_type: 'Community water system',
    city: 'Brentwood',
    state: 'TN',
    county: 'Williamson',
    population_served: 45000,
    service_connections: 0,
    is_active: true
  },
  {
    pwsid: 'TN0000567',
    utility_name: 'Hendersonville U.D.',
    utility_type: 'Community water system',
    city: 'Hendersonville',
    state: 'TN',
    county: 'Sumner',
    population_served: 60000,
    service_connections: 0,
    is_active: true
  }
];

async function populateMissingUtilities() {
  console.log('➕ Adding missing utilities to water_utilities table...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const utility of missingUtilities) {
    try {
      console.log(`📝 Adding: ${utility.utility_name} (${utility.city}, ${utility.state})`);
      
      const response = await fetch('http://localhost:3000/api/manage-utilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(utility)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`  ✅ Successfully added: ${utility.utility_name}`);
        successCount++;
      } else {
        console.log(`  ❌ Failed to add: ${utility.utility_name} - ${result.error}`);
        errorCount++;
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`  💥 Error adding ${utility.utility_name}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Successfully added: ${successCount} utilities`);
  console.log(`❌ Failed to add: ${errorCount} utilities`);
  
  // Verify the additions
  console.log('\n🔍 Verifying additions...');
  try {
    const verifyResponse = await fetch('http://localhost:3000/api/diagnose');
    const verifyData = await verifyResponse.json();
    
    if (verifyData.tableData?.water_utilities?.sample) {
      console.log('\n📋 CURRENT WATER_UTILITIES:');
      verifyData.tableData.water_utilities.sample.forEach(utility => {
        console.log(`  • ${utility.utility_name} (${utility.city}, ${utility.state}) - ${utility.population_served.toLocaleString()} served`);
      });
    }
  } catch (error) {
    console.log(`❌ Error verifying: ${error.message}`);
  }
  
  console.log('\n✅ Population completed!');
}

populateMissingUtilities().catch(console.error);
