const storage = chrome.storage.local;

export async function get<T>(key: string): Promise<T | undefined> {
  const result = await storage.get(key);
  return result[key] as T | undefined;
}

export async function set<T>(key: string, value: T): Promise<void> {
  await storage.set({ [key]: value });
}

export async function remove(key: string): Promise<void> {
  await storage.remove(key);
}

export async function getAll(): Promise<Record<string, unknown>> {
  return storage.get(null);
}
