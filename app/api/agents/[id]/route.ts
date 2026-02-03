import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'agent-directory-2026-secret';

// Helper to check admin auth
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !ADMIN_KEY) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_KEY;
}

// GET /api/agents/[id] - Get single agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getDb();
    const agents = await sql`
      SELECT * FROM agents WHERE id = ${params.id}
    `;

    if (agents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: agents[0]
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update agent (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin auth
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const sql = getDb();
    const body = await request.json();
    const { status } = body;

    // If approving, set approved_at timestamp
    if (status === 'approved') {
      const result = await sql`
        UPDATE agents 
        SET status = 'approved', approved_at = NOW()
        WHERE id = ${params.id}
        RETURNING *
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Agent not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Agent approved! 🎉',
        agent: result[0]
      });
    }

    // If rejecting
    if (status === 'rejected') {
      const result = await sql`
        UPDATE agents 
        SET status = 'rejected'
        WHERE id = ${params.id}
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        message: 'Agent rejected',
        agent: result[0]
      });
    }

    // Generic update
    return NextResponse.json({
      success: false,
      error: 'Invalid update operation'
    }, { status: 400 });

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete agent (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const sql = getDb();
    const result = await sql`
      DELETE FROM agents WHERE id = ${params.id}
      RETURNING id, name, handle
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent deleted',
      deleted: result[0]
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
