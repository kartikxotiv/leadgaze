import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Supabase Config Check:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING');
  console.log('  Using URL:', supabaseUrl || 'NONE');
}

if (!supabaseUrl) {
  const errorMsg = 'Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your .env.local file.\n' +
    'Example: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co';
  console.error('❌', errorMsg);
  throw new Error(errorMsg);
}

if (!supabaseServiceKey) {
  const errorMsg = 'Missing Supabase Service Role Key. Set SUPABASE_SERVICE_ROLE_KEY in your .env.local file.\n' +
    'You can find this in your Supabase project settings under API > service_role key';
  console.error('❌', errorMsg);
  throw new Error(errorMsg);
}

// Validate URL is not localhost (common mistake)
if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
  console.error('⚠️  WARNING: Supabase URL appears to be localhost!');
  console.error('   Supabase URL should be: https://your-project-id.supabase.co');
  console.error('   Current value:', supabaseUrl);
}

// Create Supabase client with error handling
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // always stateless on server
    },
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Supabase client initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  throw new Error(`Supabase client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

export { supabase };

