export interface AICallResult {
  text: string;
  latencyMs: number;
  retryCount: number;
  timeoutCount: number;
}

export interface AIKeys {
  geminiApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
  openrouterApiKey?: string;
}

export async function callAI(
  prompt: string,
  provider: string,
  keys: AIKeys,
  timeoutMs: number = 25000
): Promise<AICallResult> {
  const normalizedProvider = provider.toLowerCase();
  const startTime = Date.now();
  let retryCount = 0;
  let timeoutCount = 0;
  const maxRetries = 3;
  const backoffs = [1000, 2000, 4000];

  // --- GEMINI PROVIDER ---
  if (normalizedProvider === "gemini") {
    const apiKey = keys.geminiApiKey;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set.");
    }

    let model = "gemini-2.5-pro";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
            "Connection": "close",
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // Request JSON output format for structured scanning compatibility
            generationConfig: {
              responseMimeType: "application/json"
            }
          }),
        });

        clearTimeout(id);

        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();

          // If the model is not found or key doesn't support it, fall back to gemini-2.5-flash immediately
          if ((status === 404 || status === 400) && model === "gemini-2.5-pro") {
            console.warn(`Gemini model ${model} not available (status ${status}). Falling back to gemini-2.5-flash...`);
            model = "gemini-2.5-flash";
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            if (attempt < maxRetries) {
              retryCount++;
              continue;
            }
          }

          // Do NOT retry on standard authentication or bad request errors
          if ([401, 403].includes(status)) {
            throw new Error(`Gemini non-retryable error: ${status} - ${errorText}`);
          }

          // Retry on server errors or rate limit (429)
          if ([429, 500, 502, 503, 504].includes(status)) {
            if (attempt < maxRetries) {
              retryCount++;
              const delay = backoffs[attempt];
              console.log(`Gemini HTTP error ${status}. Retrying in ${delay}ms...`);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
          }
          throw new Error(`Gemini error: ${status} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("Gemini returned empty or invalid response structure");
        }

        return {
          text,
          latencyMs: Date.now() - startTime,
          retryCount,
          timeoutCount,
        };
      } catch (err: any) {
        clearTimeout(id);
        const isTimeout = err.name === "AbortError" || err.message?.toLowerCase().includes("timeout");

        if (isTimeout) {
          timeoutCount++;
        }

        const isRetryable = isTimeout || !err.message?.includes("non-retryable");

        if (isRetryable && attempt < maxRetries) {
          retryCount++;
          const delay = backoffs[attempt];
          console.log(`Gemini ${isTimeout ? "Timeout" : "Connection error"}: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Gemini call failed after maximum retries");
  }

  // --- OPENAI, DEEPSEEK, OPENROUTER (OpenAI-Compatible Providers) ---
  let apiUrl = "";
  let apiKey = "";
  let model = "";

  if (normalizedProvider === "openai") {
    apiKey = keys.openaiApiKey || "";
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    apiUrl = "https://api.openai.com/v1/chat/completions";
    model = "gpt-4o";
  } else if (normalizedProvider === "deepseek") {
    apiKey = keys.deepseekApiKey || keys.openaiApiKey || ""; // fallback to openai key if needed
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not set.");
    }
    apiUrl = "https://api.deepseek.com/chat/completions";
    model = "deepseek-reasoner"; // Use DeepSeek-R1 reasoning model
  } else if (normalizedProvider === "openrouter") {
    apiKey = keys.openrouterApiKey || keys.openaiApiKey || "";
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set.");
    }
    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    model = "anthropic/claude-3.5-sonnet"; // Default to Claude 3.5 Sonnet on OpenRouter
  } else {
    // Treat as custom OpenAI compatible endpoint if provider starts with url
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Connection": "close",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }, // Request structured JSON
          temperature: 0.2, // Lower temperature for more stable JSON parsing
        }),
      });

      clearTimeout(id);

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();

        // Model not found fallbacks
        if ((status === 404 || status === 400) && model === "gpt-4o") {
          console.warn("gpt-4o not available. Falling back to gpt-4o-mini...");
          model = "gpt-4o-mini";
          if (attempt < maxRetries) {
            retryCount++;
            continue;
          }
        }
        if ((status === 404 || status === 400) && model === "deepseek-reasoner") {
          console.warn("deepseek-reasoner not available. Falling back to deepseek-chat...");
          model = "deepseek-chat";
          if (attempt < maxRetries) {
            retryCount++;
            continue;
          }
        }

        // Retry on server-side rate limit or temporary error
        if ([429, 500, 502, 503, 504].includes(status)) {
          if (attempt < maxRetries) {
            retryCount++;
            const delay = backoffs[attempt];
            console.log(`${provider} HTTP error ${status}. Retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
        }

        throw new Error(`${provider} API error: ${status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      return {
        text,
        latencyMs: Date.now() - startTime,
        retryCount,
        timeoutCount,
      };
    } catch (err: any) {
      clearTimeout(id);
      const isTimeout = err.name === "AbortError" || err.message?.toLowerCase().includes("timeout");

      if (isTimeout) {
        timeoutCount++;
      }

      if (isTimeout && attempt < maxRetries) {
        retryCount++;
        const delay = backoffs[attempt];
        console.log(`${provider} Timeout. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`${provider} call failed after maximum retries`);
}
