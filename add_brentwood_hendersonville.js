#!/usr/bin/env node

// Add Brentwood and Hendersonville utilities to water_utilities table
const missingUtilities = [
  {
    pwsid: 'TN0000567',
    utility_name: 'Hendersonville Utility District',
    city: 'Hendersonville',
    state: 'TN',
    population_served: 60000,
    utility_type: 'Community water system',
    is_active: true,
    county: 'Sumner'
  },
  {
    pwsid: 'TN0000789',
    utility_name: 'Brentwood Water Department',
    city: 'Brentwood',
    state: 'TN',
    population_served: 45000,
    utility_type: 'Community water system',
    is_active: true,
    county: 'Williamson'
  }
];

async function addBrentwoodHendersonville() {
  console.log('🏢 Adding Brentwood and Hendersonville utilities...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const utility of missingUtilities) {
    console.log(`📝 Adding: ${utility.utility_name} (${utility.city}, ${utility.state})`);
    console.log(`  PWSID: ${utility.pwsid}`);
    console.log(`  Population: ${utility.population_served.toLocaleString()}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/manage-utilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(utility)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`  ✅ Successfully added`);
        successCount++;
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        errorCount++;
      }
      
    } catch (error) {
      console.log(`  💥 Error: ${error.message}`);
      errorCount++;
    }
    
    console.log(''); // Empty line for readability
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('📊 SUMMARY:');
  console.log(`✅ Successfully added: ${successCount} utilities`);
  console.log(`❌ Failed to add: ${errorCount} utilities`);
  
  if (successCount > 0) {
    console.log('\n🎉 Utilities added successfully!');
  }
  
  return { successCount, errorCount };
}

addBrentwoodHendersonville().catch(console.error);
