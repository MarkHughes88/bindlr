# TODO - Bindlr (Execution Order)

Last updated: 2026-03-23

This checklist is intentionally ordered. Work top to bottom.

## 0. Product and Planning

- [x] Define product scope and success outcomes in `docs/product-requirements.md`
- [x] Define implementation order in `docs/implementation-roadmap.md`
- [x] Add frontend workflow guide in `docs/frontend-playbook.md`

## 1. Data Layer Foundation (Highest Priority)

- [x] Add SQLite bootstrap (`expo-sqlite`) and migration runner
- [x] Create migration: `recent_tcg_card_views`
- [ ] Create migration: `inventory_items`
- [ ] Create migration: `custom_tcg_cards`
- [ ] Create migration: `binders`, `binder_pages`, `binder_slots`
- [x] Create migration: `007_downloads_foundation` (`download_scopes`, `download_assets`, `download_scope_assets`, `download_jobs`)
- [x] Implement `SqliteHomeRepository.getRecentViews(limit)`
- [x] Implement `SqliteHomeRepository.recordRecentView(input)` with upsert + prune (max 100)
- [x] Implement `SqliteHomeRepository.getHomeData()`
- [ ] Implement `SqliteInventoryRepository` CRUD
- [ ] Implement binder repository interfaces + SQLite implementations
- [x] Wire `src/lib/repositories/index.ts` to SQLite repositories
- [x] Implement downloads repository foundation (`enqueueCardImageDownloads`, `enqueueSetImageDownloads`, `enqueueTcgImageDownloads`, `processNextJob`, scope status)
- [x] Persist downloaded files to app-managed storage and track `local_uri` + `file_size_bytes` in `download_assets`
- [ ] Swap direct catalog URL downloads to first-party server/CDN manifest URLs
- [x] Remove legacy mock datasets/repositories after SQLite parity + dev seed coverage

## 2. Core App Flows

- [x] Add TCG card detail route: `app/tcg-card/[tcgCardId].tsx`
- [x] Add `TcgCardDetailScreen` and detail hook
- [x] Record recent view on detail open
- [x] Navigate to detail from Home recent rail
- [x] Refresh Home recent-view rail when returning from TCG card detail
- [ ] Navigate to detail from all search/catalog result lists
- [ ] Add complete loading/error/empty states on detail screen
- [ ] Render full universal + TCG-specific attribute sections in detail UI
- [ ] Implement Pokemon detail screen contract (HP, stage, abilities, attacks, weakness/resistance/retreat, set/meta, quantity/actions)
- [ ] Implement Lorcana detail screen contract (cost/strength/willpower/lore, inkwell, abilities/rules, variants, set/meta, quantity/actions)
- [ ] Implement MTG detail screen contract (mana/type line, text/keywords, power-toughness or loyalty, identity/legality, set/meta, quantity/actions)
- [ ] Implement One Piece detail screen contract (cost/power/counter, effect/trigger/version/tags, type/colors/attribute, set/meta, quantity/actions)
- [ ] Build first-launch offline pack selection prompt (multi-select TCGs)
- [ ] Add Download Manager entry and screen in Account/Settings
- [ ] Add contextual download status/action in TCGs (downloaded/update available)
- [ ] Add update prompt flow when new sets/TCG cards are available
- [x] Implement shared TCG card list filters (search, set, rarity, owned status, sort)
- [ ] Implement Pokemon filter facets (type/supertype/subtype, HP, weakness, retreat, regulation, legality)
- [x] Implement Lorcana filter facets (ink/type, cost/lore/strength/willpower, inkwell, keyword, source)
- [x] Implement MTG filter facets (colors, color identity, mana value, type/subtype, keyword, power, toughness, loyalty)
- [x] Implement One Piece filter facets (colors, card type, attribute, cost/power/counter, tags/effect)
- [x] Add filter chips + reset all + mode-remembered filter state (catalog vs recently viewed)
- [x] Consolidate card list entry to `app/cards.tsx` with route-param scope (`tcg`) and mode (`recentlyViewed`)
- [x] Home TCG rows navigate to cards list scoped by selected TCG
- [ ] Manual review: run advanced filter QA per TCG and provide gap list for missing/incorrect facets
- [ ] One Piece parity follow-up: add official-site facets not currently in dataset (block icon, illustration type, hide reprint cards)
- [ ] MTG parity follow-up: review against official Wizards advanced search and list any missing facets/behaviors
- [x] Build TCGs screen (TCG tiles with logo + download state)
- [x] Build Sets screen (owned/total, percent complete, progress bar, search, language pills)
- [x] Build TCG Cards screen with contextual scope behavior (all vs scoped)
- [ ] Add TCG card status pills (owned, all, wishlist, needed for binders)
- [ ] Implement search component with current-scope default and global fallback
- [ ] Implement main nav entries (Home, TCGs, Sets, Cards, Search, Filter)
- [ ] Add top-right account icon behavior (default icon/avatar/unauthenticated state)
- [ ] Build basic account section (avatar, name, email, password)
- [ ] Build login/register forms
- [ ] Add Google sign-in path (feature-flagged if needed)

## 3. Binder Builder (Main Feature)

- [x] Create binder list screen
- [x] Create first binder builder route with landscape gate + placeholder canvas
- [ ] Create binder detail screen (sections/pages)
- [ ] Create binder page editor screen
- [ ] Add slot placement model (catalog/custom TCG card identity)
- [ ] Build TCG card picker modal for slot assignment
- [ ] Implement zoom + pan canvas using gesture-handler + reanimated
- [ ] Add view mode vs edit mode interaction toggle
- [ ] Add reset zoom control and gesture clamping
- [ ] Add binder config model: rows/columns (default 3x3), capacity (default 360)
- [ ] Add binder prefab presets (2x2/160, 3x3/360, 4x3/480, 4x3/624, 4x4/1088, 5x4/1280)
- [ ] Add binder appearance settings: cover color, inside color, cover image
- [ ] Add color presets: black, navy, forest, red, teal, yellow
- [ ] Add custom TCG card flow (upload/preset image, 1-slot or 2-slot)
- [ ] Add add-TCG-card flow from owned inventory and from search/catalog
- [ ] Allow post-create grid-size changes and page additions
- [ ] Enforce physical spread rule (no first-left page, no last-right page)
- [ ] Add compact TCG cards action (remove gaps, refill from first slot)
- [ ] Add undo/redo in binder editor
- [ ] Add move/delete/status actions for individual TCG cards
- [ ] Add status assignment flow (owned-linked via inventory copy, or missing)
- [ ] Add multi-select mode for batch move/delete/status updates
- [ ] Add binder editor search
- [ ] Add page navigation controls (prev/next, first/last)

## 4. Frontend Consistency and UX

- [x] Reuse `TcgCard` for TCG card visuals across contexts
- [x] Reuse shared back navigation via `Header hasBackBtn`
- [ ] Standardize loading/error/empty components for all feature screens
- [ ] Ensure all new routes validate params before rendering
- [ ] Remove temporary debug logs from production paths

## 5. Images and Performance

- [ ] Generate local image asset manifest from catalog pipeline
- [ ] Add fallback placeholder image for missing TCG card images
- [ ] Implement image cache strategy (`expo-image` or equivalent)
- [ ] Ensure Offline Mode forces local-first image resolution (no remote-first behavior)
- [ ] Build shared app image component for TCG cards/logos/icons with local-first fallback rules
- [ ] Implement detail image progressive upgrade (local -> small -> large) with smooth transition
- [ ] Implement ownership-based TCG card rendering (owned = color, not-owned = greyscale)
- [ ] Ensure greyscale/color ownership treatment is consistent across binder, TCGs, and picker flows
- [ ] Tune FlatList virtualization for large rails/grids
- [ ] Add tablet-specific layout scaling for grids and rails
- [ ] Persist precomputed catalog facet indexes to SQLite for warm app starts
  - Add a `catalog_facet_index` table with TCG/language versioning
  - On app start, hydrate indexes from SQLite rather than rebuilding from raw JSON
  - Invalidate/rebuild only when the catalog data version changes
  - This eliminates first-hit index build latency, especially important for 20k+ MTG cards

## 6. User Model and Sync Strategy

- [ ] Decide single local profile vs account-backed users
- [ ] Add `user_id` to user-owned tables if multi-user/account-backed
- [ ] Decide local-only vs optional cloud sync
- [ ] Design onboarding/profile creation flow

## 7. Reliability and Release

- [ ] Add repository tests for recent-view upsert/prune behavior
- [ ] Add tests for binder slot writes and reads
- [ ] Add smoke tests for navigation-critical flows
- [ ] Validate migration behavior on clean and existing installs
- [ ] Re-investigate and reproduce intermittent advanced-filter bug reported during manual testing (could not recreate consistently)