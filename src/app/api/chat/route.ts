import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { SYSTEM_PROMPT } from '@/lib/chat-config';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const groq = createGroq();

export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: {
      execute_query: {
        description: 'Execute a read-only SQL query against the Supabase PostgreSQL database to retrieve financial data. Only SELECT queries are allowed.',
        inputSchema: z.object({
          query: z.string().describe('The SQL SELECT query to execute'),
        }),
        execute: async ({ query }: { query: string }) => {
          // Safety check: only allow SELECT queries
          const trimmed = query.trim().toUpperCase();
          if (!trimmed.startsWith('SELECT')) {
            return { error: 'Only SELECT queries are allowed' };
          }

          const supabase = createServerSupabase();
          const { data, error } = await supabase.rpc('execute_readonly_query', {
            query_text: query,
          });

          if (error) {
            return { error: `Query failed: ${error.message}. Try rephrasing your query.` };
          }

          return { rows: data, count: Array.isArray(data) ? data.length : 0 };
        },
      },
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
