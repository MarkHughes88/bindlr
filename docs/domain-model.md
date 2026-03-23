# Domain Model

Last updated: 2026-03-23

All references updated to CatalogTcgCard, CustomTcgCard, and TcgCard.

## Overview

The domain model centers around TCG (Trading Card Game) cards, collections, user wishlists, and binders. Catalog TCG cards are read-only reference data, while custom TCG cards and wishlists allow user personalization.

## Core Entities

### UserProfile (MVP: Single Local Profile)
- Represents the current user on device
- Fields: id ('local' in MVP), name, email, avatarUrl, createdAt, updatedAt
- In MVP: Single immutable record per device (no login/logout)
- Future: Nullable userId for account-backed auth (Phase 4.1)

### Wishlist
- User-created collection of cards marked for future purchase
- Fields: id, name (e.g., "Holo Collection", "Set Goals"), createdAt, updatedAt
- Users can create unlimited wishlists
- Wishlists are independent of binder "needed" status

### WishlistCard
- Link between Wishlist and CatalogTcgCard
- Fields: wishlistId, catalogTcgCardId, addedAt
- One card can be in multiple wishlists
- Remove from wishlist via this relationship

### CatalogTcgCard
- Read-only reference data for official TCG cards
- Contains: id, name, number, rarity, images, set information
- Sourced from official TCG APIs (Pokemon, MTG, Lorcana, One Piece)
- Immutable - cannot be modified by users

### CustomTcgCard
- User-created TCG cards
- Extends catalog data with custom fields
- Allows modifications to images, names, attributes
- Stored in user collections

### InventoryItem
- Represents owned TCG cards (catalog or custom)
- Links to either CatalogTcgCard or CustomTcgCard
- Contains: quantity, condition, notes, language
- Kind: "catalog-tcg-card" | "custom-tcg-card"

### CollectionSlot
- Represents TCG cards in user collections
- Links to either CatalogTcgCard or CustomTcgCard
- Contains: position, display preferences
- Kind: "catalog-tcg-card" | "custom-tcg-card"

### RecentTcgCardView
- Records that a user has viewed a specific TCG card
- One row per unique card identity (deduplicated, not an event log)
- Contains: kind, tcg, catalogTcgCardId or customTcgCardId, language, viewedAt
- Kind: "catalog-tcg-card" | "custom-tcg-card"
- viewedAt is updated on repeat views, not duplicated
- Pruned to a rolling retention limit (100 rows)

### Binder
- User-created collection container for cards
- Fields: id, name, description, createdAt, updatedAt
- Current MVP persistence stores aggregate binder metadata plus flat slot placement records
- Current builder entry route is `/binder-builder?binderId=<id>`
- Full page/spread-aware editing remains planned work

### BinderConfig
- Configuration for a binder (shared across all pages)
- Fields: binderId, rowsPerPage, colsPerPage, defaultPageCount, capacity
- Example prefab: rows=4, cols=3, defaultPageCount=20, capacity=240 (actually stores multiple slides per physical pocket)
- Can be modified after binder creation (automatically adds/removes trailing pages)
- Current MVP only persists binder total capacity directly on the binder row
- Structured binder config remains a planned expansion

### BinderPage
- A single two-page spread in a binder
- Fields: id, binderId, pageNumber, leftPageSlots, rightPageSlots
- Left page = slots 1-9 (for 3x3 grid)
- Right page = slots 10-18 (for 3x3 grid)
- Spread-aware: No left page before first, no right page after last
- Planned model, not yet implemented in the current SQLite schema

### BinderSlot
- Individual slot on a binder page
- Fields: id, pageId, slotIndex (1-18 for 3x3 page), cardReference, status
- cardReference: CatalogTcgCard or CustomTcgCard (discriminated union)
- status: owned-linked | missing (if linked to inventory, shows color; if missing, shows greyscale)
- Can be empty
- Current MVP uses `binder_cards` with `binder_id + slot_index` and catalog card identity fields (`catalog_tcg_card_id`, `tcg`, `language`, `variant_name`)
- Current card-detail flow can add a card to the first free slot and then open the builder placeholder in landscape

### ImageCache
- Metadata tracking for downloaded card images
- Fields: tcgCardId, imageStatus ('placeholder' | 'loading' | 'loaded' | 'failed'), cachedAt
- Speeds up image resolution (avoid repeated fetch attempts for failed downloads)
- Auto-cleanup: Failed images expire after 7 days, can be retried

### DownloadPack
- Metadata for downloaded TCG pack (images for a full set or TCG)
- Fields: id, tcg, setId (optional), status, downloadedAt, size, imageCount
- status: 'downloading' | 'complete' | 'partial' (incomplete downloads marked for retry)
- Allows bulk image management (download all Pokemon images, delete Lorcana images, etc.)

## Relationships

### Card → InventoryItem → CatalogTcgCard/CustomTcgCard → InventoryItem
- InventoryItem references either catalogTcgCardId or customTcgCardId
- If kind === "catalog-tcg-card": links to CatalogTcgCard
- If kind === "custom-tcg-card": links to CustomTcgCard

### Card → CollectionSlot → CatalogTcgCard/CustomTcgCard → CollectionSlot
- CollectionSlot references either catalogTcgCardId or customTcgCardId
- If kind === "catalog-tcg-card": links to CatalogTcgCard
- If kind === "custom-tcg-card": links to CustomTcgCard

## Business Rules

### Catalog TCG Cards
- Read-only reference data
- Cannot be modified by users
- Used for official card information
- Synchronized from external APIs

### Custom TCG Cards
- User-created and modifiable
- Can override catalog data
- Stored locally in user database
- Support custom images and attributes

### Inventory Management
- Users can own multiple copies of catalog TCG cards
- Custom TCG cards can be created and owned
- Each inventory item has quantity and condition tracking

### Collections
- Users organize cards into custom collections
- Collections can contain both catalog and custom TCG cards
- Display preferences stored per collection slot

## Data Flow

1. **Import**: Catalog TCG cards loaded from external APIs
2. **Storage**: Catalog data stored as JSON fixtures
3. **Lookup**: Fast indexed access by ID and language
4. **Display**: Resolved data combines catalog + user data
5. **Modification**: Only custom TCG cards can be edited

## Examples

### Creating Inventory Item
```typescript
// For catalog TCG card
const item: OwnedItem = {
  id: "owned-001",
  kind: "catalog-tcg-card",
  catalogTcgCardId: "base1-1",
  quantity: 2,
  condition: "nm"
};

// For custom TCG card
const item: OwnedItem = {
  id: "owned-002",
  kind: "custom-tcg-card",
  customTcgCardId: "custom-001",
  quantity: 1
};
```

### Card Resolution
```typescript
// Catalog TCG card lookup
const catalogCard = getCatalogTcgCardById("pokemon", "base1-1", "en");
// Returns: CatalogResolvedTcgCard with full details

// Custom TCG card lookup
const customCard = getCustomTcgCardById("custom-001");
// Returns: CustomTcgCard with user modifications
```

## Summary

Catalog TCG cards are read-only reference data from official sources, while custom TCG cards allow user customization. The inventory and collection systems work with both types through a unified interface using kind discrimination.
