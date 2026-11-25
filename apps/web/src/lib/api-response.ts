export function parseJson(text: string): unknown {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function cleanMessages(values: unknown[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function getApiErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    const messages = cleanMessages(payload);
    if (messages.length) return messages.join(" ");
  }

  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    const messages = cleanMessages(
      Array.isArray(body.message) ? body.message : [body.message],
    );

    if (messages.length) return messages.join(" ");
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error.trim();
    }
  }

  return fallback;
}
