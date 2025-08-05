import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for frontend/public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations (only available on server)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Database schema for users table
export const createUsersTable = async () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  const { error } = await supabaseAdmin.rpc('create_users_table', {
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT CHECK (role IN ('super_admin', 'project_admin', 'team_member', 'viewer')) DEFAULT 'team_member',
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      -- Enable Row Level Security
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY "Users can view their own profile" ON users
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update their own profile" ON users
        FOR UPDATE USING (auth.uid() = id);

      CREATE POLICY "Super admins can view all users" ON users
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
          )
        );
    `
  });

  if (error) {
    console.error('Error creating users table:', error);
    throw error;
  }
};

export default supabase;
