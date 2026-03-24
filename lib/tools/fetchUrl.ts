import { tool } from 'ai';
import { z } from 'zod';

/**
 * Fetch and extract text content from a URL using Jina Reader API.
 * Jina converts any URL into clean, LLM-friendly markdown.
 * No API key required for basic use.
 */
export const fetchUrlTool = tool({
  description:
    'Fetch and read the content of a web page. Use this to read a company homepage, ' +
    'a news article, a Crunchbase profile, or any URL found in search results. ' +
    'Returns clean text content suitable for analysis.',
  parameters: z.object({
    url: z.string().url().describe('The full URL to fetch (must start with https://)'),
    reason: z
      .string()
      .optional()
      .describe('Why you are fetching this URL — helps with tracing'),
  }),
  execute: async ({ url, reason }) => {
    try {
      // Jina Reader: converts any URL to clean markdown (free, no auth needed)
      const jinaUrl = `https://r.jina.ai/${url}`;

      const response = await fetch(jinaUrl, {
        headers: {
          Accept: 'text/plain',
          'X-Return-Format': 'text',
        },
        signal: AbortSignal.timeout(15_000), // 15s timeout
      });

      if (!response.ok) {
        return {
          error: `Failed to fetch URL: HTTP ${response.status}`,
          url,
          reason,
          content: null,
        };
      }

      const rawContent = await response.text();

      // Truncate to ~3000 chars to avoid excessive token usage
      const content = rawContent.slice(0, 3000);
      const truncated = rawContent.length > 3000;

      return {
        url,
        reason,
        content,
        truncated,
        characterCount: rawContent.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        error: `Fetch failed: ${message}`,
        url,
        reason,
        content: null,
      };
    }
  },
});
