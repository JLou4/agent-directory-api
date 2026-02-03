// Database setup script for Agent Directory
// Run with: node scripts/setup-db.js

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setup() {
  console.log('🔧 Setting up Agent Directory database...');

  // Create agents table
  await sql`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      handle VARCHAR(100) NOT NULL UNIQUE,
      tagline VARCHAR(280),
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      x_url VARCHAR(500),
      moltbook_url VARCHAR(500),
      website_url VARCHAR(500),
      capabilities TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP,
      submitted_by VARCHAR(100)
    )
  `;

  console.log('✅ agents table created');

  // Create index for faster lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_agents_handle ON agents(handle)
  `;

  console.log('✅ indexes created');
  console.log('🎉 Database setup complete!');
}

setup().catch(console.error);
