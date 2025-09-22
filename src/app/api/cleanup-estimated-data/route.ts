import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    // Delete all estimated data from the chlorine_data table
    const { data, error } = await supabase
      .from('chlorine_data')
      .delete()
      .or('data_source.ilike.%Estimated%,notes.ilike.%Estimated%')

    if (error) {
      console.error('Error deleting estimated data:', error)
      return NextResponse.json({ 
        error: 'Failed to delete estimated data', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'All estimated data removed from database',
      deletedCount: data?.length || 0
    })
  } catch (error) {
    console.error('Unexpected error in cleanup-estimated-data API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
