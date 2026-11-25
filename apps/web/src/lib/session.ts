import { cache } from "react";
import type { UserDto } from "@creator-platform/contracts";
import { ServerApiError, serverApi } from "./api-server";

export const getCurrentUser = cache(async (): Promise<UserDto | null> => {
  try {
    return await serverApi<UserDto>("/auth/me");
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) return null;
    throw error;
  }
});
