import React, { useState, useEffect } from "react";
import {
  initOfflineLLM,
  getOfflineLLMStatus,
  isOfflineLLMReady,
  routeFromTranscript,
  clearModelCache,
} from "../lib/voiceNavigation";

interface AIVoiceButtonProps {
  currentLanguage: string;
  isListening: boolean;
  isNavigating: boolean;
  onVoiceInput: () => void;
  onVoiceResult: (transcript: string) => Promise<void>;
}

interface AIProgress {
  text: string;
  percentage: number;
}

export const AIVoiceButton: React.FC<AIVoiceButtonProps> = ({
  currentLanguage,
  isListening,
  isNavigating,
  onVoiceInput,
  onVoiceResult,
}) => {
  const [aiStatus, setAiStatus] = useState(() => getOfflineLLMStatus());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [aiProgress, setAiProgress] = useState<AIProgress>({
    text: "",
    percentage: 0,
  });
  const [autoInitAttempted, setAutoInitAttempted] = useState(false);

  // Update AI status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = getOfflineLLMStatus();
      setAiStatus(newStatus);

      // Show toast when AI becomes ready
      if (newStatus.ready && !aiStatus.ready) {
        showToastNotification(
          "🤖 AI Ready! Natural language understanding enabled"
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [aiStatus.ready]);

  // Auto-initialize AI on first load (with user's permission)
  useEffect(() => {
    const initAI = async () => {
      if (!autoInitAttempted) {
        setAutoInitAttempted(true);

        // Check if user has used voice before or prefers auto-init
        const hasUsedVoice = localStorage.getItem("hasUsedVoiceNavigation");
        const autoInitPreference =
          localStorage.getItem("autoInitAI") !== "false"; // Default true

        if (hasUsedVoice && autoInitPreference) {
          await initializeAI();
        }
      }
    };

    initAI();
  }, [autoInitAttempted]);

  const initializeAI = async (retryCount = 0) => {
    console.log("🚀 Initializing AI voice navigation...");
    showToastNotification("🤖 Loading AI model for smart voice navigation...");

    try {
      const success = await initOfflineLLM((progress) => {
        setAiProgress(progress);

        // Show progress updates in toast
        if (progress.percentage > 0) {
          const progressText = `${progress.text} (${Math.round(progress.percentage)}%)`;
          setToastMessage(progressText);
        }
      });

      if (success) {
        console.log("✅ AI model loaded successfully!");
        showToastNotification("🎉 AI Ready! You can now use natural language");
      } else {
        console.log("⚠️ AI model failed to load, using keyword mode");
        showToastNotification("📝 Using keyword mode for voice navigation");
      }
    } catch (error) {
      console.error("❌ AI initialization error:", error);

      // If this is the first failure and it looks like a JSON parse error, try clearing cache
      if (
        retryCount === 0 &&
        error instanceof Error &&
        (error.message.includes("JSON.parse") ||
          error.message.includes("unexpected character"))
      ) {
        console.log("🔄 Detected corrupted cache, clearing and retrying...");
        showToastNotification("🔄 Clearing corrupted files, retrying...");

        try {
          await clearModelCache();
          // Wait a bit before retrying
          setTimeout(() => {
            initializeAI(1); // Retry once
          }, 2000);
          return;
        } catch (clearError) {
          console.error("❌ Failed to clear cache:", clearError);
        }
      }

      // Show appropriate error message
      if (retryCount > 0) {
        showToastNotification(
          "⚠️ AI loading failed after retry - using keywords"
        );
      } else {
        showToastNotification(
          "⚠️ AI loading failed - using basic voice commands"
        );
      }
    }
  };

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  const handleVoiceClick = async () => {
    // Mark that user has used voice navigation
    localStorage.setItem("hasUsedVoiceNavigation", "true");

    // Initialize AI if not done yet
    if (!aiStatus.ready && !aiStatus.loading) {
      initializeAI();
    }

    // Proceed with voice input
    onVoiceInput();
  };

  const dismissToast = () => {
    setShowToast(false);
  };

  const getStatusIcon = () => {
    switch (aiStatus.mode) {
      case "ai":
        return "🧠";
      case "loading":
        return "⏳";
      case "keywords":
        return "📝";
      case "error":
        return "⚠️";
      default:
        return "🎤";
    }
  };

  const getStatusColor = () => {
    switch (aiStatus.mode) {
      case "ai":
        return "#4caf50"; // Green
      case "loading":
        return "#ff9800"; // Orange
      case "keywords":
        return "#2196f3"; // Blue
      case "error":
        return "#f44336"; // Red
      default:
        return "#666";
    }
  };

  return (
    <div className="ai-voice-container">
      {/* Main Voice Button */}
      <div className="voice-button-wrapper">
        <button
          onClick={handleVoiceClick}
          disabled={isListening || isNavigating}
          className={`voice-button ${isListening ? "listening" : ""} ${isNavigating ? "navigating" : ""}`}
          aria-label={
            currentLanguage === "malayalam"
              ? "ശബ്ദ നാവിഗേഷൻ"
              : "Voice Navigation"
          }
        >
          <div className="button-content">
            <span className="voice-icon">{isListening ? "🎙️" : "🎤"}</span>
            <span className="button-text">
              {currentLanguage === "malayalam" ? "ശബ്ദം" : "Voice"}
            </span>
          </div>
        </button>

        {/* AI Status Indicator */}
        <div
          className="ai-status-indicator"
          style={{ backgroundColor: getStatusColor() }}
          title={aiStatus.statusText}
        >
          <span className="status-icon">{getStatusIcon()}</span>
          {aiStatus.loading && <div className="loading-spinner"></div>}
        </div>
      </div>

      {/* Progress Bar (when loading) */}
      {aiStatus.loading && aiProgress.percentage > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${aiProgress.percentage}%` }}
            ></div>
          </div>
          <span className="progress-text">
            {aiProgress.text} ({Math.round(aiProgress.percentage)}%)
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast-notification ${showToast ? "show" : ""}`}>
          <div className="toast-content">
            <span className="toast-message">{toastMessage}</span>
            <button
              className="toast-dismiss"
              onClick={dismissToast}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="toast-progress">
            <div className="toast-progress-bar"></div>
          </div>
        </div>
      )}

      <style>{`
        .ai-voice-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .voice-button-wrapper {
          position: relative;
          display: inline-block;
        }

        .voice-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50px;
          padding: 15px 30px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          min-width: 120px;
        }

        .voice-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .voice-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .voice-button.listening {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          animation: pulse 1.5s infinite;
        }

        .voice-button.navigating {
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        }

        .button-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .voice-icon {
          font-size: 20px;
        }

        .ai-status-indicator {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 2px solid white;
        }

        .status-icon {
          font-size: 14px;
        }

        .loading-spinner {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .progress-container {
          width: 200px;
          text-align: center;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #2196f3);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 12px;
          color: #666;
        }

        .toast-notification {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 280px;
          max-width: 400px;
          opacity: 0;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .toast-notification.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .toast-content {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .toast-message {
          font-size: 14px;
          color: #333;
          flex: 1;
          margin-right: 10px;
        }

        .toast-dismiss {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        }

        .toast-dismiss:hover {
          background-color: #f0f0f0;
        }

        .toast-progress {
          height: 3px;
          background: #f0f0f0;
          position: relative;
        }

        .toast-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #2196f3);
          width: 0%;
          animation: toast-progress 4s linear forwards;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes toast-progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* Mobile responsiveness */
        @media (max-width: 480px) {
          .toast-notification {
            left: 20px;
            right: 20px;
            transform: translateY(100px);
            min-width: auto;
            max-width: none;
          }

          .toast-notification.show {
            transform: translateY(0);
          }

          .progress-container {
            width: 160px;
          }
        }
      `}</style>
    </div>
  );
};

export default AIVoiceButton;
