#!/usr/bin/env node

// Clean up and correct utilities for the target area
const correctUtilities = [
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
  }
];

async function cleanupUtilities() {
  console.log('🧹 Cleaning up utilities database...');
  
  // Step 1: Delete Memphis (not in our area)
  console.log('🗑️ Deleting Memphis Light Gas Water...');
  try {
    const deleteResponse = await fetch('http://localhost:3000/api/delete-chlorine-data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pwsid: 'TN0001234' })
    });
    
    const deleteResult = await deleteResponse.json();
    if (deleteResult.success) {
      console.log('✅ Deleted Memphis chlorine data');
    } else {
      console.log('❌ Failed to delete Memphis:', deleteResult.error);
    }
  } catch (error) {
    console.log('💥 Error deleting Memphis:', error.message);
  }
  
  // Step 2: Update Nashville to Metro Water Services
  console.log('🔄 Updating Nashville to Metro Water Services...');
  try {
    const updateResponse = await fetch('http://localhost:3000/api/utilities', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pwsid: 'TN0000128',
        utility_name: 'Metro Water Services',
        utility_type: 'Community water system',
        city: 'Nashville',
        state: 'TN',
        county: 'Davidson',
        population_served: 700000,
        service_connections: 0,
        is_active: true
      })
    });
    
    const updateResult = await updateResponse.json();
    if (updateResult.success) {
      console.log('✅ Updated Nashville to Metro Water Services');
    } else {
      console.log('❌ Failed to update Nashville:', updateResult.error);
    }
  } catch (error) {
    console.log('💥 Error updating Nashville:', error.message);
  }
  
  // Step 3: Add missing utilities
  console.log('➕ Adding missing utilities...');
  for (const utility of correctUtilities) {
    try {
      console.log(`📝 Adding: ${utility.utility_name} (${utility.city}, ${utility.state})`);
      
      const response = await fetch('http://localhost:3000/api/utilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(utility)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully added: ${utility.utility_name}`);
      } else {
        console.log(`❌ Failed to add: ${utility.utility_name} - ${result.error}`);
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`💥 Error adding ${utility.utility_name}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Cleanup completed!');
}

cleanupUtilities().catch(console.error);
