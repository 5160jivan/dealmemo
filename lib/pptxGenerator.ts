/**
 * Generates a PowerPoint deal memo from markdown text.
 * Uses pptxgenjs (Node.js runtime only).
 */
import pptxgen from 'pptxgenjs';

const C = {
  amber:      'F59E0B',
  amberBg:    'FFFBEB',
  dark:       '0F172A',
  slate:      '475569',
  slateLight: '94A3B8',
  border:     'E7E5E0',
  bg:         'FAF8F5',
  white:      'FFFFFF',
  strongBuy:  '15803D',
  buy:        '0369A1',
  watch:      'B45309',
  pass:       'B91C1C',
};

const W = 13.33;
const H = 7.5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function verdictColor(rec: string): string {
  const r = rec.toLowerCase();
  if (r.includes('strong')) return C.strongBuy;
  if (r.includes('buy'))    return C.buy;
  if (r.includes('watch'))  return C.watch;
  if (r.includes('pass'))   return C.pass;
  return C.slate;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = text.split('\n');
  let key = '';
  const buf: string[] = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (key) sections[key] = buf.join('\n').trim();
      key = line.slice(3).trim();
      buf.length = 0;
    } else {
      buf.push(line);
    }
  }
  if (key) sections[key] = buf.join('\n').trim();
  return sections;
}

function extractBullets(text: string): string[] {
  return text.split('\n')
    .filter(l => /^\s*[-*]\s/.test(l))
    .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseFinance(finSection: string) {
  const m = finSection.match(/```dealmemo-finance\n([\s\S]+?)\n```/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function parseVerdict(section: string) {
  const rec = section.match(/\*\*Recommendation:\*\*\s*(.+)/)?.[1]?.trim() ?? 'Watch';
  const rat = section.match(/\*\*Rationale:\*\*\s*([\s\S]+?)(?=\n\*\*|\n---|$)/)?.[1]?.trim() ?? '';
  const qIdx = section.indexOf('Key Questions');
  const questions = qIdx >= 0 ? extractBullets(section.slice(qIdx)) : [];
  return { recommendation: rec, rationale: rat, keyQuestions: questions };
}

// ─── Slide builders ─────────────────────────────────────────────────────────

function accentBar(slide: pptxgen.Slide) {
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: 0.1, h: H,
    fill: { color: C.amber },
    line: { color: C.amber, width: 0 },
  });
}

function sectionHeader(slide: pptxgen.Slide, title: string) {
  slide.addText(title.toUpperCase(), {
    x: 0.35, y: 0.25, w: W - 0.7, h: 0.45,
    fontSize: 11, bold: true, color: C.amber, fontFace: 'Calibri', charSpacing: 1.5,
  });
  slide.addShape('line' as pptxgen.SHAPE_NAME, {
    x: 0.35, y: 0.8, w: W - 0.7, h: 0,
    line: { color: C.border, width: 0.75 },
  });
}

function addContentSlide(pptx: pptxgen, title: string, content: string) {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  accentBar(slide);
  sectionHeader(slide, title);
  slide.addText(truncate(stripMarkdown(content), 900), {
    x: 0.35, y: 1.0, w: W - 0.7, h: H - 1.3,
    fontSize: 11, color: C.slate, fontFace: 'Calibri',
    valign: 'top', wrap: true, paraSpaceAfter: 5,
  });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface MemoForExport {
  company: string;
  text: string;
  createdAt: string;
}

export async function generatePptx(memo: MemoForExport): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title   = `${memo.company} — Deal Memo`;
  pptx.author  = 'DealMemo';
  pptx.company = 'DealMemo';

  const sections = parseSections(memo.text);
  const verdict  = parseVerdict(sections['Verdict'] ?? '');
  const vColor   = verdictColor(verdict.recommendation);
  const date     = new Date(memo.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Slide 1: Cover ──────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.bg };

    // Amber header bar
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: W, h: 1.4,
      fill: { color: C.amber },
      line: { color: C.amber, width: 0 },
    });

    slide.addText('DEALMEMO', {
      x: 0.5, y: 0.12, w: 4, h: 0.38,
      fontSize: 10, bold: true, color: C.white, fontFace: 'Calibri', charSpacing: 3,
    });

    slide.addText(date, {
      x: W - 3.2, y: 0.12, w: 2.7, h: 0.38,
      fontSize: 9, color: 'FEF3C7', fontFace: 'Calibri', align: 'right',
    });

    slide.addText('DEAL MEMO', {
      x: 0.5, y: 0.72, w: W - 1, h: 0.55,
      fontSize: 13, color: 'FEF3C7', fontFace: 'Calibri', charSpacing: 2,
    });

    // Company name
    slide.addText(memo.company, {
      x: 0.5, y: 1.8, w: W - 1.5, h: 1.8,
      fontSize: 52, bold: true, color: C.dark, fontFace: 'Calibri', wrap: true,
    });

    // Verdict badge
    slide.addShape('roundRect' as pptxgen.SHAPE_NAME, {
      x: 0.5, y: 4.0, w: 2.6, h: 0.58,
      fill: { color: vColor },
      line: { color: vColor, width: 0 },
      rectRadius: 0.08,
    });
    slide.addText(verdict.recommendation.toUpperCase(), {
      x: 0.5, y: 4.0, w: 2.6, h: 0.58,
      fontSize: 12, bold: true, color: C.white, fontFace: 'Calibri',
      align: 'center', valign: 'middle',
    });

    slide.addText('Powered by DealMemo AI Research', {
      x: 0.5, y: H - 0.45, w: W - 1, h: 0.32,
      fontSize: 9, color: C.slateLight, fontFace: 'Calibri',
    });
  }

  // ── Slide 2: Company Overview ────────────────────────────────────────────
  if (sections['Company Overview']) {
    addContentSlide(pptx, 'Company Overview', sections['Company Overview']);
  }

  // ── Slide 3: Financial Snapshot ──────────────────────────────────────────
  {
    const finSection = sections['Recent Financial Performance'] ?? '';
    const finData    = parseFinance(finSection);

    if (finData?.kpis?.length) {
      const slide = pptx.addSlide();
      slide.background = { color: C.white };
      accentBar(slide);
      sectionHeader(slide, 'Financial Snapshot');

      const kpis: Array<{ label: string; value: string | number; unit?: string; period?: string }> =
        finData.kpis.slice(0, 8);
      const cols = 4;
      const kpiW = (W - 0.7) / cols;
      const kpiH = 1.3;

      kpis.forEach((kpi, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x   = 0.35 + col * kpiW;
        const y   = 1.1 + row * (kpiH + 0.15);

        slide.addShape('rect' as pptxgen.SHAPE_NAME, {
          x, y, w: kpiW - 0.15, h: kpiH,
          fill: { color: 'F8F7F4' },
          line: { color: C.border, width: 0.5 },
        });
        slide.addText(String(kpi.label), {
          x: x + 0.12, y: y + 0.1, w: kpiW - 0.35, h: 0.28,
          fontSize: 8, color: C.slateLight, fontFace: 'Calibri',
          bold: true, charSpacing: 0.3,
        });
        slide.addText(`${kpi.value}${kpi.unit ?? ''}`, {
          x: x + 0.12, y: y + 0.42, w: kpiW - 0.35, h: 0.6,
          fontSize: 18, bold: true, color: C.dark, fontFace: 'Calibri', wrap: false,
        });
        if (kpi.period) {
          slide.addText(String(kpi.period), {
            x: x + 0.12, y: y + 0.98, w: kpiW - 0.35, h: 0.22,
            fontSize: 8, color: C.slateLight, fontFace: 'Calibri',
          });
        }
      });

      // Prose below KPIs
      const prose = stripMarkdown(finSection.replace(/```[\s\S]*?```/g, '').trim());
      if (prose) {
        const yOff = kpis.length > 4 ? 4.3 : 2.8;
        slide.addText(truncate(prose, 350), {
          x: 0.35, y: yOff, w: W - 0.7, h: H - yOff - 0.3,
          fontSize: 9.5, color: C.slate, fontFace: 'Calibri',
          wrap: true, italic: true,
        });
      }
    } else if (finSection) {
      addContentSlide(pptx, 'Recent Financial Performance', finSection);
    }
  }

  // ── Slide 4: Market Analysis ─────────────────────────────────────────────
  if (sections['Market Analysis']) {
    addContentSlide(pptx, 'Market Analysis', sections['Market Analysis']);
  }

  // ── Slide 5: Competitive Landscape ───────────────────────────────────────
  if (sections['Competitive Landscape']) {
    addContentSlide(pptx, 'Competitive Landscape', sections['Competitive Landscape']);
  }

  // ── Slide 6: Strengths & Risks ───────────────────────────────────────────
  {
    const strengths = extractBullets(sections['Strengths'] ?? '');
    const risks     = extractBullets(sections['Key Risks'] ?? '');

    if (strengths.length > 0 || risks.length > 0) {
      const slide  = pptx.addSlide();
      slide.background = { color: C.white };
      accentBar(slide);

      const halfW = (W - 0.7) / 2 - 0.1;

      slide.addText('STRENGTHS', {
        x: 0.35, y: 0.25, w: halfW, h: 0.45,
        fontSize: 11, bold: true, color: '15803D', fontFace: 'Calibri', charSpacing: 1.5,
      });
      slide.addText('KEY RISKS', {
        x: 0.55 + halfW, y: 0.25, w: halfW, h: 0.45,
        fontSize: 11, bold: true, color: 'B91C1C', fontFace: 'Calibri', charSpacing: 1.5,
      });
      slide.addShape('line' as pptxgen.SHAPE_NAME, {
        x: 0.35, y: 0.8, w: W - 0.7, h: 0,
        line: { color: C.border, width: 0.75 },
      });
      slide.addShape('line' as pptxgen.SHAPE_NAME, {
        x: 0.5 + halfW, y: 0.85, w: 0, h: H - 1.2,
        line: { color: C.border, width: 0.75 },
      });

      if (strengths.length > 0) {
        slide.addText(
          strengths.map(b => ({ text: b, options: { bullet: true, fontSize: 11, color: '15803D', paraSpaceAfter: 10, fontFace: 'Calibri' } })),
          { x: 0.35, y: 1.0, w: halfW, h: H - 1.3, valign: 'top' }
        );
      }
      if (risks.length > 0) {
        slide.addText(
          risks.map(b => ({ text: b, options: { bullet: true, fontSize: 11, color: 'B91C1C', paraSpaceAfter: 10, fontFace: 'Calibri' } })),
          { x: 0.55 + halfW, y: 1.0, w: halfW, h: H - 1.3, valign: 'top' }
        );
      }
    }
  }

  // ── Slide 7: Verdict ─────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { color: C.white };

    // Colored left panel
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: 4.3, h: H,
      fill: { color: vColor },
      line: { color: vColor, width: 0 },
    });

    slide.addText('VERDICT', {
      x: 0.3, y: 0.5, w: 3.7, h: 0.4,
      fontSize: 10, bold: true, color: C.white, fontFace: 'Calibri',
      charSpacing: 3, align: 'center',
    });

    slide.addText(verdict.recommendation.toUpperCase(), {
      x: 0.3, y: 1.6, w: 3.7, h: 2.5,
      fontSize: 30, bold: true, color: C.white, fontFace: 'Calibri',
      align: 'center', valign: 'middle', wrap: true,
    });

    // Right panel
    slide.addText('RATIONALE', {
      x: 4.65, y: 0.4, w: W - 5.1, h: 0.4,
      fontSize: 10, bold: true, color: C.amber, fontFace: 'Calibri', charSpacing: 1.5,
    });
    slide.addShape('line' as pptxgen.SHAPE_NAME, {
      x: 4.65, y: 0.9, w: W - 5.2, h: 0,
      line: { color: C.border, width: 0.75 },
    });
    slide.addText(truncate(verdict.rationale, 450), {
      x: 4.65, y: 1.1, w: W - 5.2, h: 2.2,
      fontSize: 11, color: C.slate, fontFace: 'Calibri',
      wrap: true, valign: 'top', italic: true,
    });

    if (verdict.keyQuestions.length > 0) {
      slide.addText('KEY QUESTIONS TO RESOLVE', {
        x: 4.65, y: 3.55, w: W - 5.1, h: 0.4,
        fontSize: 10, bold: true, color: C.amber, fontFace: 'Calibri', charSpacing: 1.5,
      });
      slide.addShape('line' as pptxgen.SHAPE_NAME, {
        x: 4.65, y: 4.05, w: W - 5.2, h: 0,
        line: { color: C.border, width: 0.75 },
      });
      slide.addText(
        verdict.keyQuestions.slice(0, 4).map(q => ({
          text: q,
          options: { bullet: true, fontSize: 10.5, color: C.slate, paraSpaceAfter: 8, fontFace: 'Calibri' },
        })),
        { x: 4.65, y: 4.25, w: W - 5.2, h: H - 4.65, valign: 'top' }
      );
    }
  }

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  return buf as Buffer;
}
