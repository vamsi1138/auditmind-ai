import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Precision Audit Engine",
    text: "Rule-driven and AI-assisted analysis for Solidity contracts with structured output."
  },
  {
    title: "Instant Risk Clarity",
    text: "Clear severity scoring and suspicious pattern detection in seconds."
  },
  {
    title: "Product-Grade Reporting",
    text: "Readable multi-section reports for developers, auditors, and non-technical stakeholders."
  }
];

export default function Home() {
  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card neon-ring rounded-3xl p-8 sm:p-10"
      >
        <div className="max-w-4xl space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            AI Smart Contract Security Assistant
          </h1>
          <p className="text-base text-slate-300 sm:text-lg">
            AI-powered Solidity security analysis
          </p>
          <Link
            to="/analyze"
            className="inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 px-5 py-3 text-sm font-semibold text-slate-950 shadow-neon transition-all duration-300 hover:scale-[1.02] hover:from-cyan-300 hover:to-cyan-500"
          >
            Start Analyzing
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item, idx) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="glass-card rounded-2xl p-5"
          >
            <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
            <p className="text-sm leading-relaxed text-slate-300">{item.text}</p>
          </motion.article>
        ))}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="mb-2 text-xl font-semibold text-white">Why this tool</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          Audit AI helps teams quickly understand contract intent, risk concentration, and exploit surfaces. It is built
          for rapid iteration, clear reporting, and production-ready workflows.
        </p>
      </motion.section>
    </div>
  );
}
