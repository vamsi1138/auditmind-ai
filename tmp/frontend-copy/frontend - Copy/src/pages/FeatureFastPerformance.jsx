import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../store/useStore";

export default function FeatureFastPerformance() {
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);

  useEffect(() => {
    setSelectedFeature("fast-performance");
  }, [setSelectedFeature]);

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-3xl p-8"
      >
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Fast Performance</h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Built for rapid feedback with smooth UI transitions, responsive rendering, and efficient API interaction.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white">Live experience</h2>
        <p className="mt-2 text-sm text-slate-300">
          This mode removes non-essential report sections so users can get fast pass/fail-like insight and move quickly.
        </p>
        <Link
          to="/analyze?mode=fast-performance"
          className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Use Fast Performance Mode
        </Link>
      </motion.section>
    </div>
  );
}
