import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json(
        { success: false, message: 'Missing module ID' },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('user_module_interests').insert(
      {
        user_id: user.id,
        module_id: moduleId,
        is_interested: true,
      }
    );

    if (error) {
      console.error('Error inserting user interest:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to record interest' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interest recorded successfully',
    });
  } catch (error) {
    console.error('Error in user-interests route:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
