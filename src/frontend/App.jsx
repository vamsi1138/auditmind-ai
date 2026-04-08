import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Analyze from "./pages/Analyze";
import Home from "./pages/Home";
import About from "./pages/About";
import History from "./pages/History";
import SavedReports from "./pages/SavedReports";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Docs from "./pages/Docs";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/history" element={<History />} />
            <Route path="/saved-reports" element={<SavedReports />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return <AnimatedRoutes />;
}
