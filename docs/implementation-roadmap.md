# Implementation Roadmap - Ordered Plan

Last updated: 2026-03-22

This is the recommended execution order for a mostly solo frontend developer with AI support for backend/data work.

## Current State Checkpoint (March 2026)
- Route consolidation completed: unified cards list route at `app/cards.tsx` (`tcg` + `mode` params).
- Home TCG rows now deep-link to scoped card lists.
- Catalog advanced filters are implemented with descriptor-driven game-specific facets.
- Catalog performance groundwork shipped:
  - filtered-card memoization
  - lazy per-TCG/language in-memory index
  - lightweight profiling timers in catalog repository paths
- Remaining planned work below should be treated as forward roadmap from this baseline.

## Phase 0: Foundation and Guardrails
- Confirm and freeze requirements in `docs/product-requirements.md`.
- Keep repository contracts stable before adding many screens.
- Add migration runner and database initialization entrypoint.

## Phase 1: Data Layer (Backend Work in App)
1. SQLite setup
- Add `expo-sqlite` access layer.
- Implement migrations table and migration runner.
- Create initial schema for:
  - `user_profiles` (MVP: single 'local' profile)
  - `wishlists`, `wishlist_cards` (user-created wishlist collections)
  - `recent_tcg_card_views`
  - `inventory_items`
  - `custom_tcg_cards`
  - `binders`, `binder_configs`, `binder_pages`, `binder_slots`
  - `image_cache` (track downloaded image status per card)
  - `download_packs` (track full TCG/set image downloads)

2. Repository implementations
- Implement `SqliteUserRepository`: Get/update local profile
- Implement `SqliteWishlistRepository`:
  - `getWishlists()` - list all user wishlists
  - `createWishlist(name)` - create new wishlist
  - `renameWishlist(id, name)`
  - `deleteWishlist(id)`
  - `addCardToWishlists(cardId, wishlistIds)` - multi-select
  - `removeCardFromWishlist(cardId, wishlistId)`
  - `getWishlistCards(wishlistId)` - with pagination
  - `isCardInWishlist(cardId, wishlistId)` - for UI indicators
- Implement `SqliteHomeRepository`:
  - `getRecentViews(limit)`
  - `recordRecentView(input)` with upsert + prune
  - `getHomeData()`
- Implement `SqliteInventoryRepository` CRUD.
- Implement binder repositories and types.
- Implement offline/download repositories and services:
  - `getOfflineMode()` / `setOfflineMode(enabled)`
  - `getDownloadStatus(tcg)` - per-TCG status
  - `getImageStatus(tcgCardId)` - from image_cache table
  - queue + persist download jobs
  - mark update-available when remote catalog version changes

3. Composition root
- Wire `src/lib/repositories/index.ts` to SQLite repositories only.
- Keep dev seed generation in `src/lib/db/seed.ts` mock-free and catalog-driven.
- Wire image resolver to prefer local assets when Offline Mode is enabled.
- Wire app image component to check image_cache for cached status.

## Phase 2: Core User Flows
1. TCG card detail completion
- Render universal and TCG-specific attributes.
- Add loading, empty, and error states.
- Add action buttons: Add to wishlist, Add to binder, Mark owned/missing.

2. Search -> detail -> recent views loop
- Ensure all search/catalog list items navigate to detail.
- Confirm recent views updates and persists across app restarts.
- Implement basic search on card/set list screens.
- Implement advanced search modal with full filters per TCG.

3. Inventory flow
- Add actions on detail screen: add to inventory, adjust quantity.

4. Placeholder image strategy
- Add placeholder images per TCG to `assets/images/placeholders/{tcg}/{language}/`.
- Wire AppImage component to show placeholder while remote image loads.
- Track image status in image_cache table ('placeholder' | 'loading' | 'loaded' | 'failed').
- Show placeholder for cards without downloaded images in offline mode.

5. Offline and pack-management flows
- First-launch modal explains offline packs and lets user select TCGs to download.
- Account screen includes Download Manager entry with per-TCG status and size.
- TCGs screen includes contextual per-TCG download action/status.
- Show update prompt when new data is available for downloaded TCG packs.
- Ensure user can continue using downloaded data while update is pending.

6. Wishlist feature
- Build Wishlist screen with cards grouped by TCG and custom wishlist.
- Add create/rename/delete custom wishlists inline.
- Implement "Add to..." popup when user taps heart icon on cards (multi-select wishlists and binders).
- Add wishlist status pill to card list screens.
- Add "No wishlisted cards" empty state with helpful copy.
- Support sort options: Recently added, TCG, set, rarity, name.

7. Browse Tab: TCGs/Sets/Cards flows
- Build TCGs screen (Browse tab root) with per-TCG tiles, logos, download state.
- TCGs screen shows: TCG card count, owned/total count, completion percent, download status.
- Build Sets screen with owned/total, completion progress bars, search, and language pills.
- Build TCG Cards screen for selected set scope.
- Add TCG card status pills: owned, all, wishlist, needed for binders.
- Add shared search and filter entry points with current-scope defaults.
- Add sort controls and saved filter state per TCG.
- Implement basic search (scope-aware) on TCG card/set list pages.
- Implement advanced search modal from Search tab or "Advanced" icon on list pages.
- Ensure TCGs/Sets/Cards are always accessible from Browse tab (not just from Home).

## Phase 3: Binder Builder (High-Value Feature)
1. Binder data model + persistence
- Binder entities: binder, section, page, slot placement.
- Slot references card identity via discriminated union.
- Add binder config model:
  - `rows`, `columns` (default `3x3`)
  - `capacity` (default `360`)
  - `coverColor`, `insideColor`, `coverImage`
  - prefab template id
- Add spread-aware page model to support real-binder constraints:
  - first spread has no left page
  - last spread has no right page

2. Binder screens
- Binder list screen.
- Binder detail screen (sections/pages).
- Binder page editor screen.
- Binder picker navigation flow using shared sets/cards/detail screens in picker context.
- Binder placement CTA integration ("Add to current binder") in list/detail views.
- Binder create/edit forms with prefab presets and custom grid/capacity overrides.
- Binder appearance controls: cover/inside color presets and cover image upload.
- TCG card search entry in binder editor.

3. Advanced binder card assignment
- Multi-select staging flow:
  - Allow selecting multiple cards in picker screens.
  - Show a review tray/list before commit (edit quantities, remove items, confirm target page/slots).
  - Commit as a batch write to binder slot placements.
- Create binder from set flow:
  - Entry point A: from set list/detail (action: "Create binder from this set").
  - Entry point B: from existing binder (action: "Import from set").
  - Support template-based auto-placement (3x3 first), with overflow handling for extra cards.
- Owned-copy assignment flow:
  - When a card has multiple owned copies, allow selecting which owned instance to assign.
  - If no owned copy is selected, allow "reference-only" placement (card shown but not tied to owned inventory item).
  - Persist assignment link so binder can distinguish owned vs placeholder entries.
- Custom card flow:
  - Create custom card with uploaded/preset image.
  - Support 1-slot or 2-slot placement size.
- Batch actions and editor operations:
  - multi-select cards
  - move/delete/status change in batch
  - compact cards (remove gaps and refill from first slot)
  - undo/redo stack

3. Zoomable page interaction
- Use `react-native-gesture-handler` + `react-native-reanimated` for pan/zoom.
- Keep slot taps independent from pan/zoom gestures.
- Add edit mode toggle (view mode vs placement mode).
- Add page navigation controls: previous/next and first/last.

## Phase 4: UX Consistency and Performance
- Centralize reusable nav controls (`Header`, `BackButton`).
- Standardize screen templates (loading/error/empty).
- Apply consistent back vs close semantics across pushed screens and modals.
- Add undo/confirm patterns for destructive binder actions.
- Implement shared app image component with policy-based source resolution.
- Enforce local-first for thumbnails/logos/icons with remote fallback.
- Implement progressive card-detail image loading (local -> remote small -> remote large upgrade).
- Implement ownership-aware card visual treatment (owned = color, not owned = greyscale).
- Optimize image loading and cache policy.
- Add list virtualization tuning on large rails/grids.
- Implement main nav model and route mapping for Home/TCGs/Sets/Cards/Search/Filter.
- Add top-right account icon behavior (default, avatar, unauthenticated state).

## Phase 4.1 Account and Auth Foundations (MVP: Local-Only Profile)
- **MVP Approach:** Single local user profile per device, no authentication UI needed
  - Get/update local profile via UserRepository (name, avatar, email display-only)
  - Single immutable 'local' profile in user_profiles table
  - No login/logout/password in MVP
  - No backend or third-party auth infrastructure in MVP

- **Account screen (MVP):** User profile section, settings, download management
  - Display profile: name, avatar, email (optional)
  - Settings: language (en, ja), theme, offline toggle
  - Downloaded TCGs: Per-TCG status and size controls
  - Placeholder image prefs: Show per-language bundled status
  - Account actions: Clear all data (full app reset)

- **Phase 4.1+ Expansion Planning (Not in MVP):**
  - Backend infrastructure choice (Node, Auth0, Firebase, etc.)
  - Email + password authentication with email verification
  - Optional Google OAuth integration
  - Session tokens (JWT or server-side sessions)
  - Password reset flow via email
  - Account deletion + data export
  - Multi-device sync and cloud backup (out of scope for MVP, Phase 5+)
  - Schema: Add nullable `user_id` to user_profiles for account-backed users (designed now, populated later)

## Phase 5: Reliability and Release Prep
- Add repository-level tests for upsert/prune logic and binder slot writes.
- Add smoke tests for core navigation flows.
- Validate migration safety on existing installations.

## Weekly Rhythm Recommendation
- Monday: requirements + schema decisions.
- Tuesday-Wednesday: repository implementation.
- Thursday: UI integration.
- Friday: polish + tests + docs update.

## How To Use AI Efficiently
- Ask AI for schema/migration/repository code first.
- Build UI yourself with small PRs; ask AI for targeted review.
- Keep each task small: one flow, one repository method, one screen at a time.
