import { z } from 'zod';

/** Embedded in markdown as ```dealmemo-finance ... ``` for client-side charts */
export const FinancialVizSchema = z.object({
  currency: z.string().default('USD'),
  /** Short investor-facing caveat, e.g. "Figures from press; ARR estimated" */
  context: z.string().optional(),
  kpis: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.number(), z.string()]),
        unit: z.string().optional(),
        period: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .default([]),
  /** Revenue, ARR, or similar over periods (e.g. years or quarters) */
  revenueOrMrrSeries: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      })
    )
    .optional(),
  /** Disclosed funding rounds — amounts in millions USD when possible */
  fundingRounds: z
    .array(
      z.object({
        name: z.string(),
        amountM: z.number().optional(),
        year: z.string().optional(),
      })
    )
    .optional(),
});

export type FinancialVizPayload = z.infer<typeof FinancialVizSchema>;
