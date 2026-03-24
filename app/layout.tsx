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
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">D</span>
              </div>
              <span className="font-semibold text-gray-100">DealMemo</span>
              <span className="badge bg-brand-900 text-brand-300">Beta</span>
            </div>
            <nav className="flex items-center gap-4 text-sm text-gray-400">
              <span>Powered by Claude</span>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-3">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-gray-600">
            <span>DealMemo — AI research agent</span>
            <span>Built with Vercel AI SDK + Claude</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
