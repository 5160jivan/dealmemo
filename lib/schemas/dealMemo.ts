import { z } from 'zod';

export const CompetitorSchema = z.object({
  name: z.string().describe('Competitor company name'),
  differentiation: z.string().describe('How this company differs from the target company'),
});

export const DealMemoSchema = z.object({
  company: z.string().describe('The company being analyzed'),
  generatedAt: z.string().describe('ISO timestamp of when the memo was generated'),
  overview: z.object({
    description: z.string().describe('2-3 sentence description of what the company does'),
    founded: z.string().optional().describe('Year founded (if known)'),
    headquarters: z.string().optional().describe('City, Country (if known)'),
    stage: z.string().optional().describe('Funding stage: Seed, Series A/B/C, Growth, Public'),
    founders: z.array(z.string()).optional().describe('Key founder names and brief backgrounds'),
    website: z.string().optional().describe('Company website URL if known'),
  }),
  market: z.object({
    size: z.string().describe('TAM estimate with dollar amount and source basis'),
    growth: z.string().describe('Market growth rate or trajectory'),
    tailwinds: z.array(z.string()).describe('3-5 market forces driving the opportunity'),
    headwinds: z.array(z.string()).describe('2-4 market forces working against the company'),
  }),
  competitors: z.array(CompetitorSchema).describe('3-5 direct and indirect competitors'),
  strengths: z.array(z.string()).describe('4-6 genuine competitive advantages or positive signals'),
  risks: z.array(z.string()).describe('4-6 honest risks: execution, market, regulatory, financial'),
  verdict: z.object({
    recommendation: z
      .enum(['Strong Buy', 'Buy', 'Watch', 'Pass'])
      .describe('Investment recommendation'),
    rationale: z.string().describe('2-3 sentences explaining the recommendation'),
    keyQuestions: z
      .array(z.string())
      .describe('3 questions a VC should ask before investing'),
  }),
  sources: z
    .array(z.string())
    .optional()
    .describe('URLs or references used in the analysis'),
});

export type DealMemo = z.infer<typeof DealMemoSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
