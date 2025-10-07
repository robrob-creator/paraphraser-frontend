import { useState, useEffect, useRef } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { motion } from "framer-motion";
import {
  FileText,
  Wand2,
  Copy,
  RefreshCw,
  Zap,
  BarChart3,
  Sparkles,
  Moon,
  Sun,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Declare AdSense global
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// AdBanner Component using Google AdSense (robust: waits for container size, sets explicit small banner sizes)
const AdBanner = ({ adSlot }: { adSlot: string }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adStatus, setAdStatus] = useState<'idle' | 'pushed' | 'error'>('idle');
  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    let pushed = false;
    const current = adRef.current;

    const setInsSizeAndPush = (insEl: HTMLElement, containerWidth: number) => {
      // Choose a sensible banner height based on available width
      // mobile: 320x50, small tablet: 468x60, desktop: 728x90
      const width = Math.floor(containerWidth);
      let height = 50;
      if (width >= 728) height = 90;
      else if (width >= 468) height = 60;

      // Apply inline sizes so AdSense has a concrete slot
      try {
        insEl.style.display = "block";
        insEl.style.width = `${Math.max(320, Math.min(width, 1024))}px`;
        insEl.style.height = `${height}px`;
      } catch {
        // ignore styling errors
      }

      try {
        if (!pushed && typeof window !== "undefined" && window.adsbygoogle) {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          pushed = true;
          setAdStatus('pushed');
        }
      } catch (err) {
        console.log("AdSense push error:", err);
        setAdStatus('error');
      }
    };

    const loadAd = () => {
      const container = current || adRef.current;
      if (!container) return;
      const insEl = container.querySelector(
        "ins.adsbygoogle"
      ) as HTMLElement | null;
      if (!insEl) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setInsSizeAndPush(insEl, rect.width);
      }
    };

    // IntersectionObserver: only attempt to load once visible
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadAd();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 }
    );

    if (current) io.observe(current);

    // ResizeObserver fallback to handle layout changes / responsive widths
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && current) {
      ro = new ResizeObserver(() => {
        // If not yet pushed, try to load again when size changes
        if (!pushed) loadAd();
      });
      ro.observe(current);
    }

    // Window resize fallback
    const onResize = () => {
      if (!pushed) loadAd();
    };
    window.addEventListener("resize", onResize);

    // Small timeout retry in case element gets sized after initial paint
    const retryTimer = setTimeout(() => {
      if (!pushed) loadAd();
    }, 500);

    return () => {
      io.disconnect();
      if (ro && current) ro.unobserve(current);
      window.removeEventListener("resize", onResize);
      clearTimeout(retryTimer);
    };
  }, [adSlot]);

  return (
    <div
      ref={adRef}
      className="ad-container w-full flex justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2"
    >
      <div className="relative w-full">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-5125116027192105"
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          {...(isDev ? { 'data-adtest': 'on' } : {})}
        />
        {isDev && (
          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
            Ad:{adStatus}
          </div>
        )}
      </div>
    </div>
  );
};

const paraphraseStyles = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "creative", label: "Creative" },
  { value: "academic", label: "Academic" },
];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("creative");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [alternativeVersions, setAlternativeVersions] = useState<string[]>([]);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [characterCount, setCharacterCount] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Initialize AdMob
  useEffect(() => {
    const initAdMob = async () => {
      if (typeof window !== "undefined") {
        // AdSense is already loaded in _document.tsx
        // Just ensure ads are initialized
        try {
          // Small delay to ensure script is loaded
          setTimeout(() => {
            if (window.adsbygoogle) {
              console.log("AdSense ready");
            }
          }, 1000);
        } catch (error) {
          console.log("AdSense initialization error:", error);
        }
      }
    };

    initAdMob();
  }, []);

  // Check for dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setIsDarkMode(savedTheme === "dark" || (!savedTheme && prefersDark));
  }, []);

  const toggleDarkMode = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  const handleParaphrase = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to paraphrase");
      return;
    }

    setIsLoading(true);
    setError("");
    setConfidenceScore(null);
    setAlternativeVersions([]);
    setProcessingTime(null);
    setWordCount(null);
    setCharacterCount(null);

    try {
      const response = await fetch(
        "https://web-production-61c7.up.railway.app/paraphrase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: inputText,
            style: selectedStyle,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API Response:", data); // Debug log to see actual response structure

      // Handle both possible response formats
      setOutputText(
        data.paraphrasedText || data.paraphrased_text || data.text || ""
      );
      setConfidenceScore(data.confidence || data.confidence_score || 0);
      setAlternativeVersions(
        data.alternativeVersions ||
          data.alternatives ||
          data.alternative_versions ||
          []
      );
      setProcessingTime(data.processingTime || data.processing_time || 0);
      setWordCount(data.wordCount || data.word_count || 0);
      setCharacterCount(data.characterCount || data.character_count || 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while paraphrasing"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setError("");
    setConfidenceScore(null);
    setAlternativeVersions([]);
    setProcessingTime(null);
    setWordCount(null);
    setCharacterCount(null);
  };

  const handleCopyOutput = async (text: string, type: string = "output") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleTestSample = () => {
    // Simulate a sample paraphrase response
    const sampleResponse = {
      paraphrased_text:
        "Testing this feature for today's daily task, I'll be including this in the report.",
      confidence_score: 0.85,
      alternatives: [
        "I'm testing this feature for today's daily task and will include it in the report.",
        "This feature is being tested for today's daily task, and it will be added to the report.",
      ],
      processing_time: 0.5,
      word_count: 14,
      character_count: 79,
    };

    setInputText(
      "Testing this feature for todays daily task I'll be including this in the report"
    );
    setOutputText(sampleResponse.paraphrased_text);
    setConfidenceScore(sampleResponse.confidence_score);
    setAlternativeVersions(sampleResponse.alternatives);
    setProcessingTime(sampleResponse.processing_time);
    setWordCount(sampleResponse.word_count);
    setCharacterCount(sampleResponse.character_count);
  };

  return (
    <div
      className={`${geistSans.variable} ${
        geistMono.variable
      } font-sans min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Text Paraphraser
            </h1>
          </div>
          <p
            className={`text-lg ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Transform your writing with advanced AI-powered paraphrasing
          </p>
        </motion.div>

        {/* Top Banner Ad */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <AdBanner adSlot="5908540367" />
        </motion.div>

        {/* Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Style:
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                {paraphraseStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        >
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Original Text
                  </h2>
                </div>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    inputText.length > 800
                      ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                      : inputText.length > 600
                      ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                      : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                  }`}
                >
                  {inputText.length}/1000
                </span>
              </div>
            </div>
            <div className="p-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter your text here to paraphrase... ✨"
                className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                maxLength={1000}
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Paraphrased Text
                  </h2>
                </div>
                {outputText && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCopyOutput(outputText, "output")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      copiedText === "output"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800"
                    }`}
                  >
                    {copiedText === "output" ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 overflow-y-auto transition-colors">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader2 className="w-8 h-8 text-blue-500" />
                    </motion.div>
                    <p className="text-gray-500 dark:text-gray-400">
                      AI is working its magic...
                    </p>
                  </div>
                ) : outputText ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-800 dark:text-white whitespace-pre-wrap leading-relaxed"
                  >
                    {outputText}
                  </motion.p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Wand2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Your paraphrased text will appear here...
                    </p>
                  </div>
                )}
              </div>

              {/* Statistics */}
              {(confidenceScore !== null ||
                processingTime !== null ||
                wordCount !== null ||
                characterCount !== null) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Analysis
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {confidenceScore !== null && (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Confidence:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {(confidenceScore * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {processingTime !== null && (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Time:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {processingTime}s
                        </span>
                      </div>
                    )}
                    {wordCount !== null && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Words:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {wordCount}
                        </span>
                      </div>
                    )}
                    {characterCount !== null && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Chars:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {characterCount}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Alternative Versions */}
        {alternativeVersions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Alternative Versions
              </h2>
            </div>
            <div className="space-y-4">
              {alternativeVersions.map((alternative, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border">
                      Option {index + 1}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        handleCopyOutput(alternative, `alt-${index}`)
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        copiedText === `alt-${index}`
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:hover:bg-blue-800"
                      }`}
                    >
                      {copiedText === `alt-${index}` ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </motion.button>
                  </div>
                  <p className="text-gray-800 dark:text-white leading-relaxed">
                    {alternative}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 dark:bg-red-900 dark:border-red-800 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleParaphrase}
            disabled={isLoading || !inputText.trim()}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Paraphrasing...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Paraphrase Text
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClear}
            className="px-8 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            Clear All
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTestSample}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 focus:ring-4 focus:ring-green-500/50 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Try Sample
          </motion.button>
        </motion.div>

        {/* Bottom Banner Ad */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mb-8"
        >
          <AdBanner adSlot="5908540367" />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span>
              Powered by Advanced AI • Built with Next.js & Tailwind CSS
            </span>
          </div>
          <p className="text-xs">
            Transform your writing with AI-powered paraphrasing technology
          </p>
        </motion.div>
      </div>
    </div>
  );
}
