import Chat from '@/components/Chat';

export default function Home() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-stone-200/60 bg-white/30">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-8 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-cyan-600 bg-clip-text text-transparent">
              Startup research
            </span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
            One company name → a structured deal memo, streamed as it&apos;s written.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <Chat />
      </div>
    </div>
  );
}
