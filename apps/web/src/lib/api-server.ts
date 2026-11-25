import { cookies } from "next/headers";
import { getApiErrorMessage, parseJson } from "./api-response";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

export class ServerApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ServerApiError";
  }
}

export async function serverApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const headers = new Headers(init.headers);
  const incomingCookies = cookieStore.toString();

  headers.set("Accept", "application/json");
  if (incomingCookies) headers.set("Cookie", incomingCookies);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(
      `${apiInternalUrl}/${path.replace(/^\/+/, "")}`,
      {
        ...init,
        cache: "no-store",
        headers,
      },
    );
  } catch {
    throw new ServerApiError("The Frame API is currently unavailable.", 503);
  }

  const text = await response.text();

  if (!response.ok) {
    throw new ServerApiError(
      getApiErrorMessage(
        parseJson(text),
        `The Frame API request failed (${response.status}).`,
      ),
      response.status,
    );
  }

  if (response.status === 204 || !text) return undefined as T;

  const payload = parseJson(text);
  if (payload === null) {
    throw new ServerApiError("The Frame API returned an invalid response.", 502);
  }

  return payload as T;
}
