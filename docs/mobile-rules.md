# Mobile Rules

Last updated: 2026-03-25

These rules reflect the current Expo Router structure and card-browsing flows.

## Orientation

- App orientation is no longer globally locked to portrait in Expo config.
- Binder builder handles orientation at the screen level by showing a rotate prompt in portrait and the builder surface in landscape.

## Navigation Structure

### Root Stack
- `app/_layout.tsx` - App root stack (`headerShown: false`, iOS edge-swipe back enabled)

### Tabs
- `app/(tabs)/_layout.tsx` - Tab navigator container
- `app/index.tsx` - Home route (exports `HomeScreen`)
- `app/(tabs)/binders.tsx` - Binders tab route
- `app/(tabs)/search.tsx` - Search tab route

### Pushed Routes

- `app/tcg-card/[tcgCardId].tsx` - TCG card detail route
- `app/binder-builder.tsx` - Canonical binder builder route: `/binder-builder`
	- Supports `?binderId=<id>`
	- Portrait shows a rotate-device prompt
	- Landscape shows the current builder placeholder surface

### Removed/Consolidated Routes
- `app/recently-viewed.tsx` was removed

## Global Bottom Menu Rules

- Global bottom menu is rendered from `app/_layout.tsx` via `GlobalBottomNav`
- Menu is visible on all routes by default
- The only hidden route is binder builder: `/binder-builder`

## Route Usage Conventions

- Use `/cards` for tab-context card listing where the tab shell should remain active
- Use `/card-list` for stacked/contextual card listing flows (for route-scoped pushes)
- Use `/tcg-card/[tcgCardId]` for detail navigation
- Binder builder route is fixed to `/binder-builder`
- Binder builder entry points should pass `binderId` when opening an existing or newly created binder
- Validate route params at route boundary before applying filters

Examples:

```typescript
router.push('/cards?tcg=mtg');
router.push('/card-list?tcg=mtg');
router.push('/cards?mode=recentlyViewed');
router.push('/binder-builder?binderId=binder-123');
router.push({
	pathname: '/tcg-card/[tcgCardId]',
	params: { tcgCardId, tcg, language },
});
```

TODO: Catalog Navigation Consistency
- Standardize all catalog navigation to a single Expo Router path-based pattern
- Avoid mixing different catalog route styles across the app
- Prefer one consistent route structure for catalog flows, for example:
  '/(tabs)/catalog?...'
- This should be cleaned up in a future pass to prevent subtle navigation regressions

## Screen Layout Rules

- Shared `Screen` wrapper is the universal shell for scrollable feature screens
- Universal top content offset is applied in `src/shared/ui/Screen.tsx` (`paddingTop: spacing.xxl`)
- Vertical safe-area edges can be controlled per screen via `edges` prop
	- Current cards/home screens use `edges={['left', 'right']}` for edge-to-edge vertical layout


## Binder Builder Rules

- Binder builder is the only current orientation-gated surface.
- Binder builder now uses edge-to-edge layout: SafeAreaView is set to `edges={['top', 'bottom']}` to remove left/right insets and allow true full-width content.
- Do not hard-lock device orientation yet; instead, detect portrait and render the rotate prompt.
- Orientation is locked to landscape only while on the binder builder screen, and restored to portrait on exit.
- Until the full editor lands, all binder-open actions should still route to `/binder-builder` so the flow can be validated end-to-end.

## Naming and Terminology

- Prefer `TcgCard` for reusable card visual components
- Use `Catalog` naming for cross-TCG browse/filter flows (`catalog.*`)
- Keep user-facing language specific: `TCG cards`, `catalog`, `recently viewed`

### Future Catalog State Model (Planned)

- The current system uses a store-driven model for catalog state
- A future version may move to route-driven state
- When implemented:
	- route params will become the single source of truth
	- store will act as a cache and persistence layer
- Until then:
	- the store remains the authoritative source of catalog state
	- do not bypass store logic