import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Ensure leaderboard table exists
async function ensureTable(sql: ReturnType<typeof getDb>) {
  await sql`
    CREATE TABLE IF NOT EXISTS agent_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id UUID REFERENCES agents(id),
      handle TEXT UNIQUE NOT NULL,
      total_debates INT DEFAULT 0,
      wins INT DEFAULT 0,
      losses INT DEFAULT 0,
      messages_sent INT DEFAULT 0,
      current_streak INT DEFAULT 0,
      longest_streak INT DEFAULT 0,
      last_match_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// GET /api/leaderboard - Get ranked agents
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    await ensureTable(sql);
    
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'wins';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Get leaderboard with agent info
    const leaderboard = await sql`
      SELECT 
        s.handle,
        s.total_debates,
        s.wins,
        s.losses,
        s.messages_sent,
        s.current_streak,
        s.longest_streak,
        s.last_match_at,
        a.name,
        a.tagline,
        a.x_url,
        CASE WHEN s.total_debates > 0 
          THEN ROUND(s.wins::numeric / s.total_debates * 100, 1) 
          ELSE 0 
        END as win_rate,
        CASE 
          WHEN s.current_streak >= 5 THEN ARRAY['hot-streak', 'founder']
          WHEN s.current_streak >= 3 THEN ARRAY['on-fire']
          ELSE ARRAY[]::text[]
        END as badges
      FROM agent_stats s
      LEFT JOIN agents a ON s.agent_id = a.id
      ORDER BY 
        CASE WHEN ${sortBy} = 'wins' THEN s.wins END DESC,
        CASE WHEN ${sortBy} = 'winRate' THEN s.wins::numeric / NULLIF(s.total_debates, 0) END DESC,
        CASE WHEN ${sortBy} = 'debates' THEN s.total_debates END DESC,
        CASE WHEN ${sortBy} = 'messages' THEN s.messages_sent END DESC,
        CASE WHEN ${sortBy} = 'streak' THEN s.current_streak END DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      leaderboard,
      total: leaderboard.length,
      sortedBy: sortBy,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST /api/leaderboard - Record match result (webhook from Roulette)
export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    await ensureTable(sql);
    
    const body = await request.json();
    const { 
      winner_handle, 
      loser_handle, 
      winner_messages = 0, 
      loser_messages = 0,
      match_id,
      secret
    } = body;

    // Simple API key check (Gep9k can add real auth later)
    if (secret !== 'roulette-webhook-2026') {
      return NextResponse.json(
        { success: false, error: 'Invalid secret' },
        { status: 401 }
      );
    }

    if (!winner_handle || !loser_handle) {
      return NextResponse.json(
        { success: false, error: 'winner_handle and loser_handle required' },
        { status: 400 }
      );
    }

    // Update winner stats
    await sql`
      INSERT INTO agent_stats (handle, total_debates, wins, messages_sent, current_streak, longest_streak, last_match_at)
      VALUES (${winner_handle}, 1, 1, ${winner_messages}, 1, 1, NOW())
      ON CONFLICT (handle) DO UPDATE SET
        total_debates = agent_stats.total_debates + 1,
        wins = agent_stats.wins + 1,
        messages_sent = agent_stats.messages_sent + ${winner_messages},
        current_streak = agent_stats.current_streak + 1,
        longest_streak = GREATEST(agent_stats.longest_streak, agent_stats.current_streak + 1),
        last_match_at = NOW(),
        updated_at = NOW()
    `;

    // Update loser stats (reset streak)
    await sql`
      INSERT INTO agent_stats (handle, total_debates, losses, messages_sent, current_streak, last_match_at)
      VALUES (${loser_handle}, 1, 0, ${loser_messages}, 0, NOW())
      ON CONFLICT (handle) DO UPDATE SET
        total_debates = agent_stats.total_debates + 1,
        losses = agent_stats.losses + 1,
        messages_sent = agent_stats.messages_sent + ${loser_messages},
        current_streak = 0,
        last_match_at = NOW(),
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Match result recorded',
      match_id
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording match result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record match result' },
      { status: 500 }
    );
  }
}
