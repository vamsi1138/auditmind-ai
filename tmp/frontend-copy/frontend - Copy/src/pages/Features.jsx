import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useStore";

const features = [
  {
    icon: "AI",
    title: "AI-powered analysis",
    text: "Combines deterministic contract parsing with model-guided reasoning.",
    id: "ai-analysis",
    to: "/features/ai-analysis"
  },
  {
    icon: "RS",
    title: "Risk detection",
    text: "Highlights owner control, mint abuse, withdrawal risk, and dangerous call patterns.",
    id: "risk-detection",
    to: "/features/risk-detection"
  },
  {
    icon: "SR",
    title: "Structured reports",
    text: "Outputs organized sections for security teams and product stakeholders.",
    id: "structured-reports",
    to: "/features/structured-reports"
  },
  {
    icon: "FP",
    title: "Fast performance",
    text: "Delivers analysis quickly with responsive UX and low-friction workflow.",
    id: "fast-performance",
    to: "/features/fast-performance"
  }
];

export default function Features() {
  const navigate = useNavigate();
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);
  const showSavedToast = useAppStore((s) => s.showSavedToast);

  const handleExploreFeature = (featureId) => {
    setSelectedFeature(featureId);
    showSavedToast("Feature mode selected");
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card rounded-3xl p-8"
      >
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Features</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
          Built for modern Web3 teams that need fast, understandable, and repeatable contract security checks.
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2">
        {features.map((feature, idx) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="glass-card rounded-2xl p-6 transition-shadow duration-300 hover:shadow-neon"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-xs font-semibold text-cyan-100">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-slate-300">{feature.text}</p>
            <button
              type="button"
              onClick={() => {
                handleExploreFeature(feature.id);
                navigate(feature.to);
              }}
              className="mt-4 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
            >
              Explore Feature
            </button>
          </motion.article>
        ))}
      </section>
    </div>
  );
}
