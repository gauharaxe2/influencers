import { z } from "zod";

export const ACCOUNT_TYPES = ["VIEWER", "CREATOR"] as const;
export const VIDEO_VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export const VIDEO_STATUSES = [
  "UPLOADING",
  "UPLOADED",
  "PROCESSING",
  "READY",
  "REJECTED",
] as const;

export const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
] as const;

export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(60),
  countryCode: z.string().trim().regex(/^[A-Z]{2}$/).transform((value) => value.toUpperCase()),
  accountType: z.enum(ACCOUNT_TYPES),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  handle: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  bio: z.string().trim().max(500),
});

export const videoUploadSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).default(""),
  visibility: z.enum(VIDEO_VISIBILITIES).default("PUBLIC"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["video/mp4", "video/webm", "video/quicktime"]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024 * 1024),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
export type VideoUploadInput = z.infer<typeof videoUploadSchema>;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type VideoVisibility = (typeof VIDEO_VISIBILITIES)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: "VIEWER" | "CREATOR" | "ADMIN";
  countryCode: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface CreatorProfileDto {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  payoutStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  createdAt: string;
}

export interface VideoDto {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

export interface UploadSessionDto {
  video: VideoDto;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
}
