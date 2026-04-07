import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAgentCapabilities } from "../services/api";

export default function About() {
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    let mounted = true;

    getAgentCapabilities()
      .then((capabilityData) => {
        if (mounted) {
          setAgent(capabilityData);
        }
      })
      .catch(() => {
        if (mounted) {
          setAgent(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card rounded-3xl p-8"
      >
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">About Audit AI</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
          Audit AI is a smart contract security interface focused on giving fast, structured, and understandable
          Solidity risk analysis.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="mb-2 text-xl font-semibold text-white">What it does</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          The platform parses contract inputs, evaluates security-sensitive patterns, and returns professional sections
          including risk summaries, severity, and actionable guidance.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.35 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="mb-2 text-xl font-semibold text-white">Why it matters</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          Smart contract bugs and governance flaws can cause irreversible losses. Audit AI aims to reduce review time,
          improve report consistency, and make security insights accessible across technical and non-technical teams.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="mb-2 text-xl font-semibold text-white">Live Eliza Agent Runtime</h2>
        {agent ? (
          <div className="space-y-2 text-sm text-slate-300">
            <p>Agent: {agent.name || "Unknown"}</p>
            <p>Runtime Provider: {agent?.runtime?.provider || "n/a"}</p>
            <p>Model: {agent?.runtime?.model || "n/a"}</p>
            <p>Capabilities: {(agent.capabilities || []).join(", ") || "n/a"}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-300">Agent runtime metadata is unavailable right now.</p>
        )}
      </motion.section>
    </div>
  );
}
