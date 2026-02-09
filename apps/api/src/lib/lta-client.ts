/**
 * LTA DataMall API client
 * Handles authenticated requests to LTA endpoints
 */

const LTA_BASE_URL = "https://datamall2.mytransport.sg";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export class LtaUpstreamError extends Error {
  endpoint: string;
  status: number | null;
  retryable: boolean;
  attempt: number;
  cause?: unknown;

  constructor(params: {
    message: string;
    endpoint: string;
    status: number | null;
    retryable: boolean;
    attempt: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "LtaUpstreamError";
    this.endpoint = params.endpoint;
    this.status = params.status;
    this.retryable = params.retryable;
    this.attempt = params.attempt;
    this.cause = params.cause;
  }
}

const getApiKey = (): string => {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  if (!apiKey) {
    throw new Error("LTA_DATAMALL_API_KEY environment variable is not set");
  }
  return apiKey;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
): Promise<Response> => {
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
};

const getRetryDelay = (attempt: number): number => {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
};

const isRetryableHttpStatus = (status: number): boolean => {
  return status === 429 || (status >= 500 && status < 600);
};

const parseRetryAfterMs = (headers: Headers): number | null => {
  const value = headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return null;
};

export const fetchFromLTA = async <T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> => {
  const url = new URL(endpoint, LTA_BASE_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  let lastErrorMessage = "Unknown error";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const attemptNo = attempt + 1;
    let response: Response | null = null;
    try {
      console.info(
        JSON.stringify({
          event: "lta_upstream_request",
          endpoint,
          attempt: attemptNo,
          params,
        }),
      );
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

      throw new LtaUpstreamError({
        message: `LTA API request failed after ${MAX_RETRIES} attempts: ${message}`,
        endpoint,
        status: null,
        retryable: true,
        attempt: attemptNo,
        cause: error,
      });
    }

    if (response.ok) {
      try {
        return (await response.json()) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastErrorMessage = message;
        throw new LtaUpstreamError({
          message: `LTA API response parse error: ${message}`,
          endpoint,
          status: response.status,
          retryable: false,
          attempt: attemptNo,
          cause: error,
        });
      }
    }

    const status = response.status;
    const statusText = response.statusText;
    const message = `LTA API error: ${status} ${statusText}`;
    lastErrorMessage = message;

    if (isRetryableHttpStatus(status) && attempt < MAX_RETRIES - 1) {
      const retryAfterMs =
        status === 429 ? parseRetryAfterMs(response.headers) : null;
      const backoffMs = getRetryDelay(attempt);
      const delay = retryAfterMs
        ? Math.max(backoffMs, retryAfterMs)
        : backoffMs;
      console.warn(
        `LTA API request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms: ${message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new LtaUpstreamError({
      message,
      endpoint,
      status,
      retryable: isRetryableHttpStatus(status),
      attempt: attemptNo,
    });
  }

  throw new LtaUpstreamError({
    message: `LTA API request failed after ${MAX_RETRIES} attempts: ${lastErrorMessage}`,
    endpoint,
    status: null,
    retryable: true,
    attempt: MAX_RETRIES,
  });
};
