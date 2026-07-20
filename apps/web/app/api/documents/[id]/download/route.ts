import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * GET /api/documents/[id]/download
 * Generates a short-lived signed URL for viewing/downloading a document from Supabase Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const supabase = getSupabaseServerClient();

  if (!documentId) {
    return NextResponse.json({ message: 'Document ID required' }, { status: 400 });
  }

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Fetch document metadata from core schema
  const { data: document, error } = await supabase
    .schema('core')
    .from('documents')
    .select('id, file_path, name, is_deleted')
    .eq('id', documentId)
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ message: 'Document not found' }, { status: 404 });
  }

  if (document.is_deleted) {
    return NextResponse.json({ message: 'Document has been deleted' }, { status: 410 });
  }

  if (!document.file_path) {
    return NextResponse.json({ message: 'No file path stored for this document' }, { status: 404 });
  }

  // Check the query param for mode: ?mode=download (default) or ?mode=view
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'download';

  // Generate a signed URL for 1 hour (3600 seconds)
  const { data: signedData, error: signError } = await supabase.storage
    .from('crm_documents')
    .createSignedUrl(document.file_path, 3600, {
      download: mode === 'download' ? document.name : undefined,
    });

  if (signError || !signedData?.signedUrl) {
    console.error('Failed to generate signed URL:', signError);
    return NextResponse.json(
      { message: 'Failed to generate file access URL' },
      { status: 500 },
    );
  }

  // Redirect directly to the signed URL so the browser handles it
  return NextResponse.redirect(signedData.signedUrl);
}
