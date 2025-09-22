import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { pwsid } = await request.json();

    if (!pwsid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameter: pwsid' 
      });
    }

    console.log(`🔧 Deleting chlorine data for PWSID: ${pwsid}`);

    // Delete the chlorine data record
    const { data: deleteResult, error: deleteError } = await supabase
      .from('chlorine_data')
      .delete()
      .eq('pwsid', pwsid)
      .select();

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete chlorine data',
        details: deleteError.message
      });
    }

    console.log(`🔧 Deleted ${deleteResult?.length || 0} chlorine data records for PWSID: ${pwsid}`);

    return NextResponse.json({
      success: true,
      message: `Chlorine data deleted for PWSID: ${pwsid}`,
      deletedCount: deleteResult?.length || 0,
      deletedRecords: deleteResult
    });

  } catch (error) {
    console.error('Delete chlorine data error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error during deletion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
