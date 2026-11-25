import type { CreatorProfileDto, VideoDto } from "@creator-platform/contracts";
import { ServerApiError, serverApi } from "./api-server";

export async function getCreatorProfile(): Promise<CreatorProfileDto | null> {
  try {
    return await serverApi<CreatorProfileDto>("/creator/profile");
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getCreatorVideos(): Promise<VideoDto[]> {
  const response = await serverApi<{ videos: VideoDto[] }>("/creator/videos");
  return response.videos;
}
