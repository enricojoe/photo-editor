# Custom crop resolution, adaptive cursor, header export, color adjust (parallel subagents)

## Context
User requested four independent features and explicitly asked for each to be delegated to its own subagent rather than done serially:
1. Crop tool: let the user type an exact custom pixel resolution instead of only picking from fixed aspect-ratio presets.
2. Adaptive cursor: the crop tool's cursor should reflect what clicking would do (resize cursors on handles, a grab/move cursor inside the rect, crosshair outside).
3. Move the Export control from the left tool rail to the top-right of the page header.
4. Add another color-related tool beyond Bucket Fill — implemented as a brightness/contrast/saturation "Color Adjust" tool.

## Approach: git worktrees per agent, manual merge afterward
Running 4 agents truly in parallel against one shared working directory risked real file corruption — all four were expected to touch overlapping files (`App.css` everywhere; the crop pair sharing `CropOverlay.tsx`/`cropGeometry.ts`/`useCrop.ts`; the header/toolbar pair sharing `Toolbar.tsx`). The project had no git repo yet, so:
1. Ran `git init` + a baseline commit on `main`.
2. The Agent tool's `isolation: "worktree"` parameter failed ("not in a git repository and no WorktreeCreate hooks are configured") — the harness apparently snapshots "is a git repo" at session start and doesn't see a repo created mid-session. Worked around this by creating the worktrees manually with plain `git worktree add` (one branch each: `feat/crop-custom-resolution`, `feat/crop-cursor`, `feat/export-header`, `feat/color-adjust`), symlinking `node_modules` into each so agents could run `npm run build/lint/test` immediately, and instructing each agent's prompt to explicitly `cd` into its own absolute worktree path for every command (the harness resets Bash cwd between calls) and never touch the main repo directory.
3. Each agent was given precise scope-discipline instructions (exact current file contents, what to touch, what NOT to touch, and a heads-up about which other agent shares which file) to keep diffs mergeable, plus instructions to run build/lint/test and commit before finishing.
4. After all four reported back, merged sequentially into `main`: `feat/export-header` (fast-forward, no conflict) → `feat/color-adjust` (one conflict in `Toolbar.tsx` — export lines removed vs. new button added nearby; resolved by keeping the new button and dropping the already-relocated export lines) → `feat/crop-cursor` (auto-merged cleanly) → `feat/crop-custom-resolution` (conflicts in `CropOverlay.tsx`, `useCrop.ts`, `tests/cropGeometry.test.ts` — all were "both branches added a sibling thing in the same spot" conflicts, resolved by keeping both additions from each side).
5. Removed all four worktrees and merged branches after integration.

## What was built
- `src/features/crop/cropGeometry.ts`: `customSizedRect(width, height, imageWidth, imageHeight)` (exact-pixel, clamped, centered) and `cursorForHandle(handle)` (maps each of the 8 handles to its native resize cursor).
- `src/features/crop/useCrop.ts`: `setCustomSize(width, height)` (applies a custom rect and locks the aspect ratio to it) and `getCursor(event, canvas)` (reads the active interaction mode first, falls back to hit-testing when idle).
- `src/features/crop/CropOverlay.tsx`: a "Custom" preset button revealing Width/Height number inputs + Apply; the pointer-listener effect now sets `overlay.style.cursor` from `getCursor()` on every pointer event instead of a static `'crosshair'`.
- `src/components/HeaderExport.tsx` (new): owns the Export trigger + `ExportDialog`, rendered in `App.tsx`'s header (now a flex row, title left / export right) instead of in `Toolbar.tsx`.
- `src/features/colorAdjust/`: `colorFilter.ts` (brightness/contrast/saturation → CSS filter string mapping), `applyColorFilter.ts` (bakes the filter into actual pixel data via an offscreen canvas), `ColorAdjustTool.tsx` (sliders with live CSS-filter preview, Apply bakes it in, Cancel discards).
- `src/types/index.ts`: `ToolName` gained `'colorAdjust'`.

## Verification
Full integrated codebase (after all 4 merges): `npm run build` (53 modules, clean), `npm run lint` (only pre-existing unrelated `EditorContext.tsx` warnings), `npm test` (64/64 passing — 50 pre-existing + 4 `cursorForHandle` + 3 `customSizedRect` + 7 color-adjust tests). Each agent also verified independently inside its own worktree before committing.

**Not independently verified**: actual visual/interactive behavior in a browser (cursor feel while dragging, custom-resolution UX, header layout, color sliders) — no browser automation tool was available this session. Worth a `npm run dev` pass to confirm feel, especially the cursor transitions and the color-adjust live preview.
