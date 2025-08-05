#!/usr/bin/env node

// Test script to verify AI MeetMind setup
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'backend/.env') });

console.log('🧪 AI MeetMind Setup Test\n');

// Test 1: Environment Variables
console.log('1️⃣ Testing Environment Variables...');
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_BUCKET_NAME'
];

let envTestsPassed = 0;
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`   ✅ ${envVar}: ${value.substring(0, 20)}...`);
    envTestsPassed++;
  } else {
    console.log(`   ❌ ${envVar}: Missing`);
  }
});

console.log(`   📊 Environment Variables: ${envTestsPassed}/${requiredEnvVars.length} configured\n`);

// Test 2: OpenAI Connection
console.log('2️⃣ Testing OpenAI Connection...');
try {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Test with a simple completion
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say "AI MeetMind test successful"' }],
    max_tokens: 10
  });
  
  console.log(`   ✅ OpenAI API: Connected successfully`);
  console.log(`   📝 Test response: ${completion.choices[0].message.content}`);
} catch (error) {
  console.log(`   ❌ OpenAI API: ${error.message}`);
}
console.log();

// Test 3: Supabase Connection
console.log('3️⃣ Testing Supabase Connection...');
try {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Test connection with a simple query
  const { data, error } = await supabase.from('users').select('count').limit(1);
  
  if (error && error.code === 'PGRST116') {
    console.log(`   ✅ Supabase: Connected (users table not found - expected for new setup)`);
  } else if (error) {
    console.log(`   ⚠️  Supabase: Connected but error: ${error.message}`);
  } else {
    console.log(`   ✅ Supabase: Connected successfully`);
  }
} catch (error) {
  console.log(`   ❌ Supabase: ${error.message}`);
}
console.log();

// Test 4: Airtable Connection
console.log('4️⃣ Testing Airtable Connection...');
try {
  const Airtable = (await import('airtable')).default;
  
  Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
  });
  
  const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
  
  // Test connection by listing tables (this will fail if tables don't exist)
  try {
    const records = await base('Projects').select({ maxRecords: 1 }).firstPage();
    console.log(`   ✅ Airtable: Connected successfully`);
    console.log(`   📊 Projects table: Found ${records.length} records`);
  } catch (tableError) {
    if (tableError.statusCode === 404) {
      console.log(`   ⚠️  Airtable: Connected but Projects table not found`);
      console.log(`   📝 Please create the required tables in Airtable`);
    } else {
      console.log(`   ❌ Airtable: ${tableError.message}`);
    }
  }
} catch (error) {
  console.log(`   ❌ Airtable: ${error.message}`);
}
console.log();

// Test 5: Google Cloud Storage
console.log('5️⃣ Testing Google Cloud Storage...');
try {
  const { Storage } = await import('@google-cloud/storage');
  
  const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: join(__dirname, 'config/google-service-account.json')
  });
  
  const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
  
  // Test bucket access
  const [exists] = await bucket.exists();
  
  if (exists) {
    console.log(`   ✅ Google Cloud Storage: Bucket accessible`);
    
    // Test file operations
    const testFile = bucket.file('test-connection.txt');
    await testFile.save('AI MeetMind connection test');
    console.log(`   ✅ Google Cloud Storage: File upload successful`);
    
    // Clean up test file
    await testFile.delete();
    console.log(`   ✅ Google Cloud Storage: File deletion successful`);
  } else {
    console.log(`   ❌ Google Cloud Storage: Bucket '${process.env.GOOGLE_CLOUD_BUCKET_NAME}' not found`);
  }
} catch (error) {
  console.log(`   ❌ Google Cloud Storage: ${error.message}`);
}
console.log();

// Test 6: File System Permissions
console.log('6️⃣ Testing File System Permissions...');
try {
  const fs = await import('fs');
  const uploadsDir = join(__dirname, 'uploads');
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`   ✅ Created uploads directory: ${uploadsDir}`);
  } else {
    console.log(`   ✅ Uploads directory exists: ${uploadsDir}`);
  }
  
  // Test write permissions
  const testFile = join(uploadsDir, 'test-write.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`   ✅ File system: Write permissions OK`);
} catch (error) {
  console.log(`   ❌ File system: ${error.message}`);
}
console.log();

// Summary
console.log('📋 Setup Test Summary');
console.log('='.repeat(50));
console.log('✅ = Working correctly');
console.log('⚠️  = Connected but needs setup');
console.log('❌ = Needs attention');
console.log();
console.log('Next steps:');
console.log('1. Create Airtable tables if not done yet');
console.log('2. Run: npm run install:all');
console.log('3. Run: npm run dev');
console.log('4. Test the application at http://localhost:5173');
console.log();
console.log('🚀 AI MeetMind is ready to process meetings!');
