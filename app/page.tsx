import Chat from '@/components/Chat';

export default function Home() {
  return (
    <div className="h-full flex flex-col">
      {/* Hero section */}
      <div className="text-center py-8 px-4 border-b border-gray-800/50">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
          Startup Research Agent
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          Enter a company name and get an institutional-quality deal memo in seconds.
          Powered by Claude — streaming live as it thinks.
        </p>
      </div>

      {/* Chat interface */}
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </div>
  );
}
