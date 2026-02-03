/**
 * LTA DataMall API client
 * Handles authenticated requests to LTA endpoints
 */

const LTA_BASE_URL = "https://datamall2.mytransport.sg";

function getApiKey(): string {
  const apiKey = process.env.LTA_DATAMALL_API_KEY;
  if (!apiKey) {
    throw new Error("LTA_DATAMALL_API_KEY environment variable is not set");
  }
  return apiKey;
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

  const response = await fetch(url.toString(), {
    headers: {
      AccountKey: getApiKey(),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`LTA API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
