import { tool } from 'ai';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { DealMemoSchema } from '../schemas/dealMemo';

/**
 * Format the gathered research into a structured deal memo JSON object.
 * Uses generateObject with a Zod schema to produce type-safe, structured output.
 */
export const formatMemoTool = tool({
  description:
    'Format all gathered research into a structured deal memo. Call this LAST, ' +
    'after you have searched the web and read relevant pages. ' +
    'Pass in all the research you have collected as context.',
  parameters: z.object({
    company: z.string().describe('The company name being analyzed'),
    researchSummary: z
      .string()
      .describe(
        'All research gathered so far — search results, page content, and your analysis. ' +
        'Be comprehensive, this is the input for final structuring.'
      ),
  }),
  execute: async ({ company, researchSummary }) => {
    try {
      const { object: memo } = await generateObject({
        model: anthropic('claude-haiku-4-5-20251001'), // Use Haiku for structured extraction (faster + cheaper)
        schema: DealMemoSchema,
        prompt: `You are a VC analyst. Based on the following research, generate a structured deal memo for ${company}.

Research:
${researchSummary}

Generate a complete, accurate deal memo. Use the research above. Where information is uncertain, note it clearly.
Set generatedAt to the current ISO timestamp: ${new Date().toISOString()}`,
        temperature: 0.2,
      });

      return {
        success: true,
        memo,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to format memo: ${message}`,
        memo: null,
      };
    }
  },
});
