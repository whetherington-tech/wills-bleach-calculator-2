import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const utilityData = await request.json()

    if (!utilityData.pwsid || !utilityData.utility_name) {
      return NextResponse.json({ 
        success: false,
        error: 'PWSID and utility_name are required' 
      }, { status: 400 })
    }

    // Add/Update utility in water_utilities table
    const { data, error } = await supabase
      .from('water_utilities')
      .upsert({
        pwsid: utilityData.pwsid,
        utility_name: utilityData.utility_name,
        utility_type: utilityData.utility_type || 'Community water system',
        city: utilityData.city,
        state: utilityData.state,
        county: utilityData.county,
        population_served: utilityData.population_served || 0,
        service_connections: utilityData.service_connections || 0,
        is_active: utilityData.is_active !== undefined ? utilityData.is_active : true
      }, { onConflict: 'pwsid' })
      .select()
      .single()

    if (error) {
      console.error('Error managing utility:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to manage utility', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Utility managed successfully',
      data: data
    })
  } catch (error) {
    console.error('Unexpected error in manage-utilities API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { pwsid } = await request.json()

    if (!pwsid) {
      return NextResponse.json({ 
        success: false,
        error: 'PWSID is required' 
      }, { status: 400 })
    }

    // Delete utility from water_utilities table
    const { data, error } = await supabase
      .from('water_utilities')
      .delete()
      .eq('pwsid', pwsid)
      .select()

    if (error) {
      console.error('Error deleting utility:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete utility', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Utility ${pwsid} deleted successfully`,
      deletedCount: data?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error in manage-utilities DELETE API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
