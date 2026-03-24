import { tool } from 'ai';
import { z } from 'zod';

/**
 * Web search tool using Tavily API (optimized for AI agents).
 * Falls back to a simple error message if the API key is not configured.
 */
export const webSearchTool = tool({
  description:
    'Search the web for current information about a company, market, or topic. ' +
    'Use this to find recent news, funding rounds, product launches, and competitor info.',
  parameters: z.object({
    query: z.string().describe('The search query — be specific, e.g. "Stripe funding history valuation 2024"'),
    maxResults: z.number().optional().default(5).describe('Number of results to return (1-10)'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return {
        error: 'Web search unavailable — TAVILY_API_KEY not configured',
        results: [],
        query,
      };
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          max_results: Math.min(maxResults, 10),
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return {
          error: `Tavily API error: ${response.status} ${err}`,
          results: [],
          query,
        };
      }

      const data = await response.json();

      return {
        query,
        answer: data.answer ?? null,
        results: (data.results ?? []).map((r: TavilyResult) => ({
          title: r.title,
          url: r.url,
          content: r.content?.slice(0, 500), // Trim to avoid token bloat
          score: r.score,
        })),
      };
    } catch (err) {
      return {
        error: `Search failed: ${String(err)}`,
        results: [],
        query,
      };
    }
  },
});

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}
