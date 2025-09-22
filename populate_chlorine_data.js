#!/usr/bin/env node

// Populate chlorine data for utilities found in target zip codes
const targetZipCodes = [
  '37204', '37205', '37211', '37212', '37215', '37220', '37221', // Nashville area
  '37064', '37067', '37069', '37027', '37135', '37014', '37179'  // Surrounding areas
];

async function populateChlorineData() {
  console.log('🧪 Starting comprehensive chlorine data population...\n');
  
  const foundUtilities = new Map(); // Use Map to avoid duplicates
  const results = {
    zipCodes: {},
    utilities: {},
    chlorineData: {},
    errors: []
  };
  
  // Step 1: Find all utilities for each zip code
  console.log('📍 Step 1: Finding utilities for each zip code...');
  for (const zip of targetZipCodes) {
    console.log(`\n🔍 Analyzing ZIP ${zip}...`);
    
    try {
      // Use the test-utilities API to get the actual utilities found
      const response = await fetch(`http://localhost:3000/api/test-utilities?zip=${zip}`);
      const data = await response.json();
      
      results.zipCodes[zip] = {
        utilities: data.utilities || [],
        count: data.utilities ? data.utilities.length : 0
      };
      
      // Add utilities to our collection, filtering for municipal utilities
      if (data.utilities && data.utilities.length > 0) {
        data.utilities.forEach(utility => {
          // Only include municipal utilities (owner_type_code 'L' or 'M') and active ones
          if (['L', 'M'].includes(utility.owner_type_code) && 
              utility.pws_activity_code === 'A' && 
              parseInt(utility.population_served_count) >= 1000) {
            
            if (!foundUtilities.has(utility.pwsid)) {
              foundUtilities.set(utility.pwsid, {
                ...utility,
                foundInZips: [zip],
                isMunicipal: true
              });
            } else {
              foundUtilities.get(utility.pwsid).foundInZips.push(zip);
            }
          }
        });
      }
      
      console.log(`  Found ${data.utilities ? data.utilities.length : 0} total utilities`);
      const municipalCount = data.utilities ? data.utilities.filter(u => 
        ['L', 'M'].includes(u.owner_type_code) && u.pws_activity_code === 'A' && parseInt(u.population_served_count) >= 1000
      ).length : 0;
      console.log(`  Municipal utilities (1000+ served): ${municipalCount}`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.errors.push({ zip, error: error.message });
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Step 1 Complete: Found ${foundUtilities.size} unique municipal utilities`);
  
  // Step 2: Check which utilities already have chlorine data
  console.log('\n🧪 Step 2: Checking existing chlorine data...');
  const utilitiesNeedingData = [];
  
  for (const [pwsid, utility] of foundUtilities) {
    try {
      const checkResponse = await fetch(`http://localhost:3000/api/check-chlorine-data?pwsid=${pwsid}`);
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.data) {
        console.log(`  ✅ ${utility.pws_name}: ${checkData.data.average_chlorine_ppm} ppm (${checkData.data.data_source})`);
        results.chlorineData[pwsid] = {
          status: 'exists',
          data: checkData.data
        };
      } else {
        console.log(`  ❌ ${utility.pws_name}: No chlorine data`);
        utilitiesNeedingData.push(utility);
        results.chlorineData[pwsid] = {
          status: 'missing',
          utility: utility
        };
      }
    } catch (error) {
      console.log(`  💥 Error checking ${utility.pws_name}: ${error.message}`);
      results.errors.push({ pwsid, utility: utility.pws_name, error: error.message });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📈 Step 2 Complete: ${utilitiesNeedingData.length} utilities need chlorine data`);
  
  // Step 3: Research and store chlorine data for utilities that need it
  if (utilitiesNeedingData.length > 0) {
    console.log('\n🔬 Step 3: Researching chlorine data for utilities that need it...');
    
    for (const utility of utilitiesNeedingData) {
      console.log(`\n🔍 Researching: ${utility.pws_name} (${utility.city_name}, ${utility.state_code})`);
      console.log(`  PWSID: ${utility.pwsid}`);
      console.log(`  Population: ${utility.population_served_count.toLocaleString()}`);
      console.log(`  Found in ZIPs: ${utility.foundInZips.join(', ')}`);
      
      try {
        const researchResponse = await fetch(
          `http://localhost:3000/api/research-and-store?action=research_single&pwsid=${utility.pwsid}&utility=${encodeURIComponent(utility.pws_name)}&city=${encodeURIComponent(utility.city_name)}&state=${encodeURIComponent(utility.state_code)}`,
          { method: 'POST' }
        );
        
        const researchData = await researchResponse.json();
        
        if (researchData.success) {
          console.log(`  ✅ Success: ${researchData.message}`);
          if (researchData.data && researchData.data.averageChlorine) {
            console.log(`  📊 Chlorine Level: ${researchData.data.averageChlorine} ppm`);
          }
          results.chlorineData[utility.pwsid] = {
            status: 'researched',
            data: researchData.data,
            message: researchData.message
          };
        } else {
          console.log(`  ❌ Failed: ${researchData.message}`);
          if (researchData.errorType) {
            console.log(`  🔍 Error Type: ${researchData.errorType}`);
          }
          results.chlorineData[utility.pwsid] = {
            status: 'failed',
            error: researchData.message,
            errorType: researchData.errorType
          };
        }
        
      } catch (error) {
        console.log(`  💥 Error researching ${utility.pws_name}: ${error.message}`);
        results.errors.push({ pwsid: utility.pwsid, utility: utility.pws_name, error: error.message });
      }
      
      // Longer delay between research requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Step 4: Final summary
  console.log('\n📊 FINAL SUMMARY:');
  console.log('========================================');
  
  let totalUtilities = foundUtilities.size;
  let existingData = 0;
  let researchedData = 0;
  let failedResearch = 0;
  
  Object.values(results.chlorineData).forEach(status => {
    if (status.status === 'exists') existingData++;
    else if (status.status === 'researched') researchedData++;
    else if (status.status === 'failed') failedResearch++;
  });
  
  console.log(`Total Municipal Utilities Found: ${totalUtilities}`);
  console.log(`✅ Already Had Chlorine Data: ${existingData}`);
  console.log(`🔬 Successfully Researched: ${researchedData}`);
  console.log(`❌ Research Failed: ${failedResearch}`);
  console.log(`📊 Total Coverage: ${((existingData + researchedData) / totalUtilities * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${results.errors.length}`);
    results.errors.forEach(error => {
      console.log(`  • ${error.utility || error.zip}: ${error.error}`);
    });
  }
  
  console.log('\n✅ Chlorine data population completed!');
  
  return results;
}

populateChlorineData().catch(console.error);
