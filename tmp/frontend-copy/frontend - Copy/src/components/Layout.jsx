import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import { useAppStore } from "../store/useStore";

export default function Layout() {
  const toastVisible = useAppStore((s) => s.toastVisible);
  const toastMessage = useAppStore((s) => s.toastMessage);
  const toastToken = useAppStore((s) => s.toastToken);
  const hideToast = useAppStore((s) => s.hideToast);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => hideToast(), 1400);
    return () => clearTimeout(timer);
  }, [toastVisible, toastToken, hideToast]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-35" />
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-neon-cyan/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-36 h-64 w-64 rounded-full bg-neon-pink/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-neon-mint/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="pb-2 text-center text-xs text-slate-400">
          Smart Contract Audit AI · Secure Solidity Insights
        </footer>

        <AnimatePresence>
          {toastVisible ? (
            <motion.div
              key={toastToken}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-5 right-5 z-50 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100 shadow-neon"
            >
              {toastMessage || "Saved"}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
