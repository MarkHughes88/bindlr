export const RECENT_VIEWS_LIMIT = 100;

export const DEFAULT_LOCAL_USER_ID = "local" as const;

export const SUPPORTED_LANGUAGES = ["en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
