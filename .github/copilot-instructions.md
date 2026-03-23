# Copilot Instructions – bindlr Mobile

These instructions guide AI-assisted code generation for this repository.

The goal is to maintain consistent architecture, naming conventions, and patterns across the project.

Full architectural documentation can be found in:

- docs/mobile-rules.md
- docs/domain-model.md

AI tools should follow these instructions when generating or modifying code.

---

# Project Overview

bindlr Mobile is an offline-first trading card collection app.

Primary features include:

- browsing card databases
- building binder-style collections
- tracking owned inventory
- assigning owned cards to binder slots
- managing wishlists and upgrades
- supporting custom pages and assets

The app must remain usable without internet access for core features.

---

# Technology Stack

- React Native
- Expo
- Expo Router
- TypeScript
- SQLite (for user data)

Catalog data (cards, expansions, etc.) is bundled with the app.

---

# Architecture Rules

### Routing

Routes are managed with Expo Router.

Rules:

- Route files live in `/app`
- One route file per screen
- Dynamic routes use `[param]` naming
- Screens should not contain reusable component logic

Examples:

- `app/index.tsx`
- `app/tcg-card/[tcgCardId].tsx`
- `app/browse/collections.tsx`

---

# Folder Structure

Preferred project structure:

app/
src/
  components/
  features/
    tcgCards/
    tcgs/
    inventory/
    assets/
  db/
  lib/
  styles/
  types/
  data/
docs/

Responsibilities:

| Folder | Purpose |
|------|------|
| app | route-level screens |
| components | reusable UI components |
| features | feature-specific logic |
| db | SQLite setup and queries |
| lib | generic helpers |
| styles | theme and shared styles |
| types | shared TypeScript types |
| data | bundled catalog data |

---

# Component Rules

### Presentational components

Presentational components should:

- receive data through props
- avoid database queries
- avoid navigation logic
- avoid side effects

### Screen components

Screens may:

- read route params
- fetch or load data
- coordinate feature logic
- compose UI components

### Interactivity

If a component is interactive, it should be explicit in the component API.

Examples:

- `PokemonTcgCard`
- `PokemonTcgCardButton`
- `CollectionSlotTcgCard`

---

# Data Model Rules

Terminology:
- Use `TCGs` when referring to game-grouping browse surfaces.
- Use `collection`/`collections` only for ownership-domain containers (for example wishlist or slot collections).

The app separates **catalog data** from **user data**.

### Catalog Data (read-only)

Examples:

- TCG cards
- expansions
- TCG card metadata
- image references

Catalog data should never be modified by the app.

### User Data (SQLite)

Examples:

- ownership collections
- collection slots
- inventory items
- slot assignments
- custom assets

---

# Core Domain Concepts

### TcgCard

A read-only catalog record from the bundled dataset.

Uses canonical Scrydex TCG card IDs.

---

### Collection

A user-created grouping such as:

- binder
- wishlist
- themed collection

Collections contain **slots**, not just cards.

---

### CollectionSlot

A fixed position within a collection.

Slots allow the app to represent:

- binder pages
- missing cards
- placeholders
- upgrade targets
- custom images

---

### InventoryItem

Represents how many copies of a TCG card the user owns.

Example:

`tcgCardId: base1-4`
`quantity: 3`

---

### SlotAssignment

Links an owned TCG card copy to a collection slot.

Owning a TCG card does not automatically fulfill every slot.

Assignments must be explicit.

---

# Styling Rules

Use `StyleSheet.create`.

Prefer shared theme tokens instead of random inline styles.

The app is **dark theme first**.

Avoid inline styling unless trivial.

---

# Image Rules

For card lists:

- use **small images**

For detail pages:

- medium or large images may be used

The long-term goal is **offline images bundled with the app**.

---

# Performance Rules

Avoid loading unnecessarily large datasets into UI state.

Prefer indexed lookups.

Use `FlatList` for large lists.

---

# Coding Style

- Use TypeScript types for domain objects
- Prefer small, focused functions
- Avoid giant React components
- Extract reusable UI when appropriate
- Keep naming clear and descriptive

Avoid:

- vague helper names like `utils2.ts`
- unnecessary abstractions
- premature optimization

---

# Development Philosophy

Prefer building **complete vertical slices** rather than partially implementing many features.

Example order:

1. TCG card browsing
2. TCG card detail
3. SQLite setup
4. TCG browse surfaces
5. slot assignment
6. inventory tracking
7. custom assets
8. backup/export

---

# Code Patterns

### Type Imports
```typescript
// ✅ Correct
import type { TcgCardSummary, CatalogTcgCard } from '@/features/tcgCards/tcgCards.types';

// ❌ Incorrect
import type { CardSummary } from '@/features/cards/cards.types';
```

### Component Props
```typescript
// ✅ Correct
interface TcgCardProps {
  tcgCard: TcgCardSummary;
  onPress?: (tcgCardId: string) => void;
}

// ❌ Incorrect
interface CardProps {
  card: CardSummary;
  onPress?: (cardId: string) => void;
}
```

### Route Parameters
```typescript
// ✅ Correct
const { tcgCardId } = useLocalSearchParams<{ tcgCardId: string }>();
<Link href={`/tcg-card/${tcgCardId}`}>View Card</Link>

// ❌ Incorrect
const { cardId } = useLocalSearchParams<{ cardId: string }>();
<Link href={`/card/${cardId}`}>View Card</Link>
```

---

# Business Rules

### Catalog vs Custom
- **CatalogTcgCard**: Read-only, official data, cannot be modified
- **CustomTcgCard**: User-created, fully modifiable, local storage
- Use `kind` field to discriminate: `"catalog-tcg-card"` | `"custom-tcg-card"`

### ID Formats
- **tcgCardId**: `{setCode}-{cardNumber}` (e.g., "base1-1", "mh3-123")
- **catalogTcgCardId**: Same as tcgCardId for catalog cards
- **customTcgCardId**: UUID for custom cards

### Data Flow
1. Catalog data loaded from JSON fixtures
2. User data stored in SQLite database
3. UI combines catalog + user data for display
4. Modifications only allowed on custom TCG cards

---

# Common Mistakes to Avoid

- Using generic "Card" instead of "TcgCard"
- Mixing `cardId` and `tcgCardId` parameters
- Importing from old `features/cards/` paths
- Creating components named just "Card" without TCG context
- Forgetting to handle both catalog and custom TCG card types

---

# Search & Discovery

- Use "TCG card search" in user-facing text
- Search results return `SearchResultItem` with `type: "tcg-card"`
- Filter by TCG type (pokemon, mtg, lorcana, one-piece)
- Support multiple languages (en, ja)
