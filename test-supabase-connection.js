// Test Supabase Connection
// Run this in browser console to test connection

import { supabase } from './src/db/supabase.ts';

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test 1: Check if we can connect
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Auth error:', error);
    } else {
      console.log('✅ Auth connection successful');
    }
    
    // Test 2: Try to query a table (will show what tables exist)
    const { data: tables, error: tableError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.log('⚠️ Table query result:', tableError.message);
      if (tableError.message.includes('does not exist')) {
        console.log('💡 Tables need to be created - run the database setup SQL');
      }
    } else {
      console.log('✅ Database query successful:', tables);
    }
    
    console.log('🎯 Connection test complete!');
    
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

// Run the test
testConnection();