export function parseIdArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mergeIds(existing: string[], added: string[]): string[] {
  return [...new Set([...existing, ...added])];
}
