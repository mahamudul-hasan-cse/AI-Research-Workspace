# FE-05 Accessibility Notes

All three components live on `/playground` and were built from scratch, following the
WAI-ARIA Authoring Practices. The shadcn/ui comparison uses `shadcn@4.21.4` with the
Radix base (`radix-ui` → `@radix-ui/react-dialog@1.3.0`, `@radix-ui/react-tabs@1.2.0`).
The shadcn files in `src/components/ui/` are thin styling wrappers, so the comparison
below is based on the Radix primitives they wrap.

## Manual Components

- **Modal** (`src/components/modal-dialog.tsx`)
  - Renders `role="dialog"` with `aria-modal="true"`, wired to its title and
    description through `aria-labelledby` and `aria-describedby` (ids from `useId`).
  - Rendered into a portal on `document.body`.
  - While open, every other top-level body element gets `inert`, and page scrolling is
    locked with `overflow: hidden`.
  - On open, focus moves to the first focusable control. A keydown handler wraps Tab and
    Shift+Tab inside the dialog, and Escape closes it.
  - On close, focus returns to whichever element was focused when the dialog opened.
- **Tabs** (`src/components/tabs.tsx`)
  - `role="tablist"` containing `role="tab"` buttons. Each tab has `aria-selected` and
    `aria-controls`, and points to a `role="tabpanel"` that has `aria-labelledby`.
  - Roving `tabIndex`: only the selected tab is `0`, the rest are `-1`.
  - Arrow Left/Right move between tabs and wrap, Home/End jump to the ends, and tabs are
    activated automatically.
  - Inactive panels stay in the DOM with the `hidden` attribute.
- **Disclosure** (`src/components/disclosure.tsx`)
  - A native `<button>` with `aria-expanded` and `aria-controls` pointing to the content.
  - The content uses `hidden` when collapsed.
  - Enter and Space come for free from the native button.

## shadcn Dialog vs Manual Modal

1. **Escape and nested overlays.** Radix's `DismissableLayer` listens for Escape on the
   `document` in the capture phase. It keeps a stack of layers and only the top-most
   layer reacts (`isHighestLayer`), so a dialog opened inside another closes one at a
   time. Our Escape handler is the dialog's own `onKeyDown`, so it only fires while focus
   is inside the dialog. We also have no explicit layer stack, and nested modals are
   untested.
2. **Keeping focus inside.** Radix `FocusScope` does more than catch Tab:
   - Global `focusin` and `focusout` listeners pull focus back if it escapes in any way.
   - A `MutationObserver` re-focuses the container if the focused element is removed.
   - `useFocusGuards` inserts focusable sentinel elements (`data-radix-focus-guard`) at
     both edges of `<body>`.

   Ours only intercepts Tab. If the focused control is removed while the dialog is open,
   focus falls to `<body>`, and neither our Tab wrap nor our Escape handler runs (based on
   reading the code; not exercised by the demo).
3. **Finding tabbable elements.** Radix walks the DOM with a `TreeWalker`. It accepts
   anything with `tabIndex >= 0` and skips disabled, `hidden` and `type="hidden"`
   elements. For the first and last stops it also checks visibility (`checkVisibility`,
   or a `display: none` / `visibility: hidden` walk). Ours uses a fixed CSS selector with
   no visibility check, so a visually hidden control could become a wrap target, and
   things like `contenteditable` are missed.
4. **Hiding the background (different approach).** Radix uses `hideOthers` from
   `aria-hidden` to set `aria-hidden` on every sibling. It also sets
   `body.style.pointerEvents = "none"` and uses `react-remove-scroll`, which compensates
   for the scrollbar's width and blocks wheel and touch scrolling outside the dialog.
   `aria-hidden` does not block focus, which is why Radix also needs the focus trap. Ours
   uses `inert`, which blocks focus, pointer input and the accessibility tree in one go.
   That's simpler, but it relies on native `inert` support, and our plain
   `overflow: hidden` removes the scrollbar without compensating, so the page can shift
   sideways when the dialog opens.
5. **Focus restore, wiring and API.**
   - Radix returns focus to the `Dialog.Trigger` ref (after a `setTimeout`); ours returns
     it to whatever had focus at open time.
   - Radix's trigger gets `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`;
     our opener button has none.
   - Radix sets `aria-labelledby` and `aria-describedby` only when a `Dialog.Title` or
     `Dialog.Description` is actually mounted. Ours makes `title` and `description`
     required props.
   - Radix supports controlled and uncontrolled state (`open`/`defaultOpen`/
     `onOpenChange`).
   - Radix's `Presence` keeps content mounted until the exit animation finishes
     (`data-state="open"`/`"closed"`). Ours unmounts immediately.
   - Radix ignores right-clicks outside the dialog instead of dismissing on them.
   - This Radix version does not warn when the title is missing (`WarningProvider` does
     nothing), so a missing accessible name is still the developer's responsibility.

## shadcn Tabs vs Manual Tabs

1. **Orientation.** Radix supports `orientation="vertical"`. It sets `aria-orientation`
   and `data-orientation`, uses Up/Down in vertical mode, and ignores the cross-axis
   arrows. Ours is horizontal only and sets no `aria-orientation` (the `tablist` default
   is horizontal, so this is still correct for our layout).
2. **Manual activation.** Radix has `activationMode="automatic" | "manual"`. It activates
   on focus in automatic mode, and on Enter/Space in manual mode. Roving focus tracks the
   focused tab (`currentTabStopId`) separately from the selected value, so the two can
   differ. Ours is automatic only, and focus and selection are always the same tab.
3. **Disabled tabs.** A Radix trigger with `disabled` is marked `focusable: false`, so
   arrow navigation skips it, and it gets `data-disabled` plus native `disabled`. Ours
   has no disabled support.
4. **RTL.** Radix's `getDirectionAwareKey` swaps ArrowLeft and ArrowRight when
   `dir="rtl"` (from the prop or a `DirectionProvider`). Ours always treats ArrowRight as
   "next", which is backwards in right-to-left layouts.
5. **Reusable roving focus and API.**
   - The keyboard logic lives in a separate `RovingFocusGroup`, which also handles
     PageUp/PageDown (first/last) and Shift+Tab out of the group. Radix moves focus
     inside a `setTimeout`.
   - Panels mount their children only while active (unless `forceMount`). Ours renders
     every panel's content and hides the inactive ones.
   - `data-state="active"`/`"inactive"` attributes drive the styling.
   - Each part forwards refs and accepts `asChild`, and state can be controlled
     (`value`/`onValueChange`).
   - Ours is a single component driven by an `items` array, with internal state only and
     no ref forwarding.

## Disclosure

Disclosure was built by hand from the WAI-ARIA Disclosure pattern: a native `<button>`
with `aria-expanded` and `aria-controls`, and content hidden with the `hidden` attribute.
It was deliberately not replaced or compared with a shadcn component for this assignment,
and only `dialog` and `tabs` were added from shadcn.

## What I Learned

- **Keyboard interaction.** Each pattern has its own keyboard contract. A dialog keeps
  Tab inside it. Tabs replace Tab with arrow keys inside the list, and Tab moves on to the
  panel. A disclosure needs nothing beyond a native button. Using native elements gives
  Enter and Space for free.
- **ARIA semantics.** Roles and states only work when every link resolves:
  `aria-controls` and `aria-labelledby` must point to real ids, and `aria-selected` and
  `aria-expanded` must change with state. `hidden` and `inert` matter as much as ARIA,
  because they decide what is actually reachable.
- **Focus management.** The hard part of a modal is the edge cases, not the happy path:
  where focus goes on open, keeping it inside, returning it on close, and recovering when
  focus is lost. A Tab key handler alone covers only the common case.
- **Why component libraries help.** Radix covers things that are easy to miss: nested
  overlay stacking, focus recovery, scrollbar compensation, RTL arrow keys, disabled
  tabs, manual activation, and animation-aware unmounting. These are tested and reused
  across many apps.
- **Why the pattern still matters.** The library can't choose the right pattern, write a
  meaningful title, or stop you from leaving out a description, and this Radix version
  doesn't warn about a missing title. Installing it here also showed that shadcn's
  generated theme reuses token names (`--muted`, `--accent`) with different meanings,
  which would have broken text contrast and the focus ring if accepted blindly. Knowing
  the underlying pattern is what makes it possible to review and test the library's
  output.
