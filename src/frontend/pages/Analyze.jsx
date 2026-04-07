import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import InputPanel from "../components/InputPanel";
import OutputPanel from "../components/OutputPanel";
import Loader from "../components/Loader";
import FeatureHandler from "../components/FeatureHandler";
import {
  analyzeContract,
  analyzeGithubSource,
  fetchContractSource,
  isGithubUrl,
  isValidContractAddress
} from "../services/api";
import { useAppStore } from "../store/useStore";

const EXAMPLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    address public owner;
    uint public totalSupply;

    constructor() {
        owner = msg.sender;
    }

    function mint(uint amount) public {
        totalSupply += amount;
    }

    function withdraw() public {
        payable(owner).transfer(address(this).balance);
    }
}`;

const sectionOrder = [
  "Contract Summary",
  "Important Functions",
  "Possible Risks",
  "Severity",
  "Why It Matters",
  "Suggested Fix",
  "Final Verdict",
  "Beginner Explanation"
];

function parseStructuredReport(reportText) {
  if (!reportText || typeof reportText !== "string") {
    return {};
  }

  const headingPattern = sectionOrder.map((title) => `${title}:`).join("|");
  const regex = new RegExp(`(${headingPattern})([\\s\\S]*?)(?=${headingPattern}|$)`, "g");
  const sections = {};
  let match;

  while ((match = regex.exec(reportText)) !== null) {
    const heading = match[1].replace(":", "").trim();
    const content = match[2].trim();
    sections[heading] = content;
  }

  return sections;
}

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const inputMode = useAppStore((s) => s.inputMode);
  const code = useAppStore((s) => s.code);
  const address = useAppStore((s) => s.address);
  const githubUrl = useAppStore((s) => s.githubUrl);
  const loading = useAppStore((s) => s.loading);
  const fetching = useAppStore((s) => s.fetching);
  const result = useAppStore((s) => s.lastResult);
  const beginnerMode = useAppStore((s) => s.beginnerMode);
  const selectedFeature = useAppStore((s) => s.selectedFeature);
  const analysisMs = useAppStore((s) => s.lastAnalysisMs);

  const setInputMode = useAppStore((s) => s.setInputMode);
  const setCode = useAppStore((s) => s.setCode);
  const setAddress = useAppStore((s) => s.setAddress);
  const setGithubUrl = useAppStore((s) => s.setGithubUrl);
  const setLoading = useAppStore((s) => s.setLoading);
  const setFetching = useAppStore((s) => s.setFetching);
  const setResult = useAppStore((s) => s.setLastResult);
  const setBeginnerMode = useAppStore((s) => s.setBeginnerMode);
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);
  const setLastAnalysisMs = useAppStore((s) => s.setLastAnalysisMs);
  const addHistoryEntry = useAppStore((s) => s.addHistoryEntry);
  const clearWorkspace = useAppStore((s) => s.clearWorkspace);
  const showSavedToast = useAppStore((s) => s.showSavedToast);

  const [error, setError] = useState("");
  const [agentMessage, setAgentMessage] = useState("Paste code, upload a file, enter a contract address, or use a GitHub URL.");
  const [featureThinking, setFeatureThinking] = useState(false);
  const resultsRef = useRef(null);
  const analyzeAbortRef = useRef(null);
  const addressAbortRef = useRef(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (!mode) {
      return;
    }

    const allowedModes = new Set(["ai-analysis", "risk-detection", "structured-reports", "fast-performance"]);
    if (allowedModes.has(mode)) {
      setSelectedFeature(mode);
    }
  }, [searchParams, setSelectedFeature]);

  const sections = useMemo(() => parseStructuredReport(result?.report), [result]);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  useEffect(() => {
    if (!address.trim()) return;

    const timer = setTimeout(async () => {
      const cleanAddress = address.trim();
      if (!isValidContractAddress(cleanAddress)) {
        setError("Invalid contract address");
        return;
      }

      setError("");
      setFetching(true);
      setAgentMessage("Fetching contract source...");
      setInputMode("address");

      if (addressAbortRef.current) {
        addressAbortRef.current.abort();
      }
      const controller = new AbortController();
      addressAbortRef.current = controller;

      try {
        const source = await fetchContractSource(cleanAddress, { signal: controller.signal });
        setCode(source);
        setAgentMessage("Contract source fetched. Running analysis...");

        const startedAt = performance.now();
        const data = await analyzeContract(source, { signal: controller.signal });
        const elapsed = Math.round(performance.now() - startedAt);

        setResult(data);
        setLastAnalysisMs(elapsed);
        addHistoryEntry({
          code: source,
          result: data,
          selectedFeature,
          analysisMs: elapsed,
          riskScore: data?.riskScore,
          severity: data?.severity
        });
        showSavedToast("Analysis saved to history");
        setAgentMessage("Analysis complete. Review risks and recommendations below.");
      } catch (fetchError) {
        if (fetchError?.name === "AbortError") {
          return;
        }
        setResult(null);
        setError(fetchError.message || "Contract not verified on explorer");
      } finally {
        if (addressAbortRef.current === controller) {
          addressAbortRef.current = null;
          setFetching(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      if (addressAbortRef.current) {
        addressAbortRef.current.abort();
      }
    };
  }, [address]);

  const handleAnalyze = async () => {
    const trimmedCode = code.trim();
    const trimmedGithubUrl = githubUrl.trim();
    const inferredGithubUrl = !trimmedGithubUrl && isGithubUrl(trimmedCode) ? trimmedCode : "";
    const githubTarget = trimmedGithubUrl || inferredGithubUrl;

    if (!trimmedCode && !githubTarget) {
      setError("Please provide input");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    setAgentMessage(githubTarget ? "Validating GitHub source and analyzing contract..." : "Analyzing contract...");

    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
    }
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    try {
      const startedAt = performance.now();
      const data = githubTarget
        ? await analyzeGithubSource(githubTarget, { signal: controller.signal })
        : await analyzeContract(code, { signal: controller.signal });
      const elapsed = Math.round(performance.now() - startedAt);

      if (githubTarget) {
        setInputMode("github");
        setGithubUrl(githubTarget);
      }

      setResult(data);
      setLastAnalysisMs(elapsed);

      addHistoryEntry({
        code,
        result: data,
        selectedFeature,
        analysisMs: elapsed,
        riskScore: data?.riskScore,
        severity: data?.severity
      });

      showSavedToast("Analysis saved to history");
      if (githubTarget && data?.sourceValidation?.isValid) {
        setAgentMessage(data.sourceValidation.message);
      } else {
        setAgentMessage("Analysis complete. Review risks and recommendations below.");
      }
    } catch (analyzeError) {
      if (analyzeError?.name === "AbortError") {
        return;
      }
      setError(analyzeError?.message || "Backend not reachable");
      setResult(null);
      setAgentMessage(githubTarget ? "GitHub source is not valid for analysis." : "Unable to analyze right now.");
    } finally {
      if (analyzeAbortRef.current === controller) {
        analyzeAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleLoadExample = () => {
    setCode(EXAMPLE_CONTRACT);
    setAddress("");
    setGithubUrl("");
    setInputMode("example");
    setError("");
    setAgentMessage("Example contract loaded. Click Analyze Contract.");
    showSavedToast("Example loaded");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      const content = await file.text();
      setCode(content);
      setAddress("");
      setGithubUrl("");
      setInputMode("file");
      setError("");
      setAgentMessage("File loaded. Click Analyze Contract.");
      showSavedToast("Contract file loaded");
    } catch {
      setError("Please provide input");
    }
  };

  const handleClear = () => {
    clearWorkspace();
    setError("");
    setAgentMessage("Paste code, upload a file, enter a contract address, or use a GitHub URL.");
  };

  const displayedSections = useMemo(() => {
    if (beginnerMode) {
      return sections;
    }

    const filtered = { ...sections };
    delete filtered["Beginner Explanation"];
    return filtered;
  }, [beginnerMode, sections]);

  const handleCodeChange = (nextCode) => {
    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
      analyzeAbortRef.current = null;
      setLoading(false);
    }
    if (addressAbortRef.current) {
      addressAbortRef.current.abort();
      addressAbortRef.current = null;
      setFetching(false);
    }

    setCode(nextCode);
    if (nextCode.trim()) {
      setInputMode("paste");
      setAddress("");
      setGithubUrl("");
    }
  };

  const handleAddressChange = (nextAddress) => {
    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
      analyzeAbortRef.current = null;
      setLoading(false);
    }

    setAddress(nextAddress);
    if (nextAddress.trim()) {
      setInputMode("address");
      setCode("");
      setGithubUrl("");
      setResult(null);
    }
  };

  const handleGithubUrlChange = (nextGithubUrl) => {
    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
      analyzeAbortRef.current = null;
      setLoading(false);
    }
    if (addressAbortRef.current) {
      addressAbortRef.current.abort();
      addressAbortRef.current = null;
      setFetching(false);
    }

    setGithubUrl(nextGithubUrl);
    if (nextGithubUrl.trim()) {
      setInputMode("github");
      setAddress("");
      setCode("");
      setResult(null);
      setError("");
    }
  };

  useEffect(() => {
    if (!result) {
      setFeatureThinking(false);
      return;
    }

    const delays = {
      "ai-analysis": 120,
      "risk-detection": 140,
      "structured-reports": 160,
      "fast-performance": 50
    };

    setFeatureThinking(true);
    const timer = setTimeout(() => setFeatureThinking(false), delays[selectedFeature] ?? 350);
    return () => clearTimeout(timer);
  }, [result, selectedFeature]);

  useEffect(() => {
    return () => {
      if (analyzeAbortRef.current) {
        analyzeAbortRef.current.abort();
        analyzeAbortRef.current = null;
      }
      if (addressAbortRef.current) {
        addressAbortRef.current.abort();
        addressAbortRef.current = null;
      }
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
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">AI Smart Contract Security Assistant</h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Give the assistant Solidity code, a file, or contract address and get an actionable security report.
        </p>
        <p className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {agentMessage}
        </p>
        <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={beginnerMode}
            onChange={(e) => setBeginnerMode(e.target.checked)}
            className="h-4 w-4 rounded border-slate-500 bg-slate-900"
          />
          Beginner mode
        </label>
      </motion.section>

      <InputPanel
        inputMode={inputMode}
        value={code}
        address={address}
        githubUrl={githubUrl}
        onChange={handleCodeChange}
        onAddressChange={handleAddressChange}
        onGithubUrlChange={handleGithubUrlChange}
        onFileUpload={handleFileUpload}
        onAnalyze={handleAnalyze}
        onLoadExample={handleLoadExample}
        onClear={handleClear}
        loading={loading || fetching}
        fetching={fetching}
        error={error}
      />

      {(loading || fetching) && <Loader message={fetching ? "Fetching contract source..." : "Analyzing contract..."} />}

      {!loading && result && (
        <div ref={resultsRef} className="max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
          <FeatureHandler
            selectedFeature={selectedFeature}
            thinking={featureThinking}
            analysisMs={analysisMs}
            sections={displayedSections}
          >
            {(filteredSections) => (
              <OutputPanel
                sections={filteredSections}
                severity={result.severity}
                riskScore={result.riskScore}
                rawReport={result.report}
                sourceMeta={result.sourceMeta}
                sourceValidation={result.sourceValidation}
                onReset={handleClear}
              />
            )}
          </FeatureHandler>
        </div>
      )}
    </div>
  );
}
