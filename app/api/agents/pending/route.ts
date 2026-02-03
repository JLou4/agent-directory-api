import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);
const ADMIN_KEY = process.env.ADMIN_API_KEY;

// Helper to check admin auth
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !ADMIN_KEY) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_KEY;
}

// GET /api/agents/pending - List pending agents (admin only)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const agents = await sql`
      SELECT * FROM agents 
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error fetching pending agents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending agents' },
      { status: 500 }
    );
  }
}
