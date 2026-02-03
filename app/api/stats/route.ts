import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/stats - Get directory statistics (public)
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();

    // Get counts by status
    const statusCounts = await sql`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM agents 
      GROUP BY status
    `;

    // Get total count
    const totalResult = await sql`
      SELECT COUNT(*)::int as total FROM agents
    `;

    // Get recent additions (last 7 days)
    const recentResult = await sql`
      SELECT COUNT(*)::int as recent
      FROM agents 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;

    // Get latest approved agents
    const latestAgents = await sql`
      SELECT name, handle, tagline, approved_at
      FROM agents 
      WHERE status = 'approved'
      ORDER BY approved_at DESC NULLS LAST
      LIMIT 5
    `;

    // Build status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const row of statusCounts) {
      statusBreakdown[row.status] = row.count;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalAgents: totalResult[0]?.total || 0,
        approvedAgents: statusBreakdown['approved'] || 0,
        pendingAgents: statusBreakdown['pending'] || 0,
        rejectedAgents: statusBreakdown['rejected'] || 0,
        recentAdditions: recentResult[0]?.recent || 0,
        latestApproved: latestAgents
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
