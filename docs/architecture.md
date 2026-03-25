# Architecture

Last updated: 2026-03-25

Current feature architecture is organized around `catalog` + user-owned domains.

## Project Structure

### Feature Organization
```
src/features/
├── catalog/           # Unified card browsing, advanced filters, sorting, facets
│   ├── components/    # Catalog list/filter UI
│   ├── screens/       # Catalog list/detail-adjacent screens
│   ├── catalog.repository.sqlite.ts
│   ├── catalog.filters.ts
│   ├── catalog.gameSpecific.ts
│   └── catalog.sort.ts
├── home/              # Home dashboard, recents, summary rails
├── search/            # Search input/helpers/repository
├── inventory/         # Owned card data and inventory summaries
├── binders/           # Binder editor and slot placement flows
├── collections/       # Ownership collections/wishlist domain
└── downloads/         # Image download scopes/assets/jobs and queue processing
```

## Key Principles

### Domain Separation
- Catalog data is read-only and loaded from app JSON fixtures.
- User-owned data is persisted in SQLite.
- UI composes catalog + user ownership state at read time.

### Filter Architecture
- `CatalogScreenFilters` is the screen-level source of truth.
- Repository takes mapped filters via `toCatalogCardFilters`.
- Game-specific facets are descriptor-driven in `catalog.gameSpecific.ts`.
- Facets are generated in repository with scoped keys (`tcg:value`).
- Advanced filter sheet is draft/apply with clear-all and active counts.

### Data Loading Model
1. Catalog JSON is imported in `src/lib/catalog/catalog.lookup.ts`.
2. Repositories resolve card/set details from lookup indexes.
3. UI screens request paged cards + facets from the catalog repository.
4. Ownership filters merge in SQLite inventory state.

### Download Model
- Download scopes are represented at `card`, `set`, and `tcg` levels.
- Scope membership is expanded into concrete assets (currently card images) and queued as jobs.
- Jobs currently download directly from catalog-provided image URLs (`imageLarge`/`imageMedium`/`imageSmall`) and persist files locally.
- Persisted files are stored in app-managed document storage under `downloads/cards`.
- Downloaded file URI is tracked on `download_assets.local_uri` with `file_size_bytes`.
- TODO: replace direct catalog URL downloads with first-party server/CDN manifest URLs.
- Download persistence tables are introduced in migration `007_downloads_foundation` and local-file columns in migration `008_download_asset_local_paths`.

## Routing Summary

- `app/(tabs)/catalog.tsx` is the tab-context browse route for TCGs, sets, and cards.
- Route params drive catalog level and scope:
	- `?level=tcgs|sets|cards`
	- `?tcg=<id>` for game-scoped set/card browsing
	- `?mode=recentlyViewed|wishlist|missingCards` for specialized card-list modes
	- `?q=<query>` for route-provided search text where needed
- `app/tcg-card/[tcgCardId].tsx` remains the shared detail route.
- `app/binder-builder.tsx` is now the canonical first binder-builder surface and accepts `?binderId=<id>`.
- Binder list and card-detail binder actions now push into `/binder-builder`.

### Global Menu
- Global bottom menu is mounted in `app/_layout.tsx`.
- Menu is hidden only on binder builder (`/binder-builder`).

## Binder Builder Status

- Binder list screen is live in `src/features/binders/screens/BindersScreen.tsx`.
- First binder-builder screen is live in `src/features/binders/screens/BinderBuilderScreen.tsx`.
- Builder currently gates on landscape orientation:
	- portrait shows a rotate-device prompt
	- landscape shows a placeholder builder canvas so the route and orientation flow can be validated before slot/page tooling lands

## Catalog Performance Notes

- Catalog filtering uses descriptor-driven facet logic with scoped keys.
- Repository path includes lightweight in-memory caching for filtered-card results.
- A per-TCG/language in-memory index is built lazily for set/rarity/type/game-specific lookups.
- Development profiling timers are available in repository fetch paths (`page.fetch`, `facets.fetch`, and filter/index timings).

### Shared UI Contracts
- `TcgCard` is the base reusable card visual component.
- `CatalogFiltersSheet` handles advanced facet UX.
- `SlideUpMenu`, `Pill`, and shared `Button` variants are reused across list controls.
- Shared icon usage goes through `src/shared/ui/Icon.tsx`.
- Add new reusable icons there first using a semantic app-level name (`APP_ICON_NAMES`) and then consume that semantic name from screens/components instead of hard-coding raw Lucide names in each feature.

## Future Direction: Route-as-Source-of-Truth

The catalog system currently uses a store-driven model:
route → context → store → UI

In the future, this may evolve toward a route-as-source-of-truth model:
route = state, store = cache/persistence layer

In that model:
- URL parameters fully define catalog state (level, tcg, search query, filters, sort)
- UI reads directly from route params
- store is used for caching, async safety, and optional persistence
- pre-navigation store mutations are eliminated entirely

This would improve:
- deep linking
- state reproducibility
- debugging
- consistency between navigation and UI state

This is not implemented yet and should not be attempted until:
- catalog system is stable
- feature set is complete enough to justify the change