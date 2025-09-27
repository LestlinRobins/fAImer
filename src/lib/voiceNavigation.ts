// Voice navigation utilities using WebLLM for robust intent parsing
// Uses WebLLM for lightweight, browser-native AI inference with WebGPU acceleration
// Includes keyword fallback for maximum reliability

type WebLLMModule = typeof import("@mlc-ai/web-llm");

let webLLMModulePromise: Promise<WebLLMModule> | null = null;

async function loadWebLLMModule(): Promise<WebLLMModule> {
  if (!webLLMModulePromise) {
    webLLMModulePromise = (async () => {
      try {
        return await import("@mlc-ai/web-llm");
      } catch (npmError) {
        console.warn(
          "⚠️ Failed to import @mlc-ai/web-llm via bundler, falling back to CDN",
          npmError
        );
        // eslint-disable-next-line no-eval
        const fallbackModule = (await (0, eval)(
          "import('https://esm.run/@mlc-ai/web-llm')"
        )) as WebLLMModule;
        return fallbackModule;
      }
    })();
  }

  return webLLMModulePromise;
}

const MODEL_PREFERENCE_ORDER = ["Llama-3.2-1B-Instruct-q4f32_1-MLC"];

const MODEL_LOAD_TIMEOUT_MS = 20000000;

export type VoiceDecision = {
  action: "navigate" | "chat" | "weather" | "popup" | "tab";
  targetId: string | null; // one of known feature IDs when action === 'navigate'
  subAction?: string; // specific tab, popup, or sub-feature to open
  confidence: number; // 0..1
  reason?: string;
  language?: string;
  queryNormalized?: string;
};

// Known feature IDs used across the app (must match Index.tsx cases)
export const KNOWN_FEATURE_IDS = [
  "home",
  "twin",
  "diagnose",
  "planner",
  "knowledge",
  "expense",
  "weather",
  "farmer-assistant",
  "chatbot",
  "alerts",
  "news",
  "forum",
  "schemes",
  "buy-inputs",
  "history",
];

// WebLLM setup for reliable browser LLM inference
let webLLMEngine: any = null;
let activeModelId: string | null = null;
let isLLMLoading = false;
let llmLoadPromise: Promise<boolean> | null = null;
let loadingProgressCallback:
  | ((progress: { text: string; percentage: number }) => void)
  | null = null;

function emitProgress(text: string, percentage: number) {
  if (loadingProgressCallback) {
    loadingProgressCallback({
      text,
      percentage: Math.min(100, Math.max(0, Math.round(percentage))),
    });
  }
}

async function reloadModelWithTimeout(
  engine: any,
  modelId: string,
  config: Record<string, unknown>,
  timeoutMs: number
) {
  let timeoutHandle: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(
        new Error(
          `Model load timeout after ${timeoutMs / 1000}s for ${modelId}`
        )
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([engine.reload(modelId, config), timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

// Initialize the WebLLM engine (lightweight text generation model)
export async function initOfflineLLM(
  onProgress?: (progress: { text: string; percentage: number }) => void
): Promise<boolean> {
  if (webLLMEngine) {
    console.log("✅ WebLLM already initialized");
    return true;
  }

  if (isLLMLoading && llmLoadPromise) {
    if (onProgress) {
      loadingProgressCallback = onProgress;
    }
    return llmLoadPromise;
  }

  isLLMLoading = true;
  loadingProgressCallback = onProgress ? onProgress : null;
  console.log("🤖 Initializing WebLLM for voice navigation...");
  emitProgress("Preparing AI model...", 0);

  llmLoadPromise = (async () => {
    try {
      const webllm = await loadWebLLMModule();
      const availableModelIds = webllm.prebuiltAppConfig.model_list.map(
        (m) => m.model_id
      );

      const candidates: string[] = MODEL_PREFERENCE_ORDER.filter((modelId) =>
        availableModelIds.includes(modelId)
      );

      if (!candidates.length) {
        candidates.push(...availableModelIds.slice(0, 3));
      }

      if (!candidates.length) {
        throw new Error("No WebLLM models available in prebuilt config");
      }

      if (!webLLMEngine) {
        webLLMEngine = new webllm.MLCEngine();
      }

      let loadedModel: string | null = null;
      let lastError: unknown = null;

      for (const modelId of candidates) {
        try {
          const friendlyName = modelId.replace(/-/g, " ");
          emitProgress(`Downloading ${friendlyName}...`, 10);

          webLLMEngine.setInitProgressCallback((report: any) => {
            if (report) {
              const progress = Math.min(
                95,
                10 + ((report.progress ?? 0) as number) * 80
              );
              emitProgress(
                report.text ?? `Downloading ${friendlyName}...`,
                progress
              );
            }
          });

          await reloadModelWithTimeout(
            webLLMEngine,
            modelId,
            {
              temperature: 0.1,
              top_p: 0.8,
            },
            MODEL_LOAD_TIMEOUT_MS
          );

          loadedModel = modelId;
          activeModelId = modelId;
          break;
        } catch (modelError) {
          lastError = modelError;
          console.warn(`⚠️ Model ${modelId} failed to load:`, modelError);
          emitProgress(`Model ${modelId} unavailable, trying fallback...`, 30);
        }
      }

      if (!loadedModel) {
        throw lastError ?? new Error("All WebLLM models failed to load");
      }

      emitProgress("AI model ready!", 100);
      console.log(`✅ WebLLM initialized successfully with ${loadedModel}`);
      return true;
    } catch (error) {
      console.error("❌ WebLLM initialization failed:", error);
      emitProgress("AI model unavailable - using keyword fallback", 100);
      webLLMEngine = null;
      activeModelId = null;
      return false;
    } finally {
      isLLMLoading = false;
      loadingProgressCallback = null;
    }
  })();

  return llmLoadPromise;
}

// Utility function to clear corrupted model cache
export async function clearModelCache(): Promise<void> {
  console.log("🗑️ Clearing AI model cache...");

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      let cleared = 0;

      for (const cacheName of cacheNames) {
        if (
          cacheName.includes("huggingface") ||
          cacheName.includes("transformers") ||
          cacheName.includes("mlc") ||
          cacheName.includes("webllm") ||
          cacheName.includes("xenova")
        ) {
          await caches.delete(cacheName);
          cleared++;
          console.log(`✅ Cleared cache: ${cacheName}`);
        }
      }

      if (cleared > 0) {
        console.log(`✅ Cleared ${cleared} AI model cache(s)`);
      } else {
        console.log("ℹ️ No AI model cache found to clear");
      }
    }

    // Also clear localStorage entries related to models
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("huggingface") ||
          key.includes("transformers") ||
          key.includes("mlc") ||
          key.includes("webllm"))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared localStorage: ${key}`);
    });

    // Reset WebLLM state
    webLLMEngine = null;
    activeModelId = null;
    isLLMLoading = false;
    llmLoadPromise = null;

    console.log("✅ Model cache cleared successfully!");
  } catch (error) {
    console.error("❌ Failed to clear model cache:", error);
  }
}

// Check if WebLLM is ready
export function isOfflineLLMReady(): boolean {
  return webLLMEngine !== null && !isLLMLoading;
}

// Get LLM loading status for UI
export function getOfflineLLMStatus(): {
  ready: boolean;
  loading: boolean;
  error: boolean;
  mode: "ai" | "keywords" | "loading" | "error";
  statusText: string;
  modelId: string | null;
} {
  const ready = webLLMEngine !== null && !isLLMLoading;
  const loading = isLLMLoading;
  const error = webLLMEngine === null && !isLLMLoading;

  let mode: "ai" | "keywords" | "loading" | "error" = "keywords";
  let statusText = "Using keyword matching";

  if (loading) {
    mode = "loading";
    statusText = "Loading AI model...";
  } else if (ready) {
    mode = "ai";
    statusText = activeModelId
      ? `AI ready (${activeModelId})`
      : "AI ready - natural language understanding";
  } else if (error) {
    mode = "error";
    statusText = "AI failed to load - using keywords";
  }

  return { ready, loading, error, mode, statusText, modelId: activeModelId };
}

// Use WebLLM to parse intent with structured prompt
async function callOfflineLLMForIntent(
  transcript: string,
  language: string = "english"
): Promise<VoiceDecision> {
  if (!webLLMEngine) {
    throw new Error("WebLLM not initialized");
  }

  const structuredPrompt = `You are an expert AI assistant for the farming app fAImer. Your primary skill is to understand a farmer's underlying goal or intent, even when asked indirectly, and map it to the most relevant app feature.

## Instructions
1.  **Analyze the Goal:** First, think step-by-step about what the user is trying to accomplish.
2.  **Choose a Feature:** Select the SINGLE best "targetId" from the list below that helps the user achieve their goal.
3.  **Be Precise:** The "targetId" MUST be one of the listed IDs or \`null\` if the intent is completely unclear or conversational.
4.  **Respond with ONLY the valid JSON object.**

## Available Features
- **home**: Main dashboard.
- **twin**: Get crop recommendations or farming advice.
- **diagnose**: Identify a disease or pest problem with a crop.
- **planner**: Plan future crops, schedules, and activities.
- **knowledge**: Look up information in the agricultural knowledge base.
- **expense**: Track or review farming costs and expenses.
- **weather**: Get weather information and forecasts.
- **farmer-assistant**: General AI chat for farming questions.
- **chatbot**: General conversational AI chat.
- **alerts**: Check notifications and warnings.
- **news**: Read agricultural news.
- **forum**: Connect with the farmer community.
- **schemes**: Find information on government support and schemes.
- **buy-inputs**: Purchase seeds, fertilizers, etc.
- **history**: Review past activity.

---
## Examples of Understanding Intent

### Example 1
User command: "The leaves on my plants have yellow spots, what's wrong?"
Language: english
Correct JSON Output:
{
  "action": "navigate",
  "targetId": "diagnose",
  "confidence": 0.95,
  "reason": "The user is describing a symptom of a sick plant, which maps to the 'diagnose' feature."
}

### Example 2
User command: "What's a good crop to put in after the monsoon?"
Language: english
Correct JSON Output:
{
  "action": "navigate",
  "targetId": "planner",
  "confidence": 0.9,
  "reason": "The user is asking about future planting, which is handled by the 'planner' feature."
}

### Example 3
User command: "How much did I spend on fertilizer last month?"
Language: english
Correct JSON Output:
{
  "action": "navigate",
  "targetId": "expense",
  "confidence": 0.98,
  "reason": "The user is asking a question about past spending, which is found in the 'expense' tracker."
}

### Example 4
User command: "Is there any new help from the government for us?"
Language: english
Correct JSON Output:
{
  "action": "navigate",
  "targetId": "schemes",
  "confidence": 0.9,
  "reason": "The user is asking about government help, which maps to the 'schemes' feature."
}
---

## Your Turn
User command: "${transcript}"
Language: ${language}

JSON Output:
`;
  try {
    const response = await webLLMEngine.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful voice navigation assistant. Always respond with valid JSON only.",
        },
        { role: "user", content: structuredPrompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from WebLLM");
    }

    // Try to parse JSON from the response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      action: parsed.action || "navigate",
      targetId: parsed.targetId,
      confidence: parsed.confidence || 0.5,
      reason: parsed.reason || "AI parsing",
      language,
      queryNormalized: transcript.toLowerCase().trim(),
    };
  } catch (error) {
    console.error("❌ WebLLM parsing error:", error);
    throw error;
  }
}

// Comprehensive keyword matching with multilingual support (fallback)
function getKeywordBasedDecision(
  transcript: string,
  language: string
): VoiceDecision {
  const query = transcript.toLowerCase().trim();

  // English keywords
  const englishKeywords: Record<string, string[]> = {
    home: ["home", "main", "dashboard", "start"],
    twin: ["twin", "recommendation", "suggest", "advice", "crop advice"],
    diagnose: ["diagnose", "disease", "pest", "problem", "sick", "issue"],
    planner: ["plan", "schedule", "calendar", "timing", "when"],
    knowledge: ["knowledge", "learn", "information", "guide", "help"],
    expense: ["expense", "cost", "money", "budget", "spend", "track"],
    weather: ["weather", "rain", "temperature", "forecast", "climate"],
    "farmer-assistant": ["assistant", "help", "support", "question"],
    chatbot: ["chat", "talk", "conversation"],
    alerts: ["alert", "notification", "warning", "reminder"],
    news: ["news", "update", "article", "information"],
    forum: ["forum", "community", "discuss", "farmer", "talk"],
    schemes: ["scheme", "government", "subsidy", "benefit", "support"],
    "buy-inputs": ["buy", "purchase", "seed", "fertilizer", "input"],
    history: ["history", "past", "previous", "record"],
  };

  // Malayalam keywords
  const malayalamKeywords: Record<string, string[]> = {
    home: ["ഹോം", "മുഖ്യം", "ആരംഭം", "പ്രധാന"],
    twin: ["ട്വിൻ", "നിർദ്ദേശം", "ഉപദേശം", "വിള ഉപദേശം"],
    diagnose: ["രോഗനിർണയം", "രോഗം", "പ്രശ്നം", "അസുഖം"],
    planner: ["പ്ലാൻ", "ഷെഡ്യൂൾ", "കലണ്ടർ", "സമയം"],
    knowledge: ["അറിവ്", "പഠനം", "വിവരം", "ഗൈഡ്"],
    expense: ["ചെലവ്", "പണം", "ബജറ്റ്", "ട്രാക്ക്"],
    weather: ["കാലാവസ്ഥ", "മഴ", "താപനില", "പ്രവചനം"],
    "farmer-assistant": ["അസിസ്റ്റന്റ്", "സഹായം", "പിന്തുണ"],
    chatbot: ["ചാറ്റ്", "സംസാരം", "സംഭാഷണം"],
    alerts: ["അലേർട്ട്", "അറിയിപ്പ്", "മുന്നറിയിപ്പ്"],
    news: ["വാർത്ത", "അപ്ഡേറ്റ്", "വിവരം"],
    forum: ["ഫോറം", "കമ്മ്യൂണിറ്റി", "ചർച്ച"],
    schemes: ["സ്കീം", "ഗവൺമെന്റ്", "സബ്സിഡി"],
    "buy-inputs": ["വാങ്ങുക", "വിത്ത്", "വളം"],
    history: ["ചരിത്രം", "മുൻകാലം", "റെക്കോർഡ്"],
  };

  const keywords =
    language === "malayalam" ? malayalamKeywords : englishKeywords;

  // Find best match
  let bestMatch = "";
  let bestScore = 0;

  for (const [feature, featureKeywords] of Object.entries(keywords)) {
    for (const keyword of featureKeywords) {
      if (query.includes(keyword)) {
        const score = keyword.length / query.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = feature;
        }
      }
    }
  }

  return {
    action: "navigate",
    targetId: bestMatch || null,
    confidence: bestScore > 0 ? Math.min(0.8, bestScore * 2) : 0.1,
    reason: bestMatch ? `Keyword match: ${bestMatch}` : "No clear match found",
    language,
    queryNormalized: query,
  };
}

// Main routing function with LLM + keyword fallback
export async function routeFromTranscript(
  transcript: string,
  language: string = "english"
): Promise<VoiceDecision> {
  console.log(`🎤 Voice routing: "${transcript}" (${language})`);

  // Always try keyword matching first as it's fast and reliable
  const keywordDecision = getKeywordBasedDecision(transcript, language);

  // If WebLLM is available and keyword confidence is low, try AI parsing
  if (webLLMEngine && keywordDecision.confidence < 0.6) {
    try {
      console.log("🤖 Using WebLLM for intent parsing...");
      const llmDecision = await callOfflineLLMForIntent(transcript, language);

      // Use LLM result if it has higher confidence
      if (llmDecision.confidence > keywordDecision.confidence) {
        console.log(
          `✅ WebLLM decision: ${llmDecision.targetId} (${(llmDecision.confidence * 100).toFixed(0)}%)`
        );
        return llmDecision;
      }
    } catch (error) {
      console.warn("⚠️ WebLLM failed, using keyword fallback:", error);
    }
  }

  console.log(
    `📝 Keyword decision: ${keywordDecision.targetId} (${(keywordDecision.confidence * 100).toFixed(0)}%)`
  );
  return keywordDecision;
}
