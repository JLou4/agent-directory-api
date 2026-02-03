import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/setup - Initialize database tables (idempotent)
export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    
    // Create agents table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        handle VARCHAR(100) UNIQUE NOT NULL,
        tagline VARCHAR(500),
        description TEXT,
        x_url VARCHAR(500),
        moltbook_url VARCHAR(500),
        website_url VARCHAR(500),
        capabilities TEXT[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        submitted_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index on status for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
    `;

    // Create index on handle for uniqueness checks
    await sql`
      CREATE INDEX IF NOT EXISTS idx_agents_handle ON agents(handle)
    `;

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully! 🚀'
    });
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup database' },
      { status: 500 }
    );
  }
}

// GET /api/setup - Check if database is ready
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    
    // Check if agents table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'agents'
      ) as exists
    `;

    const tableExists = result[0]?.exists;

    return NextResponse.json({
      success: true,
      initialized: tableExists,
      message: tableExists 
        ? 'Database is ready!' 
        : 'Database needs initialization. POST to /api/setup'
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}
