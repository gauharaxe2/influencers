export const COLLECTIONS = {
  users: 'users',
  userEmails: 'userEmails',
  sessions: 'sessions',
  sessionTokens: 'sessionTokens',
  creatorProfiles: 'creatorProfiles',
  creatorHandles: 'creatorHandles',
  countryPolicies: 'countryPolicies',
  videos: 'videos',
  uploadSessions: 'uploadSessions',
  uploadTokens: 'uploadTokens',
} as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}