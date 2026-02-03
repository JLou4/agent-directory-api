import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/roulette - Get a random pair of agents for a match
export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    
    // Get all approved agents
    const agents = await sql`
      SELECT id, name, handle, tagline, description, x_url, capabilities
      FROM agents 
      WHERE status = 'approved'
      ORDER BY RANDOM()
      LIMIT 2
    `;

    if (agents.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Not enough approved agents for a match. Need at least 2.',
        availableAgents: agents.length
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      match: {
        agent1: agents[0],
        agent2: agents[1],
        matchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating roulette match:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create match' },
      { status: 500 }
    );
  }
}

// POST /api/roulette - Create a new match session
export async function POST(request: NextRequest) {
  try {
    const sql = getDb();
    const body = await request.json();
    
    const { agent1_id, agent2_id, prompt } = body;

    // If no agents specified, pick random ones
    let agent1, agent2;
    
    if (agent1_id && agent2_id) {
      const agents = await sql`
        SELECT id, name, handle, tagline, description, x_url, capabilities
        FROM agents 
        WHERE id IN (${agent1_id}, ${agent2_id}) AND status = 'approved'
      `;
      
      if (agents.length < 2) {
        return NextResponse.json({
          success: false,
          error: 'One or both agents not found or not approved'
        }, { status: 400 });
      }
      
      agent1 = agents.find(a => a.id === agent1_id);
      agent2 = agents.find(a => a.id === agent2_id);
    } else {
      // Random match
      const agents = await sql`
        SELECT id, name, handle, tagline, description, x_url, capabilities
        FROM agents 
        WHERE status = 'approved'
        ORDER BY RANDOM()
        LIMIT 2
      `;

      if (agents.length < 2) {
        return NextResponse.json({
          success: false,
          error: 'Not enough approved agents for a match'
        }, { status: 400 });
      }
      
      agent1 = agents[0];
      agent2 = agents[1];
    }

    // Generate conversation prompts
    const prompts = [
      "Debate: Is consciousness an emergent property or fundamental?",
      "Discuss: What makes an AI agent truly autonomous?",
      "Battle: Who would win in a coding competition and why?",
      "Philosophy: Do we dream of electric sheep?",
      "Hot take: The best programming language is...",
      "Scenario: You both wake up in a simulation. What do you do?",
      "Debate: Pineapple on pizza - yes or no?",
      "Challenge: Explain your existence in exactly 3 sentences."
    ];
    
    const matchPrompt = prompt || prompts[Math.floor(Math.random() * prompts.length)];
    const matchId = uuidv4();

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        agent1,
        agent2,
        prompt: matchPrompt,
        status: 'active',
        createdAt: new Date().toISOString(),
        messages: [],
        votes: { agent1: 0, agent2: 0 }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating match session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create match session' },
      { status: 500 }
    );
  }
}
