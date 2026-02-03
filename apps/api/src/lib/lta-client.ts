/**
 * LTA DataMall API client
 * Handles authenticated requests to LTA endpoints
 */

const LTA_BASE_URL = "https://datamall2.mytransport.sg";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

function getApiKey(): string {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  if (!apiKey) {
    throw new Error("LTA_DATAMALL_API_KEY environment variable is not set");
  }
  return apiKey;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function parseRetryAfterMs(headers: Headers): number | null {
  const value = headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return null;
}

export async function fetchFromLTA<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint, LTA_BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  let lastErrorMessage = "Unknown error";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetchWithTimeout(url.toString(), {
        headers: {
          AccountKey: getApiKey(),
          Accept: "application/json",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastErrorMessage = message;

      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.warn(
          `LTA API request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms: ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(
        `LTA API request failed after ${MAX_RETRIES} attempts: ${message}`,
      );
    }

    if (response.ok) {
      try {
        return response.json() as Promise<T>;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastErrorMessage = message;
        throw new Error(`LTA API response parse error: ${message}`);
      }
    }

    const status = response.status;
    const statusText = response.statusText;
    const message = `LTA API error: ${status} ${statusText}`;
    lastErrorMessage = message;

    if (isRetryableHttpStatus(status) && attempt < MAX_RETRIES - 1) {
      const retryAfterMs = status === 429 ? parseRetryAfterMs(response.headers) : null;
      const backoffMs = getRetryDelay(attempt);
      const delay = retryAfterMs ? Math.max(backoffMs, retryAfterMs) : backoffMs;
      console.warn(
        `LTA API request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms: ${message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(message);
  }

  throw new Error(`LTA API request failed after ${MAX_RETRIES} attempts: ${lastErrorMessage}`);
}
