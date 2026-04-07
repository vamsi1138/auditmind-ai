import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Analyze from "./pages/Analyze";
import Home from "./pages/Home";
import Features from "./pages/Features";
import FeatureAIAnalysis from "./pages/FeatureAIAnalysis";
import FeatureRiskDetection from "./pages/FeatureRiskDetection";
import FeatureStructuredReports from "./pages/FeatureStructuredReports";
import FeatureFastPerformance from "./pages/FeatureFastPerformance";
import About from "./pages/About";
import History from "./pages/History";

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
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/features" element={<Features />} />
            <Route path="/features/ai-analysis" element={<FeatureAIAnalysis />} />
            <Route path="/features/risk-detection" element={<FeatureRiskDetection />} />
            <Route path="/features/structured-reports" element={<FeatureStructuredReports />} />
            <Route path="/features/fast-performance" element={<FeatureFastPerformance />} />
            <Route path="/history" element={<History />} />
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
