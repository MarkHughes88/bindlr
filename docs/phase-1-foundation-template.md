# Phase 1 Foundation Template

This template answers the pre-build setup questions so we can start the SQLite/data layer with minimal rework.

## 1. TypeScript types/contracts: yes, use them as guardrails

Yes. These are the primary safety net for data correctness during development.

Recommended layers:
- Domain types: canonical app shapes (`src/domain/**`)
- Feature DTO types: UI/use-case shapes (`src/features/**/**.types.ts`)
- Repository interfaces: read/write contracts (`src/features/**/**.repository.ts`)
- DB row types: table-level rows (`src/lib/db/db.types.ts`)

Rule of thumb:
- DB rows are snake_case and persistence-focused
- Domain/feature types are camelCase and app-focused
- Mapping happens in repositories only

## 2. Where types should live (best option)

Best fit for your current codebase:
- Keep feature repository interfaces in `src/features/*/*.repository.ts` (already established)
- Keep shared domain types in `src/domain/*/*.types.ts`
- Keep DB row types + migration helpers in `src/lib/db/*`
- Keep app-wide constants in `src/shared/config/*`

This avoids one huge global `types.ts` file and scales better as features grow.

## 3. Enums/constants and card ratio dimensions

Yes, card ratio data belongs in shared config.

Current file already has:
- `src/shared/config/tcg.ts`: `TCG_CARD_ASPECT_RATIO`

Recommended additions:
- `src/shared/config/app-constants.ts`
- `src/shared/config/image.ts`
- `src/shared/config/binder-presets.ts`

Suggested constants:

```ts
// src/shared/config/app-constants.ts
export const RECENT_VIEWS_LIMIT = 100;
export const DEFAULT_APP_LANGUAGE = "en" as const;
export const SUPPORTED_LANGUAGES = ["en", "ja"] as const;

export const DEFAULT_LOCAL_USER_ID = "local" as const;
```

```ts
// src/shared/config/image.ts
export const IMAGE_CACHE_RETRY_DAYS = 7;
export const IMAGE_STATUS = ["placeholder", "loading", "loaded", "failed"] as const;
export type ImageStatus = (typeof IMAGE_STATUS)[number];

export const PLACEHOLDER_PATHS = {
  pokemon: { en: "@/assets/images/placeholders/pokemon/en/placeholder.png" },
  mtg: { en: "@/assets/images/placeholders/mtg/en/placeholder.png" },
  lorcana: { en: "@/assets/images/placeholders/lorcana/en/placeholder.png" },
  "one-piece": { en: "@/assets/images/placeholders/one-piece/en/placeholder.png" },
} as const;
```

```ts
// src/shared/config/binder-presets.ts
export type BinderPreset = {
  id: string;
  label: string;
  rows: number;
  cols: number;
  capacity: number;
};

export const BINDER_PRESETS: BinderPreset[] = [
  { id: "pocket-4", label: "4 pocket", rows: 2, cols: 2, capacity: 160 },
  { id: "pocket-9", label: "9 pocket", rows: 3, cols: 3, capacity: 360 },
  { id: "pocket-9-xl", label: "9 pocket XL", rows: 4, cols: 3, capacity: 480 },
  { id: "pocket-12", label: "12 pocket", rows: 4, cols: 3, capacity: 624 },
  { id: "pocket-16-xxl", label: "16 pocket XXL", rows: 4, cols: 4, capacity: 1088 },
  { id: "pocket-20-xxxl", label: "20 pocket XXXL", rows: 5, cols: 4, capacity: 1280 },
];
```

Note on card ratio dimensions:
- Keep `TCG_CARD_ASPECT_RATIO` in `src/shared/config/tcg.ts` (correct place)
- If you need per-game art quirks later, add optional per-TCG overrides beside it

## 4. DB init + migration best practice (recommended approach)

For your local-first Expo app, best practice is:
- Add DB in Phase 1 (now)
- Use forward-only migrations
- Initialize DB once at app boot before repositories are used
- Keep catalog JSON outside SQLite (read from fixtures)
- Store only user-state in SQLite (inventory, binders, wishlists, recents, cache metadata)

Why:
- Faster startup and simpler updates for catalog
- Smaller migration surface area
- Less risk of schema churn when catalog changes

Recommended startup flow:
1. App boot
2. `initDatabase()` runs migration runner
3. Repository factory returns SQLite repos
4. UI renders with real repos

Migration structure suggestion:

```ts
// src/lib/db/migrations/index.ts
export type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

export const migrations: Migration[] = [
  // 001_create_user_profiles
  // 002_create_wishlists
  // ...
];
```

```ts
// src/lib/db/init.ts
export async function initDatabase(): Promise<void> {
  // open db
  // ensure migrations table exists
  // apply pending migrations ordered by version
}
```

## 5. Repository Selection + when to add DB

Do we need repository flags?
- Not for current architecture. App runtime is SQLite-only.
- Keep composition root simple and deterministic.

When do we add DB?
- Now, at start of Phase 1.
- First deliverable should be:
  - DB init + migrations runner
  - schema v1 tables
  - repository wiring in `src/lib/repositories/index.ts`

## Copy/Paste Contract Skeletons

Use these as starting contracts before migration code.

```ts
// src/features/wishlist/wishlist.repository.ts
export interface WishlistRepository {
  getWishlists(): Promise<{ id: string; name: string }[]>;
  createWishlist(name: string): Promise<{ id: string; name: string }>;
  renameWishlist(id: string, name: string): Promise<void>;
  deleteWishlist(id: string): Promise<void>;

  addCardToWishlists(catalogTcgCardId: string, wishlistIds: string[]): Promise<void>;
  removeCardFromWishlist(catalogTcgCardId: string, wishlistId: string): Promise<void>;

  listCardsByWishlist(wishlistId: string): Promise<{ catalogTcgCardId: string; addedAt: string }[]>;
  listWishlistsForCard(catalogTcgCardId: string): Promise<{ id: string; name: string }[]>;
}
```

```ts
// src/features/account/account.repository.ts (MVP local-only)
export interface AccountRepository {
  getLocalProfile(): Promise<{
    id: "local";
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  }>;
  updateLocalProfile(input: {
    name?: string;
    email?: string | null;
    avatarUrl?: string | null;
  }): Promise<void>;
  clearAllLocalData(): Promise<void>;
}
```

```ts
// src/features/images/image-cache.repository.ts
import type { ImageStatus } from "@/src/shared/config/image";

export interface ImageCacheRepository {
  getImageStatus(catalogTcgCardId: string): Promise<ImageStatus>;
  setImageStatus(catalogTcgCardId: string, status: ImageStatus): Promise<void>;
  markImageFailed(catalogTcgCardId: string, failedAtIso: string): Promise<void>;
}
```

## Final Decisions To Confirm (before coding)

- Keep feature repository contracts in each feature folder: YES
- Keep `TCG_CARD_ASPECT_RATIO` in shared config: YES
- Add SQLite in Phase 1 now: YES
- Forward-only migrations: YES
- Keep catalog in JSON fixtures, user-state in SQLite: YES
- Use SQLite-only repository composition root: YES
