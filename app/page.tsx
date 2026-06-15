export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-xs tracking-[0.3em] text-slate-400 mb-6">
        SERVICE COMPANY SOFTWARE
      </div>
      <h1 className="text-5xl font-extrabold tracking-wide">
        <span style={{ color: "#e0a82e" }}>REY</span>
        <span className="text-white">GUILD</span>
      </h1>
      <p className="mt-4 text-slate-300 max-w-md">
        One login. Every ReyGuild app in one place. The command center is being
        built.
      </p>
      <div className="mt-10 h-[3px] w-16 rounded bg-[#e0a82e]" />
    </main>
  );
}
