import { motion } from "framer-motion";

export default function InputPanel({
  inputMode,
  value,
  address,
  githubUrl,
  onChange,
  onAddressChange,
  onGithubUrlChange,
  onFileUpload,
  onAnalyze,
  onLoadExample,
  onClear,
  loading,
  fetching,
  error
}) {
  const charCount = value.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="glass-card rounded-3xl p-6 sm:p-8"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white sm:text-xl">Contract Input</h2>
        <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {charCount} chars
        </span>
      </div>

      <p className="mb-3 text-xs text-slate-300">Paste code, upload a file, enter a contract address, or use a GitHub URL.</p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Contract address (0x...)"
          disabled={loading || fetching}
          className="w-full rounded-xl border border-slate-600/60 bg-slate-950/65 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-cyan-300/80 focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70"
        />

        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-600/60 bg-slate-900/55 px-4 py-3 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-cyan-300/60 hover:bg-slate-800/70">
          Upload .sol File
          <input
            type="file"
            accept=".sol,text/plain"
            onChange={(e) => onFileUpload(e.target.files?.[0] || null)}
            disabled={loading || fetching}
            className="hidden"
          />
        </label>
      </div>

      <div className="mb-4">
        <input
          value={githubUrl}
          onChange={(e) => onGithubUrlChange(e.target.value)}
          placeholder="GitHub URL (repo, blob, tree, or raw .sol)"
          disabled={loading || fetching}
          className="w-full rounded-xl border border-slate-600/60 bg-slate-950/65 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-cyan-300/80 focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your Solidity contract here..."
        disabled={loading || fetching}
        className="scrollbar-thin h-56 w-full resize-y rounded-2xl border border-slate-600/60 bg-slate-950/65 p-4 font-mono text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-cyan-300/80 focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-70"
      />

      <div className="mt-2 text-xs text-slate-400">Input mode: {inputMode}</div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || fetching}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon transition-all duration-300 hover:scale-[1.02] hover:from-cyan-300 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {fetching ? "Fetching contract source..." : loading ? "Analyzing contract..." : "Analyze Contract / GitHub"}
        </button>

        <button
          type="button"
          onClick={onLoadExample}
          disabled={loading || fetching}
          className="inline-flex items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/55 px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-cyan-300/60 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Load Example
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={loading || fetching}
          className="inline-flex items-center justify-center rounded-xl border border-slate-500/60 bg-slate-900/55 px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-slate-300/60 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear Input
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </motion.section>
  );
}
