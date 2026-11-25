import { getApiErrorMessage, parseJson } from "./api-response";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function browserApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response: Response;

  try {
    response = await fetch(`/api/v1/${path.replace(/^\/+/, "")}`, {
      ...init,
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new ApiError(
      "Could not connect to Frame. Check your connection and try again.",
      0,
    );
  }

  const text = await response.text();

  if (!response.ok) {
    throw new ApiError(
      getApiErrorMessage(
        parseJson(text),
        `The request failed (${response.status}). Please try again.`,
      ),
      response.status,
    );
  }

  if (response.status === 204 || !text) return undefined as T;

  const payload = parseJson(text);
  if (payload === null) {
    throw new ApiError("Frame returned an invalid response. Please try again.", response.status);
  }

  return payload as T;
}
