import { getDb } from "../client";

export const getMetadata = (
  key: string,
): { value: string; updated_at: number } | null => {
  return getDb()
    .query("SELECT value, updated_at FROM metadata WHERE key = ?")
    .get(key) as { value: string; updated_at: number } | null;
};

export const setMetadata = (key: string, value: string): void => {
  getDb()
    .query(
      "INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)",
    )
    .run(key, value, Date.now());
};
