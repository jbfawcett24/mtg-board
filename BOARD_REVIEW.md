# Board Review

## Scope

This review covers the Board client in `client/src/Board.jsx` and the code it relies on for game-state transport and mutation:

- `backend/src/index.js`
- `client/src/App.jsx`
- `hand/src/GameHand.jsx`
- `backend/src/handFunctions.js`

The review was read-only. No application source files were changed.

## Verification

- `client`: `npm run build` passed.
- `hand`: `npm run build` passed.
- `backend`: `node --check src/index.js` passed.
- No automated unit, integration, or end-to-end tests are defined for the Board flows.
- The backend stores sessions only in memory, so behavioral testing requires a running backend and connected Board/Hand clients.

## Findings summary

| Priority | Finding | Area |
| --- | --- | --- |
| High | Board socket commands are not consistently authorized by role | Backend protocol/security |
| High | Counter changes are local to the Board and are never synchronized | Counters |
| High | Invalid move destinations can silently delete cards | Backend state mutation |
| Medium | Remote card position updates are ignored after a card first renders | Battlefield synchronization |
| Medium | Board game state and transient UI state are not reset together | Navigation/game lifecycle |
| Medium | Pointer-cancel and unmount paths can leave drag/long-press state active | Input handling |
| Medium | Context menus can render off-screen on small viewports | Responsive behavior |
| Medium | Mobile/viewport resizing is not handled for battlefield positions | Responsive behavior |
| Low | Layer and counter maps retain entries for cards that no longer exist | State cleanup |
| Low | Board and Hand socket cleanup removes all listeners for an event | Socket lifecycle |
| Low | Several props and styles are unused or duplicated | Maintainability |

## High priority findings

### 1. Board mutations are not role-authorized

The backend checks the Hand role for Hand-only operations such as `draw_card`, `play_card`, and `play_token`, but several Board mutation events do not check that the sender is the Board socket:

- `tap_card` — `backend/src/index.js:118-126`
- `move_zone_card` — `backend/src/index.js:181-210`
- `move_card` — `backend/src/index.js:214-238`
- `shuffle_library` — `backend/src/index.js:273-279`
- `shuffle_zone_into_library` — `backend/src/index.js:281-290`
- `untap_all` — `backend/src/index.js:292-297`

These handlers only require a valid session/code. A connected Hand client, or any client that knows the room code and socket protocol, can emit them and mutate the game state. This is both a correctness issue and a trust/authorization issue.

Suggested direction: centralize a Board-role guard, reject unauthorized mutations, and use explicit acknowledgements/errors so clients can surface rejected actions.

### 2. Counters are not part of synchronized game state

The Board stores counters in local React state at `client/src/Board.jsx:735` and updates them at `client/src/Board.jsx:779-784`. No socket event is emitted, and the backend never updates or broadcasts counter values.

Consequences:

- The Hand does not see counters.
- A second Board view does not see counters.
- Reloading or remounting the Board loses counters.
- Resetting or moving a card does not clear the separate counter map.
- The `counters` fields placed on cards by the backend are not used by the Board counter UI.

Suggested direction: make counters part of the authoritative backend state, keyed by `instanceId`, and synchronize add/remove operations through a guarded socket event.

## Medium priority findings

### 3. Remote battlefield position changes are ignored

On every `game_state_update`, the Board keeps the previous local position when an `instanceId` already exists:

`client/src/Board.jsx:742-750`

That means a card moved by another client, or moved by the server after a zone operation, will retain the local client’s old coordinates if it was already rendered. The Board only accepts the server position for newly seen cards.

Suggested direction: distinguish local drag state from authoritative state and reconcile remote position changes, or include an update/version marker so locally active drags are preserved only while the drag is in progress.

### 4. Invalid backend destinations can remove cards from the game

Both backend move handlers remove a card from its source before validating that the destination is supported:

- `move_zone_card`: source removal at `backend/src/index.js:192`, destination branches at `:194-208`.
- `move_card`: battlefield removal at `backend/src/index.js:223`, destination branches at `:225-235`.

If an invalid `to` value is sent, the card is removed and not reinserted. The current Board UI emits known values, but malformed clients, protocol drift, or future UI changes can cause silent card loss.

Suggested direction: validate `from`, `to`, and card identity before mutating the source; reject invalid moves without changing state.

### 5. Game lifecycle state is not fully reset when leaving the Board

The Board keeps `cardCounters`, `layers`, `contextMenu`, `cardViewer`, `zoneViewer`, `boardMenu`, and `zoneDrag` locally. Returning Home uses `setPage('home')` from the Board menu (`client/src/Board.jsx:692-698`), but does not reset the backend session or clear all Board state through an explicit lifecycle action.

The component will normally unmount and reset React state, but the shared socket remains connected in `App`. The backend session remains active until the socket disconnects. This creates ambiguous behavior if the user returns to Home and starts another game without a clean end/reset protocol.

Suggested direction: define an explicit leave/end-game action, clear transient client state on game end, and decide whether returning Home should terminate the server session or permit reconnection.

### 6. Pointer-cancel and unmount paths do not fully clean up card interaction state

`BattlefieldCard` clears its timer and drag ref on pointer cancel at `client/src/Board.jsx:329-332`, but it does not call `setDragging(false)`. A pointer cancellation can therefore leave the card visually in its dragging state.

The long-press timer is also not cleared in a component unmount cleanup. If a card is removed while the timer is pending, the callback can still attempt to open a context menu using stale state.

Suggested direction: add effect cleanup for the timer and reset `dragging` in every cancellation/unmount path.

### 7. Context menus can be positioned outside the viewport

`ContextMenu` computes positions with only `Math.min`:

- `client/src/Board.jsx:488-491`
- `client/src/Board.jsx:687-690`

If the menu is taller/wider than the viewport, or if the viewport is narrower than the assumed menu dimensions, the calculated top/left can be negative. There is no lower-bound clamp, max-height, or scroll behavior.

Suggested direction: clamp both coordinates with `Math.max(padding, ...)`, measure the actual menu after mount, and add a max height with scrolling for small screens.

### 8. Battlefield positions are not recomputed on resize

Cards use absolute battlefield coordinates and the board uses `overflow: visible` (`client/src/Board.jsx:85-88`). Position clamping only happens on pointer release (`client/src/Board.jsx:319-326`). A resize can leave cards outside the visible battlefield, and there is no pan or scroll mechanism to recover them.

Suggested direction: clamp/reconcile positions on resize, or provide a scrollable/pannable battlefield with a defined coordinate space.

## Lower priority findings

### 9. Layer and counter maps grow stale

`layers` adds entries for every new battlefield card at `client/src/Board.jsx:752-760`, but never removes entries for cards that leave the battlefield. `cardCounters` likewise never removes counters when a card leaves play or when a game resets.

This is a bounded issue during short games but can grow over a long session and can cause stale counter values to reappear if an `instanceId` is reused.

Suggested direction: prune both maps against the current authoritative battlefield/card IDs during each state update, and clear them on reset/game end.

### 10. Socket listener cleanup is broader than the listener registration

The Board registers an anonymous `game_state_update` callback and cleans up with `socket.off('game_state_update')` at `client/src/Board.jsx:738-763`. The Hand uses the same broad cleanup pattern at `hand/src/GameHand.jsx:300-306`, and the Hand root has similar cleanup at `hand/src/App.jsx:90-120`.

`off(event)` removes every listener for that event on the socket, not only the listener created by the component. This can create surprising behavior if multiple consumers share a socket or if the app later adds another listener.

Suggested direction: store named handler functions and call `socket.off(event, handler)`.

### 11. The visual and protocol model for card counters is split

The backend initializes `counters: []` on battlefield cards (`backend/src/index.js:96-99`, `:147`, `:176`), while the Board uses `{ oneOne, generic }` in a separate map. These representations are currently unrelated, making it unclear which one is authoritative and increasing the chance of future divergence.

Suggested direction: choose one counter schema and use it consistently across backend, Board, Hand, reset, move, and persistence/reconnection behavior.

### 12. Some Board component APIs are unused

`BattlefieldCard` accepts `contextOptions` at `client/src/Board.jsx:258`, but never reads it. `ContextMenu` accepts `card` at `client/src/Board.jsx:477`, but only uses `items`. These are harmless today but suggest partially removed or unfinished behavior and make future changes harder to reason about.

### 13. The Board has no visible loading/disconnected state

The Board initializes with `gameState = null` and renders the battlefield/sidebar immediately (`client/src/Board.jsx:725-736`, `:859-899`). If the socket disconnects or the game state has not arrived yet, the UI presents an empty board with no explanation. The App tracks socket status, but that status is not passed into the Board.

Suggested direction: show a loading state before the first state update and a disconnected/reconnecting state when the socket loses connection.

### 14. The session model does not support board reconnection

The backend deletes the entire session when the Board socket disconnects (`backend/src/index.js:299-309`). Any transient network interruption ends the game and emits `game_ended` to the Hand. There is no session token, reconnect grace period, or board reattachment flow.

Suggested direction: decide whether disconnect should end the game immediately; if not, retain the session for a short grace period and authenticate reconnections to the existing Board role.

## Interaction and UX observations

- Card tap is optimistic on the Board (`client/src/Board.jsx:769-773`), but there is no error acknowledgement if the server rejects or ignores the mutation.
- Long press opens a menu at the pointer coordinates captured at press start (`client/src/Board.jsx:274-278`), not necessarily where the user releases after holding.
- The Board has no Escape-key handling for the card viewer, zone viewer, counter modal, context menu, or board menu. Users must click the relevant close/backdrop affordance.
- The zone viewer’s card interaction is click-to-open-menu only; it does not provide a visible selected/focus state before the menu appears.
- The Board uses fixed `120px` card dimensions and a fixed sidebar width, with no responsive strategy beyond allowing cards to extend outside the battlefield.
- The zone viewer uses `card.instanceId ?? card.id ?? index` as a key (`client/src/Board.jsx:648-650`). The index fallback can cause item identity churn if cards lack stable IDs.

## Recommended order of work

1. Add server-side role authorization and input validation for all mutating socket events.
2. Move counters into authoritative synchronized game state.
3. Make move operations transactional: validate destinations before removing cards.
4. Reconcile remote battlefield positions and define resize/reconnect behavior.
5. Harden pointer cleanup, menu positioning, Escape handling, and disconnected/loading states.
6. Prune transient maps and narrow socket listener cleanup to component-owned handlers.

