# Schema Direction

Uses catalog_tcg_cards, custom_tcg_cards, and catalog_tcg_card_id consistently.

## Database Tables

### user_profiles (MVP: Single Local Profile)
- Stores current user's profile data
- Primary key: `id` (string, 'local' in MVP)
- Columns: `id`, `name`, `email`, `avatar_url`, `created_at`, `updated_at`
- In MVP: Single immutable row ('local' profile)
- Future: Supports multiple users with account-backed auth (field `auth_provider` added in Phase 4.1)

### catalog_tcg_cards
- Stores official TCG card data from external APIs
- Primary key: `id` (string)
- Foreign keys: `tcg` (enum), `set_id` (string)
- Read-only data, updated via sync processes

### custom_tcg_cards
- Stores user-created TCG cards
- Primary key: `id` (string)
- Foreign keys: `user_id` (string, nullable in MVP, references user_profiles)
- Allows full user modification of card data

### tcg_card_price_snapshots
- Historical price data for TCG cards
- Foreign keys: `catalog_tcg_card_id` (string), `source` (string)
- Tracks price changes over time

### recent_tcg_card_views
- Rolling list of the most recently viewed TCG cards per user
- Primary key: `id` (string UUID)
- Columns: `id`, `kind`, `tcg`, `catalog_tcg_card_id`, `custom_tcg_card_id`, `language`, `viewed_at`, `created_at`, `updated_at`
- One row per unique card identity — deduplicated by `(tcg, catalog_tcg_card_id, language)` for catalog cards or `(custom_tcg_card_id)` for custom cards
- On repeat view: update `viewed_at` on the existing row (upsert)
- Pruned to a retention limit of 100 rows, ordered by `viewed_at desc`
- Does not store display data (title, image, set) — those are resolved at query time from catalog

### wishlists
- User-created wishlist collections
- Primary key: `id` (string UUID)
- Columns: `id`, `user_id` (references user_profiles, nullable in MVP), `name`, `description`, `created_at`, `updated_at`
- One row per wishlist (e.g., "Holo Collection", "Set Goals")
- Supports full CRUD: create, rename, reorder, delete

### wishlist_cards
- Links between wishlists and cards
- Primary key: `id` (string UUID)
- Columns: `id`, `wishlist_id` (references wishlists), `catalog_tcg_card_id` (references catalog_tcg_cards), `added_at`
- One row per (wishlist, card) pair
- Supports multi-select: one card can be in multiple wishlists
- Foreign key: `(wishlist_id, catalog_tcg_card_id)` unique constraint (no duplicates within same wishlist)

### binders
- User-created binders for organizing cards
- Primary key: `id` (string UUID)
- Columns: `id`, `user_id` (references user_profiles, nullable in MVP), `name`, `description`, `config_id`, `created_at`, `updated_at`
- Each row is one binder (e.g., "My Holo Binder", "Set Showcase")

### binder_configs
- Configuration for binder grid and capacity
- Primary key: `id` (string UUID)
- Columns: `id`, `binder_id` (references binders), `rows_per_page`, `cols_per_page`, `default_page_count`, `capacity`, `cover_color`, `inside_color`, `created_at`, `updated_at`
- Example: rows=4, cols=3, default_page_count=20 → 240 total slots
- Configuration applies to all pages of the binder

### binder_pages
- Individual pages (spreads) in a binder
- Primary key: `id` (string UUID)
- Columns: `id`, `binder_id` (references binders), `page_number`, `left_page_filled`, `right_page_filled`, `created_at`, `updated_at`
- page_number: Sequential index (1, 2, 3, ...)
- Spread-aware: No left page before page 1, no right page after last page
- Two pages per spread (left and right), but stored as separate logical pages in slots

### binder_slots
- Individual slots on a binder page
- Primary key: `id` (string UUID)
- Columns: `id`, `page_id` (references binder_pages), `slot_index` (1-18 for 3x3 page), `card_kind` ('catalog-tcg-card' | 'custom-tcg-card'), `catalog_tcg_card_id`, `custom_tcg_card_id`, `status` ('owned' | 'missing'), `created_at`, `updated_at`
- Discriminated union: either catalog_tcg_card_id or custom_tcg_card_id is non-null, not both
- status = 'owned' → display color; status = 'missing' → display greyscale

### inventory_items
- Represents owned TCG cards (catalog or custom)
- Primary key: `id` (string UUID)
- Columns: `id`, `user_id`, `catalog_tcg_card_id`, `custom_tcg_card_id`, `kind`, `quantity`, `condition`, `notes`, `language`, `created_at`, `updated_at`
- kind: 'catalog-tcg-card' | 'custom-tcg-card'
- Discriminated union: either catalog_tcg_card_id or custom_tcg_card_id is non-null
- Tracks ownership and quantity separately from binder placement

### download_scopes
- Logical download batches at card/set/TCG granularity
- Primary key: `id` (string UUID)
- Columns: `id`, `scope_type` ('card' | 'set' | 'tcg'), `tcg`, `set_id`, `language`, `status` ('idle' | 'queued' | 'running' | 'partial' | 'complete' | 'failed'), `requested_total`, `downloaded_total`, `failed_total`, `created_at`, `updated_at`
- Unique key: `(scope_type, tcg, set_id, language)`
- Used for progress indicators and row-level status badges in TCG/Set/Card lists

### download_assets
- Canonical per-asset download state (currently card-image assets)
- Primary key: `id` (string UUID)
- Columns: `id`, `asset_kind` ('card-image'), `tcg`, `set_id`, `catalog_tcg_card_id`, `language`, `source_url`, `local_uri`, `file_size_bytes`, `status` ('queued' | 'running' | 'downloaded' | 'failed'), `attempt_count`, `last_error`, `last_error_at`, `downloaded_at`, `created_at`, `updated_at`
- Unique key: `(asset_kind, tcg, set_id, catalog_tcg_card_id, language)`
- `source_url` is currently taken directly from catalog DB/JSON image URL fields
- `local_uri` points to app-managed persisted files (document storage) for offline rendering
- TODO: swap source URL resolution to first-party server/CDN manifests

### download_scope_assets
- Join table between scopes and assets
- Primary key: `(scope_id, asset_id)`
- Columns: `scope_id`, `asset_id`, `created_at`
- Enables one asset to participate in multiple scopes (card, set, tcg)

### download_jobs
- Execution queue for download work
- Primary key: `id` (string UUID)
- Columns: `id`, `scope_id`, `asset_id`, `source_url`, `status` ('queued' | 'running' | 'downloaded' | 'failed'), `attempt_count`, `error_message`, `started_at`, `completed_at`, `created_at`, `updated_at`
- Unique key: `(scope_id, asset_id)`
- Used to process pending downloads incrementally and resume safely after app restarts

## Naming Conventions

- **Table names**: snake_case (user_profiles, wishlist_cards)
- **Column names**: snake_case (catalog_tcg_card_id, user_id)
- **Primary keys**: `id` (string UUID)
- **Foreign keys**: `{referenced_table}_id`
- **Timestamp suffixes**: `_at` (created_at, updated_at)
- **Enums**: PascalCase values (e.g., 'owned' | 'missing')

## Data Types

- **IDs**: string (UUID format)
- **TCG types**: enum ('pokemon', 'mtg', 'lorcana', 'one-piece')
- **Languages**: enum ('en', 'ja')
- **Timestamps**: ISO 8601 string format
- **Booleans**: 0/1 integer or true/false
- **Status fields**: lowercase string enum

## Relationships

- `user_profiles` → `wishlists` (1:many, nullable foreign key in MVP)
- `user_profiles` → `binders` (1:many, nullable foreign key in MVP)
- `wishlists` → `wishlist_cards` (1:many)
- `wishlist_cards` → `catalog_tcg_cards` (many:1)
- `binders` → `binder_configs` (1:1)
- `binders` → `binder_pages` (1:many)
- `binder_pages` → `binder_slots` (1:many)
- `binder_slots` → `catalog_tcg_cards` or `custom_tcg_cards` (many:1, discriminated)
- `catalog_tcg_cards` → `tcg_card_price_snapshots` (1:many)
- `download_scopes` → `download_scope_assets` (1:many)
- `download_assets` → `download_scope_assets` (1:many)
- `download_scopes` → `download_jobs` (1:many)
- `download_assets` → `download_jobs` (1:many)
- `recent_tcg_card_views` → `catalog_tcg_cards` or `custom_tcg_cards` (many:1, resolved at query time)

## Migration Strategy

1. Use existing data as baseline
2. Apply consistent naming across all tables
3. Update foreign key references
4. Migrate data with transformation scripts
5. Update application code to use new schema
