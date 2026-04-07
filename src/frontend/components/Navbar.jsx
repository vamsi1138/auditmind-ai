import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../store/useStore";

const links = [
  { label: "Home", to: "/" },
  { label: "Analyze", to: "/analyze" },
  { label: "Features", to: "/features" },
  { label: "History", to: "/history" },
  { label: "About", to: "/about" }
];

export default function Navbar() {
  const history = useAppStore((s) => s.history);
  const last = history[0];

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="sticky top-4 z-40"
    >
      <nav className="glass-card mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="group inline-flex items-center gap-2 text-lg font-semibold tracking-wide text-white"
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(35,211,255,0.9)]" />
          AuditMind AI
        </NavLink>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-cyan-400/20 text-cyan-100"
                    : "text-slate-300 hover:bg-slate-700/40 hover:text-white"
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="text-right text-xs text-slate-300">
          <div className="text-slate-400">Last analyzed contract</div>
          <div>{last ? `${last.severity?.overall || "Low"} · ${last.riskScore ?? 0}/10` : "None yet"}</div>
        </div>
      </nav>
    </motion.header>
  );
}
