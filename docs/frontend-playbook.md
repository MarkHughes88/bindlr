# Frontend Playbook

## 1. Add a New Screen (Checklist)
1. Create route file in `app/`.
- Example: `app/binders/[binderId].tsx`

2. Create feature screen component.
- Example: `src/features/binders/screens/BinderDetailScreen.tsx`

3. Parse route params in route file.
- Validate required params before rendering screen.

4. Keep data loading in feature hook.
- Example: `useBinderDetail(...)`.

5. Use shared layout components.
- `Screen`
- `Header` with `hasBackBtn` when needed
- shared error/loading views

6. Wire navigation from entry points.
- Home, tabs, list items, or CTA buttons.

7. Add loading/empty/error states.
- Never ship a screen with only a happy-path state.

## 1.5 Core Screen Contracts

TCGs screen
- Render one row/tile per TCG.
- Show TCG logo + download status text.
- Primary action opens Sets/Cards scoped to selected TCG.

Sets screen
- Scoped to selected TCG.
- Row content: set logo/name + owned/total + completion percent + progress bar.
- Include set search.
- Include language pill switcher when multiple languages exist in data.

Cards screen
- Scope behavior:
  - direct open with no context -> all TCG cards
  - open from tcg/set -> scoped by current context
- Include status pills: `owned | all | wishlist | needed for binders`.
- Include search, filters, and sort controls.

Search component behavior
- Default to current scope (current TCG/set) when present.
- Fall back to all TCGs when no scope context exists.

Header account icon behavior
- top-right account icon on primary screens.
- default user icon when no avatar.
- avatar when selected.
- login/register affordance when unauthenticated.

Account section (initial)
- avatar upload/change
- name, email, password form actions

Auth screens
- login and register forms with validation/error states.
- social sign-in entry (Google first) where enabled.

## 1.1 Pokemon Detail Screen Content Contract
For `tcg === "pokemon"`, render sections in this order when fields exist:

1. Hero summary
- image
- name
- HP
- stage/classification
- type badge/icon

2. Abilities and attacks
- ability chip + name + text
- attack rows: energy cost, name, damage, description

3. Battle metadata
- weakness
- resistance
- retreat cost

4. Card metadata
- expansion/set name + code
- card number
- rarity
- illustrator
- Pokedex number
- regulation mark
- format/legality

5. Ownership/actions
- quantity steppers
- owned/missing controls

6. Optional price row
- render only when reliable price data is present

Implementation rule
- All fields are conditional: if data is absent, omit row/section instead of showing placeholder junk.

## 1.2 Lorcana Detail Screen Content Contract
For `tcg === "lorcana"`, render sections in this order when fields exist:

1. Hero summary
- image
- name
- version/subtitle
- rarity
- TCG card type/ink color indicators

2. Core gameplay stats
- cost
- strength
- willpower
- lore value
- inkwell flag

3. Abilities and rules
- keyword chips
- abilities (name + text)
- rules text entries
- source/franchise tag

4. TCG card metadata
- expansion/set name + code
- card number/local id
- artist
- legality entries
- available variant names (normal/coldFoil/holofoil when present)

5. Ownership/actions
- quantity steppers
- owned/missing controls

Implementation rule
- All fields are conditional: if data is absent, omit row/section instead of placeholder noise.

## 1.3 MTG Detail Screen Content Contract
For `tcg === "mtg"`, render sections in this order when fields exist:

1. Hero summary
- image
- name
- mana cost
- mana value
- rarity
- type line (types/subtypes/supertype)

2. Rules and stats
- rules text
- keyword chips
- power/toughness row
- loyalty row
- layout

3. Identity and legality
- colors
- color identity
- legality entries

4. Card metadata
- expansion/set name + code
- card number/local id
- artist
- finish/variant names when provided

5. Ownership/actions
- quantity steppers
- owned/missing controls

Implementation rule
- All fields are conditional: if data is absent, omit row/section instead of placeholder noise.

## 1.4 One Piece Detail Screen Content Contract
For `tcg === "one-piece"`, render sections in this order when fields exist:

1. Hero summary
- image
- name
- rarity
- type line (types/subtypes/supertype)
- color chips
- card attribute badge

2. Core gameplay stats
- cost
- power
- counter

3. Rules text
- effect
- trigger
- version text
- tags
- source text
- legality entries

4. Card metadata
- expansion/set name + code
- card number/local id
- artist
- finish/variant names when provided

5. Ownership/actions
- quantity steppers
- owned/missing controls

Implementation rule
- All fields are conditional: if data is absent, omit row/section instead of placeholder noise.

## 2. Build a Modal (Checklist)
1. Decide modal purpose: info, confirm, picker, editor.
2. Use one controlled state source in parent screen.
3. Keep modal content pure and reusable.
4. Use explicit primary/secondary actions.
5. Close behavior:
- on backdrop press (if safe)
- on hardware back (Android)
- after successful action
6. Keep business logic in hooks/repository calls, not inside modal JSX.

## 2.2 First-Launch Offline Prompt (Recommended)
Use a first-run modal to explain offline downloads and collect initial TCG choices.

1. Trigger once on first app launch after onboarding readiness checks.
2. Explain tradeoff clearly: offline support requires downloading selected TCG packs.
3. Allow multi-select TCG choices and immediate download start.
4. Allow skip for now, but keep clear entry point in Account and TCGs.
5. Persist completion flag so prompt is not shown repeatedly.

## 2.1 Bottom Menu Popup Pattern (Recommended)
Use this for footer icons that should open popup menus or action panels.

1. Keep root navigation as `Stack` and treat tabs as one branch.
- `app/_layout.tsx` owns the root stack.
- `app/(tabs)/_layout.tsx` owns persistent top-level tabs.

2. Add popup routes as stack screens with modal presentation.
- Example routes:
  - `app/(modals)/menu.tsx`
  - `app/(modals)/filters.tsx`
  - `app/(modals)/quick-actions.tsx`

3. Trigger popup routes from custom footer buttons.
- Use `router.push("/(modals)/menu")` from icon press.
- Keep popup content in feature components, route file stays thin.

4. Prefer route-driven modals over local component state for global menus.
- Better deep-linking and consistent back behavior.
- Works like your TCG card detail navigation flow.

5. Keep one icon behavior per slot.
- Navigation icon: `router.push(...)` to full screen.
- Action icon: open modal route.
- Do not mix both behaviors on the same icon.

6. Main nav required destinations
- `Home`
- `TCGs`
- `Sets`
- `Cards`
- `Search` (opens search surface)
- `Filter` (opens filter surface for current context)

## 3. Binder Builder Architecture

## 3.1 Card Picking Workflow Decision (Recommended)
Question: should binder slot selection send users through normal sets/cards screens with a flag, or use a separate modal component?

Recommended answer: use shared screens in a dedicated picker navigation context.

Why this is best
- Reuses your existing browse/search/detail UI and avoids duplicate maintenance.
- Keeps user mental model consistent (same filters, same navigation patterns).
- Adds binder-specific CTA and behavior only when picker intent is active.

How to implement
1. Start picker flow from binder page editor.
- Route example: `/(picker)/sets?intent=binder-slot&binderId=...&pageId=...&slotIndex=...`

2. Reuse normal sets/cards/detail feature components.
- Do not fork UI into a separate "picker-only" implementation.

3. Inject context via route params or a small context provider.
- Required: `intent`, `binderId`, `pageId`, `slotIndex`.
- Optional: `returnTo`, preselected `tcg`, preselected `setId`.

4. Show contextual actions when `intent === "binder-slot"`.
- In card list item and detail screen, primary CTA becomes `Add to current binder`.
- Preserve normal read-only navigation and filtering behavior.

5. Close flow and return user to binder editor after successful placement.
- Persist slot placement.
- Navigate back to binder page editor with success feedback.

6. Support staged multi-add in picker context.
- Enable checkbox/select mode in card lists.
- Show selected cards in a collapsible "selection tray".
- Let users tweak before commit (remove items, optional quantity/target adjustments).
- Commit in one action: `Add selected to current binder`.

7. Support set-driven binder creation.
- From sets screens: action `Create binder from set`.
- From existing binder: action `Import cards from set`.
- Use same picker context and auto-placement rules.

8. Support owned-copy assignment.
- If user owns multiple copies, show a picker for which owned instance to place.
- Allow placing as reference-only when no owned instance should be consumed/linked.
- Surface ownership status clearly in slot UI (owned-linked vs reference-only).

When to use a full-screen overlay instead
- Use overlay only for quick pickers with very limited filtering.
- If users need deep set/tcg filtering and TCG card detail checks, prefer full picker route flow.

## Domain model (recommended)
- `Binder`: id, name, cover config, createdAt
- `BinderConfig`:
  - `rows`, `columns` (default `3x3`)
  - `capacity` (default `360`)
  - `prefabId` (optional)
  - `coverColor` (default `black`)
  - `insideColor` (default `black`)
  - `coverImageUri` (optional)
- `BinderSection`: id, binderId, title, sortOrder
- `BinderPage`: id, sectionId, templateId, sortOrder
- `BinderSpread`:
  - first spread has no left page
  - last spread has no right page
- `BinderSlotPlacement`:
  - id, pageId, slotIndex
  - kind: `catalog-tcg-card | custom-tcg-card`
  - catalogTcgCardId/customTcgCardId
  - tcg, language
  - optional `inventoryItemId` when linked to a specific owned copy
  - `assignmentMode`: `owned-linked | reference-only`
  - optional `status`: `owned | missing`
  - optional `slotSpan`: `1 | 2` (custom-card support)
  - notes/display options (optional)

## Binder prefab presets (recommended)
- `4 pocket`: `2x2`, target capacity `160`
- `9 pocket`: `3x3`, target capacity `360`
- `9 pocket XL`: `4x3`, target capacity `480`
- `12 pocket`: `4x3`, target capacity `624`
- `16 pocket XXL`: `4x4`, target capacity `1088`
- `20 pocket XXXL`: `5x4`, target capacity `1280`

## Binder color presets (from current design direction)
- `black` (default)
- `navy`
- `forest`
- `red`
- `teal`
- `yellow`

## Screen stack (recommended)
1. Binder list
- Create/edit/delete binders.

2. Binder detail
- Sections and page counts.

3. Binder page viewer/editor
- Zoomable page canvas.
- Tap slot to view/edit placement.
- TCG card search entry.
- Paging controls: prev/next and first/last.
- Editor actions: move, delete, status assignment, compact, undo, redo.

4. TCG card picker modal
- Search/select TCG card to assign to slot.

## Zoom/Pan best practices
- Use `react-native-gesture-handler` + `react-native-reanimated`.
- Clamp zoom level (example: min 1, max 3).
- Separate gesture layers:
  - layer 1: pan/zoom surface
  - layer 2: slot tap targets
- Disable slot edits while actively panning/zooming.
- Add "Reset zoom" action.
- Keep transforms on one animated container for performance.
- Use portrait lock for non-binder flows and allow landscape in binder page editor if needed.
- Keep toolbar outside the transformed canvas so controls remain tappable at any zoom level.

## Suggested interaction modes
- View mode:
  - Pan/zoom enabled
  - Slot tap opens TCG card detail
- Edit mode:
  - Slot tap opens picker/placement actions
  - Optional drag-to-swap slots
  - Multi-select mode for batch actions (move/delete/status)

## Binder editor behavior rules
- Users can change grid size (rows/columns) after creation.
- Users can add pages at any time.
- First spread must render with no left page.
- Last spread must render with no right page.
- `Compact cards` action removes gaps and fills from first slot in order.
- `Assign status` supports:
  - `owned`: choose inventory copy or add inventory entry
  - `missing`: mark target card as missing
- Custom cards support uploaded image or preset placeholder and 1-slot/2-slot placement.

## 4. Component Reuse Rules
- Use `TcgCard` anywhere a TCG card image is rendered.
- Use `Header hasBackBtn` for back navigation on pushed screens.
- Keep button variants consistent (`primary`, `secondary`, `tertiary`).
- Keep TCG card identity in props, not display-only text blobs.

## 4.1 Offline and Download UX Patterns
- Add a global Offline Mode toggle in Account/Settings.
- Add a Download Manager screen showing per-TCG statuses:
  - Not downloaded
  - Downloading
  - Downloaded
  - Update available
- In TCGs, show contextual action/status per active TCG:
  - `Download TCG`
  - `TCG downloaded`
  - `Update available`
- When update is available, prompt user and allow defer/update-now options.
- Do not block browsing of already-downloaded content while updates download.
- In Offline Mode, image loading should try local bundled/downloaded assets first.

## 4.2 Shared Image Component Contract
Create one reusable component (example: `AppImage`) for all TCG card images, logos, and icons.

Required behavior
1. Thumbnail/logo/icon policy
- Always attempt local/downloaded source first.
- If local is missing, fallback to remote source.

2. TCG card detail policy
- If local downloaded image exists, render it first.
- If local is missing, render remote small image first for fast initial load.
- Start loading remote large image in background.
- Swap to large image when ready using smooth transition (fade/crossfade) to avoid visual jank.

3. Failure handling
- If remote large fails, keep small image displayed.
- If all sources fail, show stable placeholder.

3.1 Ownership visual treatment
- Add ownership-aware rendering for card images:
  - owned -> full color
  - missing/not-owned -> greyscale
- Keep this rule centralized in shared card/image rendering logic (not per-screen overrides).
- Allow explicit opt-out only for screens where greyscale would harm clarity (for example, full detail review).

4. API shape (recommended)
- `localSource`
- `remoteSmallUri`
- `remoteLargeUri`
- `variant`: `thumbnail | logo | icon | card-detail`
- `preferLocal`: boolean (default `true`)
- `isOwned`: boolean (controls color vs greyscale for card variants)

5. Performance notes
- Memoize resolved source selection.
- Avoid repeated source churn when parent rerenders.
- Use cache-aware image library settings where available.

## 4.3 Filter System Contract
Use one shared filter framework with TCG-specific facet configs.

Shared list filters (all TCGs)
- search text
- set
- rarity
- owned status (`owned | missing | all`)
- sort (`number | name | rarity`)
- variant (only when available)

Pokemon facets
- type, supertype, subtype
- HP
- weakness type
- retreat cost
- regulation mark
- legality

Lorcana facets
- ink color/type
- TCG card type/supertype/subtypes
- cost, lore value, strength, willpower
- inkwell
- keyword
- source/franchise
- legality

MTG facets
- colors, color identity
- mana value
- TCG card type/supertypes/subtypes
- keyword
- power/toughness
- loyalty
- legality

One Piece facets
- colors
- attribute
- TCG card type/supertypes/subtypes
- cost, power, counter
- tag
- source
- legality

Implementation rules
- Build facets from data presence; hide empty facets.
- Persist per-TCG filter state and restore on return.
- Show active filter chips and `Reset all`.
- In picker context, preserve binder intent params while changing filters.

## 5. Frontend Learning Workflow (Fast)
1. Build screen skeleton first.
2. Add fake local data to prove UI states.
3. Connect hook + repository.
4. Remove temporary logs.
5. Test on iOS + Android navigation + gesture behavior.

## 6. Definition of Ready (Before Building Any Screen)
- Route name and params defined.
- Required repository method exists.
- Loading/empty/error states identified.
- Navigation entry/exit points identified.
- Reusable components selected.

## 7. Definition of Done (Per Screen)
- Correct route + params validation.
- UI handles loading/empty/error/success.
- Back navigation behavior is consistent.
- Data writes persist and survive app restart.
- No TypeScript or lint errors.

## 8. UX Guardrails
- Back is top-left on pushed screens; modal dismiss uses close affordance.
- Editor mode is explicit (`View` vs `Edit`) with visible state.
- Toolbar icon meaning is learnable (labels, tooltips, or first-use coach marks).
- Destructive actions (remove card, clear page, delete binder) require confirm or undo.
- Empty states are intentional and action-oriented ("Add first card", "Create binder").
- Accessibility baseline: 44px+ targets, contrast-safe text, supports dynamic text sizing.
- Offline/download state is always visible where relevant (no hidden surprises).
- Any feature blocked by missing downloads must provide one-tap recovery action.
