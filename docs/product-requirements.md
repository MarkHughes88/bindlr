# Product Requirements - Bindlr

Last updated: 2026-03-22

## Current Implementation Snapshot (March 2026)
- Live tabs today: `Home`, `Binders`, `Search`.
- Unified card list route is `app/cards.tsx`:
	- `?tcg=<pokemon|mtg|lorcana|one-piece>` for TCG-scoped browsing
	- `?mode=recentlyViewed` for recents mode
- TCG detail route is `app/tcg-card/[tcgCardId].tsx`.
- Home TCG rows navigate into scoped `/cards` lists.
- Advanced filtering is implemented in catalog list flows (with game-specific facets where data exists).

The sections below remain the product target (MVP + phased scope), not a strict reflection of every shipped screen.

## Purpose
Bindlr is a mobile app for TCG collectors to discover TCG cards, track owned inventory, organize binders and wishlists, and quickly inspect TCG card details across Pokemon, MTG, Lorcana, and One Piece.

## Product Outcomes (Definition of Done)
- Users can search and browse TCG cards for all supported TCGs.
- Users can open a TCG card detail screen and view all available metadata from the catalog.
- Users can record ownership and quantity for TCG cards.
- Users can build binders with configurable page layouts and place/remove TCG cards in slots.
- Binder pages support smooth zoom and pan for inspection and editing.
- Recently viewed TCG cards are persisted per user and shown on Home.
- App works offline for core flows using local SQLite storage.
- User can enable Offline Mode and prioritize bundled/local images first.
- User can download TCG data packs per game and update when new sets/TCG cards are available.

## Primary Users
- Solo collector managing a personal inventory.
- Collector building showcase binders for deck ideas, set goals, or favorites.

## In-Scope Features (MVP)
1. Catalog
- Read-only TCG card and set data for all 4 TCGs.
- Fast lookup by id, set, and search query.

2. TCG Card Detail
- Route: `app/tcg-card/[tcgCardId].tsx`.
- Displays full universal + TCG-specific attributes.
- Records recent views on open.

2.1 Pokemon TCG Card Detail Fields (when data is available)
- Primary card panel:
	- TCG card image
	- TCG card name
	- HP
	- stage/classification (for example: Basic)
	- type indicator
- Rules/combat section:
	- abilities (name + text)
	- attacks (cost + name + damage + text)
	- weakness
	- resistance
	- retreat cost
- Metadata section:
	- expansion/set name + set code
	- TCG card number
	- rarity
	- illustrator
	- Pokedex number
	- regulation mark
	- format/legality (for example: Standard)
- Ownership/inventory actions:
	- quantity controls (add/remove owned count)
	- owned/missing status actions
- Optional commerce data:
	- display price only when reliable price data exists

2.2 Lorcana TCG Card Detail Fields (when data is available)
- Primary card panel:
	- TCG card image
	- TCG card name
	- version/subtitle
	- ink type/color
	- rarity
	- TCG card type/supertypes/subtypes
- Rules/gameplay section:
	- cost
	- strength
	- willpower
	- lore value
	- inkwell flag
	- keyword list
	- abilities (name + text)
	- rules text entries
	- source/franchise
- Metadata section:
	- expansion/set name + set code
	- TCG card number/local id
	- artist
	- legality entries (format + status)
	- available variant names (for example: normal, coldFoil, holofoil)
- Ownership/inventory actions:
	- quantity controls (add/remove owned count)
	- owned/missing status actions

2.3 MTG TCG Card Detail Fields (when data is available)
- Primary card panel:
	- TCG card image
	- TCG card name
	- mana cost
	- mana value
	- type line (types + subtypes + supertype when present)
	- rarity
- Rules/gameplay section:
	- rules text
	- keyword list
	- power/toughness (for creatures)
	- loyalty (for planeswalkers)
	- colors
	- color identity
	- layout
	- legality entries (format + status)
- Metadata section:
	- expansion/set name + set code
	- TCG card number/local id
	- artist
	- available finish/variant names when provided by dataset
- Ownership/inventory actions:
	- quantity controls (add/remove owned count)
	- owned/missing status actions

2.4 One Piece TCG Card Detail Fields (when data is available)
- Primary card panel:
	- TCG card image
	- TCG card name
	- TCG card type/supertypes/subtypes
	- rarity
	- colors
	- TCG card attribute (for example: Slash)
- Rules/gameplay section:
	- cost
	- power
	- counter
	- effect text
	- trigger text
	- version text
	- tag list
	- source text
	- legality entries (format + status)
- Metadata section:
	- expansion/set name + set code
	- TCG card number/local id
	- artist
	- available variant/finish names when provided by dataset
- Ownership/inventory actions:
	- quantity controls (add/remove owned count)
	- owned/missing status actions

3. Home
- Overview stats + recent activity.
- Recently viewed rail navigates to TCG card detail.
- Quick action buttons: Browse all TCGs (navigate to Browse tab), Create binder, View wishlists.

3.1 TCGs (Browse Tab Root)
- Lists each TCG as a tile.
- Each TCG row shows logo, total card count, owned/total count, completion percent, download status.
- Tap to navigate to Sets for that TCG.

3.2 Sets (Nested Screen)
- Lists all sets for selected TCG.
- Each row shows owned/total count and completion percent with progress bar.
- Includes search input and language pills when multiple languages exist.
- Tap to navigate to TCG Cards list for that set.

3.3 TCG Cards (Nested Screen)
- Lists TCG cards for selected scope (all TCGs, single TCG, or single set).
- Includes status pills: `owned`, `all`, `wishlist`, `needed for binders`.
- Includes search input, filters, and sort controls.
- Each TCG card shows: image (placeholder fallback if not downloaded), name, set, rarity.
- Tap TCG card → TCG Card Detail screen.
- Long-press or "+" button → "Add to..." popup (wishlists/binders).

3.4 TCG Card Detail (Full-Screen Nested Route)
- Route: `app/tcg-card/[tcgCardId].tsx`
- Displays full universal + TCG-specific attributes (see sections 2.1–2.4).
- Action buttons: Heart icon (add to wishlists), Binder icon (add to binders), Ownership toggle.
- Records recent views on open.

3.5 Main Navigation (Tab Bar)
- 6-tab bottom navigation: `Home | Browse | Binders | Wishlist | Search | Account`
- Each tab is a root-level navigator; internal screens are nested full-screen routes.
- **Home:** Overview, recent TCG cards, quick actions.
- **Browse:** TCGs → Sets → TCG Cards (hierarchical discovery, always accessible).
- **Binders:** Create/edit binders, view binder pages, add TCG cards via picker.
- **Wishlist:** Browse wishlisted TCG cards, manage custom wishlists.
- **Search:** Advanced search modal with full filter controls.
- **Account:** User profile, settings, download management, language/placeholder prefs.

3.6 Search Behavior
- **Basic search:** On TCG card/set list pages, search by name/text in current scope (TCG or set context).
- **Advanced search:** Modal from Search tab or "Advanced" icon on list pages.
- Advanced search supports: multi-TCG queries, all filter facets, sort options.

3.7 Add-to Popup Pattern
- When user taps "+" or heart icon on a TCG card or in a TCG card list:
  - Modal popup shows: "Add to..." with tabs: Wishlists | Binders.
  - Wishlists tab: checkboxes for existing wishlists + "Create new wishlist" button.
  - Binders tab: checkboxes for existing binders, shows available slot count.
  - Confirm button: "Add to X wishlists, Y binders".
  - Popup closes and returns to previous screen.

3.8 Wishlist Screen
- Display all wishlisted TCG cards grouped by TCG, then by wishlist.
- Each TCG card shows: image (placeholder fallback), name, set, count in wishlists.
- Bulk actions: Remove from wishlist, add to binder, move to different wishlist.
- Empty state: "No wishlisted TCG cards yet. Tap the heart icon on TCG cards to add them."
- Sort options: Recently added, TCG, set, rarity, name.
- Manage wishlists: Create, rename, delete custom wishlists inline.
- Share wishlists: Copy link or export list (future feature).

3.9 Account Screen
- User profile section: name, avatar, email (local profile in MVP).
- Settings: language (en, ja), theme, offline toggle.
- Downloaded TCGs: Per-TCG status and size (Downloaded | Update available | Download | Delete).
- Placeholder image prefs: Per-language bundled fallback status.
- Data management: Clear all data (full app reset, wipes profile and all user content).
- Help / FAQ / Support links.

4. Inventory
- Add/remove/update owned TCG cards.
- Track quantity, condition, notes, language.

5. Binders
- Create binder, sections, pages.
- Place TCG cards into slots.
- Support page templates (3x3 first).
- Zoom + pan + tap slot interactions.
- Binder page grid is configurable per binder/page (rows x columns), default `3x3`.
- Binder capacity is configurable, default `360` TCG cards.
- Provide prefab binder presets (capacity = rows × cols × default_page_count):
	- `(4 pocket)` `2x2 / 160 capacity`
	- `(9 pocket)` `3x3 / 360 capacity`
	- `(9 pocket XL)` `4x3 / 480 capacity` (vault-style, wider slots)
	- `(12 pocket)` `4x3 / 624 capacity` (standard vault binder)
	- `(16 pocket)` `4x4 / 1088 capacity`
	- `(20 pocket)` `5x4 / 1280 capacity`
- Binder appearance customization:
	- Cover color (default: black)
	- Inside color (default: black)
	- Cover image upload
	- Color presets from design: black, navy, forest, red, teal, yellow
- Support adding catalog TCG cards and custom TCG cards to binder.
- Custom TCG cards support uploaded image or preset default image.
- Custom TCG card slot size supports `1-slot` and `2-slot`.
- Add TCG cards from owned inventory or catalog search flow.
- Users can add pages and modify page grid size later.
- Binder paging mirrors physical binders:
	- No left page before first spread
	- No right page after last spread
- Provide TCG card compact action (remove gaps, refill from first slot).
- Support undo and redo in binder editor.
- Support TCG card actions: delete, move, change status.
- TCG card status assignment supports:
	- owned-linked (choose inventory copy or add to inventory)
	- missing
- Multi-select supported for batch actions (move, delete, status change).
- Binder editor navigation controls:
	- previous/next page
	- first/last page
- Binder editor supports in-flow TCG card search.

6. Persistence
- SQLite database with migrations.
- Repository interfaces with SQLite implementations.

6.1 Account and Authentication
- MVP: local-only profile (no login/register UI required).
- Initial account screen scope:
	- upload/change avatar
	- edit display name
	- edit email (display/contact)
- Post-MVP (future phase):
	- login/register screens
	- password-change/reset flows
	- optional social auth providers (for example Google)

7. Offline and Downloads
- Global Offline Mode toggle that prioritizes local data and bundled image assets.
- Per-TCG download management (Pokemon, MTG, Lorcana, One Piece).
- First-launch explainer modal that asks which TCG packs to download.
- Entry points to download manager from:
	- Account/Settings area
	- TCGs area (contextual button and status text)
- Download status states: not-downloaded, downloaded, update-available, downloading.
- Update prompt when new TCG card data is available for a downloaded TCG.

8. Image Delivery and Fallbacks
- Use a shared app image component for TCG card images, set logos, and UI icons.
- Thumbnail/logo/icon behavior:
	- Prefer downloaded/local image always when it exists.
	- Fallback to remote URL only when local image is unavailable.
- TCG card detail behavior:
	- If local downloaded image exists, render it first.
	- If no local image exists, render small remote image first for fast paint.
	- Then progressively upgrade to larger remote image when available.
	- Upgrade should be non-jarring (no noticeable flicker/jump for users).

9. Ownership Visual States
- TCG cards should render in full color when owned.
- TCG cards should render in greyscale when not owned/missing.
- Rule should apply consistently in binder pages, picker lists, and TCG views.

10. TCG Card Filtering (Set and TCG Card Lists)
- Shared filters across all TCGs:
	- text search (name)
	- set
	- rarity
	- owned status (`owned`, `missing`, `all`)
	- sort (`number`, `name`, `rarity`)
	- variant (when provided by dataset)

- Pokemon filters:
	- type
	- supertype
	- subtypes
	- HP range/value
	- weakness type
	- retreat cost
	- regulation mark
	- legality format/status

- Lorcana filters:
	- ink color/type
	- TCG card type/supertype/subtypes
	- cost
	- lore value
	- strength
	- willpower
	- inkwell (yes/no)
	- keyword
	- source/franchise
	- legality format/status

- MTG filters:
	- colors
	- color identity
	- mana value (CMC)
	- TCG card type/supertypes/subtypes
	- keyword
	- power/toughness (when available)
	- loyalty (when available)
	- legality format/status

- One Piece filters:
	- colors
	- TCG card attribute
	- TCG card type/supertypes/subtypes
	- cost
	- power
	- counter
	- tag
	- source
	- legality format/status

- Filter UX behavior:
	- show only filters that have data for current TCG/context
	- preserve last-used filters per TCG
	- show active filter chips and one-tap clear
	- support `reset all` action

## Out of Scope (for MVP)
- Multi-device cloud sync.
- Real-time collaboration.
- Advanced pricing/market analytics.
- OCR/photo scanning.

## Quality Bar
- Type-safe domain models and repository contracts.
- No UI data duplicated in database records (store identifiers; resolve display data in read layer).
- Smooth mobile interactions at 60fps target on modern devices.
- Navigation and component patterns reused consistently.
- Navigation semantics are consistent: back on top-left for stacked screens, close for modals.
- Destructive actions require confirm or undo.
- Empty, loading, and error states are implemented on all primary flows.
- Accessibility minimums: 44px touch targets, readable contrast, dynamic type support.
- Offline behavior is explicit and understandable (clear status and fallback behavior).
- Download/update flows are resilient to app restarts and flaky network.

## Data and Architecture Principles
- Catalog data is read-only and versioned separately from user data.
- User data is local-first in SQLite.
- Repositories are the boundary between feature logic and storage.
- Prefer discriminated unions for cross-TCG and catalog/custom-TCG-card modeling.

## Success Metrics
- Time-to-first-TCG-card-detail under 1 second on warm app state.
- Recent views always returns latest 10 unique TCG cards.
- Binder page interactions (pan/zoom/tap) remain responsive with 9+ visible TCG cards.

## Decisions Made (MVP)

### Authentication & User Profile
- **MVP Approach: Local-only single user profile per device**
  - No cloud sync, passwords, or backend infrastructure in MVP
  - User profile data: name, avatar URL, email (optional display-only)
  - Single profile persisted to SQLite; no login/logout in MVP
  - Schema designed to accept future `user_id` foreign keys (nullable in MVP)
  - **Phase 4.1 expansion:** Email+password authentication, optional Google OAuth, session tokens, cloud sync

### Wishlist System
- **Persisted wishlists:** Users can create unlimited custom wishlists
- **Wishlist table:** `wishlist_items(id, name, created_at, user_id)` + `wishlist_cards(wishlist_id, catalog_tcg_card_id, added_at)`
- **Status modeling:** Wishlists are separate from binder "needed for binders" status
  - Wishlists = user's future acquisition targets (flexible, shareable)
	- "Needed for binders" = computed flag (TCG cards in binder slots but not owned)
- **Add-to popup:** When adding a TCG card to wishlists, user can multi-select and create new wishlists inline

### Image Delivery Strategy
- **TCG card JSON data:** Bundled offline in app, always available
- **TCG card images:** Fetched on-demand, shown with placeholder fallback
- **Placeholder images:** Bundled per TCG and language under `assets/images/placeholders/`
  - Structure: `assets/images/placeholders/{tcg}/{language}/placeholder.png`
  - Example: `assets/images/placeholders/pokemon/en/placeholder.png`
- **Load pipeline:** Placeholder (from assets) → fetch remote image → cache locally → display
- **Offline Mode:** When offline=true, skip remote fetches entirely; show placeholder for uncached images

### Offline Pack Format
- **TCG card JSON:** Pre-bundled in app build (read-only catalog, immutable)
- **TCG card images:** Optional per-TCG download, user-initiated
- **Metadata tracking:** `(tcg, cardId, imageStatus: 'placeholder' | 'loading' | 'loaded' | 'failed')`
- **Download logic:** User downloads image pack for TCG → cache images locally → mark status as 'loaded'

### Search Pattern
- **Basic search:** On TCG card/set list pages, type to filter by name/text in current scope (TCG or set context)
- **Advanced search:** Modal from Search tab or "Advanced" icon on list pages; supports multi-TCG and all filter facets
- **Search scope:** Home page basic search queries all TCGs; TCGs/sets basic search queries within scope.

## Offline UX Rules
- In Offline Mode, TCG card image resolver prefers local assets first and avoids remote fetches.
- If requested content is not downloaded, show actionable state (`Download this TCG`).
- Account and TCGs surfaces must show per-TCG status (`Downloaded`, `Update available`, etc.).
- Shared image component must enforce local-first policy consistently across all screens.

## Confirmed UX Decisions
- Binder TCG card picking reuses the normal browse/search experience in a dedicated picker context.
- Picker context adds contextual CTA copy such as "Add to current binder" in list/detail screens.
- Picker context is route-driven (stack/modal flow), not an isolated duplicate component tree.
