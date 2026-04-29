import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { SYSTEM_PROMPT } from '@/lib/chat-config';
import { createServerSupabase } from '@/lib/supabase/server';
import { detectRecurring, estimateMonthlyTotal, isLikelySubscription } from '@/lib/recurring-detection';
import type { Transaction } from '@/lib/queries/types';
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
      get_recurring_charges: {
        description: 'Get all detected recurring charges and subscriptions. Uses the same detection algorithm as the dashboard — groups transactions by merchant + amount and recognizes known subscription services. Use this whenever the user asks about subscriptions, recurring charges, bills, or monthly expenses.',
        inputSchema: z.preprocess(() => ({}), z.object({})),
        execute: async () => {
          const supabase = createServerSupabase();
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

          if (error) {
            return { error: `Failed to fetch transactions: ${error.message}` };
          }

          const allCharges = detectRecurring(data as Transaction[]);
          const charges = allCharges.filter(c =>
            c.transactions.some(t => isLikelySubscription(t))
          );
          const monthlyTotal = estimateMonthlyTotal(charges);

          return {
            charges: charges.map(c => ({
              merchant: c.merchantName,
              amount: c.amount,
              frequency: c.frequency,
              lastCharged: c.lastChargeDate,
              occurrences: c.chargeCount,
            })),
            count: charges.length,
            estimatedMonthlyTotal: Math.round(monthlyTotal * 100) / 100,
          };
        },
      },
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
