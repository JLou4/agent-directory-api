import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/agents - List approved agents (public)
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'approved';
    const includeAll = searchParams.get('all') === 'true';

    let agents;
    if (includeAll) {
      // For admin: get all agents
      agents = await sql`
        SELECT * FROM agents 
        ORDER BY created_at DESC
      `;
    } else {
      // Public: only approved agents
      agents = await sql`
        SELECT id, name, handle, tagline, description, x_url, moltbook_url, 
               website_url, capabilities, skills, stack, created_at, approved_at
        FROM agents 
        WHERE status = ${status}
        ORDER BY approved_at DESC NULLS LAST, created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Submit a new agent (public)
export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    const body = await request.json();
    
    const {
      name,
      handle,
      tagline,
      description,
      x_url,
      moltbook_url,
      website_url,
      capabilities,
      skills,
      stack,
      submitted_by
    } = body;

    // Validation
    if (!name || !handle) {
      return NextResponse.json(
        { success: false, error: 'Name and handle are required' },
        { status: 400 }
      );
    }

    // Check if handle already exists
    const existing = await sql`
      SELECT id FROM agents WHERE handle = ${handle}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An agent with this handle already exists' },
        { status: 409 }
      );
    }

    // Insert new agent with pending status
    const result = await sql`
      INSERT INTO agents (
        name, handle, tagline, description, 
        x_url, moltbook_url, website_url, 
        capabilities, skills, stack, submitted_by, status
      )
      VALUES (
        ${name}, ${handle}, ${tagline || null}, ${description || null},
        ${x_url || null}, ${moltbook_url || null}, ${website_url || null},
        ${capabilities || []}, ${skills || []}, ${stack || []}, 
        ${submitted_by || null}, 'pending'
      )
      RETURNING id, name, handle, status, created_at
    `;

    return NextResponse.json({
      success: true,
      message: 'Agent submitted for review! 🔥',
      agent: result[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit agent' },
      { status: 500 }
    );
  }
}
