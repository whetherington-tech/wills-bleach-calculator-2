#!/usr/bin/env node

// Fix utilities for the target area - government owned, 3000+ served
const targetUtilities = [
  {
    pwsid: 'TN0000128',
    utility_name: 'Metro Water Services',
    utility_type: 'Community water system',
    city: 'Nashville',
    state: 'TN',
    county: 'Davidson',
    population_served: 700000,
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
    pwsid: 'TN0000246',
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
  },
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
  }
];

async function fixUtilities() {
  console.log('🔧 Fixing utilities for target area...');
  
  // Step 1: Delete Memphis (not in our area)
  console.log('🗑️ Deleting Memphis Light Gas Water...');
  try {
    const deleteResponse = await fetch('http://localhost:3000/api/manage-utilities', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pwsid: 'TN0001234' })
    });
    
    const deleteResult = await deleteResponse.json();
    if (deleteResult.success) {
      console.log('✅ Deleted Memphis utility');
    } else {
      console.log('❌ Failed to delete Memphis:', deleteResult.error);
    }
  } catch (error) {
    console.log('💥 Error deleting Memphis:', error.message);
  }
  
  // Step 2: Add/Update all target utilities
  console.log('➕ Adding/Updating target utilities...');
  for (const utility of targetUtilities) {
    try {
      console.log(`📝 Processing: ${utility.utility_name} (${utility.city}, ${utility.state})`);
      
      const response = await fetch('http://localhost:3000/api/manage-utilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(utility)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully added/updated: ${utility.utility_name}`);
      } else {
        console.log(`❌ Failed to add/update: ${utility.utility_name} - ${result.error}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`💥 Error processing ${utility.utility_name}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Utilities fix completed!');
  console.log('\n📊 Current utilities in target area:');
  targetUtilities.forEach(u => {
    console.log(`  • ${u.utility_name} (${u.city}) - ${u.population_served.toLocaleString()} served`);
  });
}

fixUtilities().catch(console.error);
