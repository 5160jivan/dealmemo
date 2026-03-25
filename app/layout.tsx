import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealMemo — AI Startup Research Agent',
  description:
    'Generate institutional-quality deal memos for any startup in seconds using AI-powered research.',
  openGraph: {
    title: 'DealMemo',
    description: 'AI-powered startup deal memo generator',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col">
        <header className="border-b border-stone-200/80 bg-white/75 backdrop-blur-lg sticky top-0 z-50 shadow-sm shadow-stone-200/40">
          <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center
                  shadow-md shadow-orange-400/35"
              >
                <span className="text-white text-xs font-bold">D</span>
              </div>
              <span className="font-semibold text-slate-900 tracking-tight">DealMemo</span>
              <span className="badge bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px]">
                Beta
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>

        <footer className="border-t border-stone-200/80 py-4 bg-white/40">
          <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 text-center text-[11px] text-slate-500">
            DealMemo — research memos for founders and investors
          </div>
        </footer>
      </body>
    </html>
  );
}
