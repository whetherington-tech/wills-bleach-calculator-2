import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { pwsid, utilityName, city, state, averageChlorine, minChlorine, maxChlorine, sampleCount, sourceUrl, notes } = await request.json();

    // Validate required fields
    if (!pwsid || !utilityName || !averageChlorine) {
      return NextResponse.json({ 
        success: false, 
        error: 'PWSID, utility name, and average chlorine level are required' 
      }, { status: 400 });
    }

    // Validate chlorine values are numbers
    if (isNaN(parseFloat(averageChlorine))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Average chlorine level must be a valid number' 
      }, { status: 400 });
    }

    if (minChlorine && isNaN(parseFloat(minChlorine))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Minimum chlorine level must be a valid number' 
      }, { status: 400 });
    }

    if (maxChlorine && isNaN(parseFloat(maxChlorine))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum chlorine level must be a valid number' 
      }, { status: 400 });
    }

    // Check if data already exists for this PWSID
    const { data: existingData, error: checkError } = await supabase
      .from('chlorine_data')
      .select('*')
      .eq('pwsid', pwsid)
      .single();

    if (existingData && !checkError) {
      // Update existing record
      const { data: updateResult, error: updateError } = await supabase
        .from('chlorine_data')
        .update({
          utility_name: utilityName,
          average_chlorine_ppm: parseFloat(averageChlorine),
          min_chlorine_ppm: minChlorine ? parseFloat(minChlorine) : null,
          max_chlorine_ppm: maxChlorine ? parseFloat(maxChlorine) : null,
          sample_count: sampleCount ? parseInt(sampleCount) : null,
          source_url: sourceUrl || null,
          data_source: 'Manual User Entry',
          notes: notes || 'Manually entered by user due to protected/restricted government PDF',
          last_updated: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('pwsid', pwsid)
        .select()
        .single();

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to update chlorine data in database',
          details: updateError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Chlorine data updated successfully',
        data: updateResult,
        action: 'updated'
      });
    } else {
      // Insert new record
      const { data: insertResult, error: insertError } = await supabase
        .from('chlorine_data')
        .insert({
          pwsid: pwsid,
          utility_name: utilityName,
          average_chlorine_ppm: parseFloat(averageChlorine),
          min_chlorine_ppm: minChlorine ? parseFloat(minChlorine) : null,
          max_chlorine_ppm: maxChlorine ? parseFloat(maxChlorine) : null,
          sample_count: sampleCount ? parseInt(sampleCount) : null,
          source_url: sourceUrl || null,
          data_source: 'Manual User Entry',
          notes: notes || 'Manually entered by user due to protected/restricted government PDF',
          last_updated: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to store chlorine data in database',
          details: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Chlorine data stored successfully',
        data: insertResult,
        action: 'inserted'
      });
    }

  } catch (error: any) {
    console.error('Internal server error during manual chlorine entry:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during manual chlorine entry',
      details: error.message
    }, { status: 500 });
  }
}
