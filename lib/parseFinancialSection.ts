import { FinancialVizSchema, type FinancialVizPayload } from './schemas/financialViz';

const PLACEHOLDER = '<<DEALMEMO_FINANCE_VIZ>>';

const CLOSED_FENCE = /```dealmemo-finance\s*\n([\s\S]*?)\n```/;

/**
 * Pulls the financial viz JSON out of streamed markdown and returns cleaned text
 * plus a placeholder line the renderer swaps for charts.
 */
export function prepareMemoDisplay(
  content: string,
  isStreaming: boolean
): { display: string; finance: FinancialVizPayload | null } {
  let display = content;
  let finance: FinancialVizPayload | null = null;

  const match = display.match(CLOSED_FENCE);

  if (match) {
    const raw = match[1].trim();
    try {
      const json = JSON.parse(raw) as unknown;
      const parsed = FinancialVizSchema.safeParse(json);
      if (parsed.success) {
        finance = parsed.data;
        display = display.replace(match[0], `\n${PLACEHOLDER}\n`);
      } else {
        display = display.replace(
          match[0],
          '\n_(Financial chart omitted — data did not match the expected format.)_\n'
        );
      }
    } catch {
      display = display.replace(
        match[0],
        '\n_(Financial chart omitted — could not parse JSON.)_\n'
      );
    }
  } else if (isStreaming && display.includes('```dealmemo-finance')) {
    display = display.replace(/```dealmemo-finance[\s\S]*$/, '\n\n_Preparing financial snapshot…_\n');
  }

  return { display, finance };
}

export const FINANCE_VIZ_PLACEHOLDER = PLACEHOLDER;
