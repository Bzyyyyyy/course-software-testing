# white-box-02 — Undo reports "Action undone" after Empty Trash already removed the note

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | White-box |
| Requirement | REQ-2.4 (primary), REQ-2.5 (primary), REQ-2.5 `Empty Trash` |
| Source | `frontend/app.js` — `deleteNote` (538–552), `renderNotification` (340–349), `emptyTrash` (677–682), `notif-undo` handler (783–785) |
| Automation | `tests/keep-team18.spec.ts` → `white-box-02` |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

REQ-2.4 gives the deletion notification a precise contract: `Undo` must "restore the same title and content to active Notes, remove the note from Trash, and display `Action undone`". REQ-2.5 gives `Empty Trash` a different contract: it "permanently removes all currently deleted notes".

Source reading identified the state path that makes these two contracts collide:

1. `deleteNote` (lines 538–552) sets `deleted = true` and registers an Undo closure that only mutates the captured note object: `n.deleted = false; saveShared(); ui.notification = { message: 'Action undone', … }` (lines 545–550). The notification is stored in `ui.notification` and rendered by `renderNotification` (340–349).
2. `emptyTrash` (677–682) removes every deleted note from `state.notes` (`state.notes = state.notes.filter(n => !n.deleted)`) but **does not touch `ui.notification`**. The Undo closure still closes over the now-detached note object.
3. The `notif-undo` handler (783–785) calls `ui.notification.undo()` unconditionally. The closure then flips `deleted` on an object that is no longer in `state.notes`, saves it, and unconditionally publishes the `Action undone` status.

The branch reached is therefore: **a pending deletion notification + an emptied Trash**, in which the status message and the observable note state diverge. Input selection follows from the branch conditions: one deleted note is enough, and the only additional step is the required `Empty Trash` confirmation. No source modification or internal API is used.

## 2. Requirement reference

- **REQ-2.5** — "`Empty Trash`(role=button) permanently removes all currently deleted notes while preserving active notes. If confirmation is offered, it appears as `Empty Trash`(role=dialog) with an `Empty Trash`(role=button) confirmation action."
- **REQ-2.4** — "Undo restores the same title and content to active Notes, removes the note from Trash, and displays `Action undone`(role=status)."

Either reading must hold after the note has been permanently removed: the visible `Undo` must restore the note (REQ-2.4), **or** the notification must not claim that a non-existent restoration succeeded. The implementation does neither: it keeps the `Undo` affordance, changes the status to `Action undone`, and restores nothing.

## 3. Difference from existing tests

The baseline exercises the two features separately:

- `REQ-2.4.spec.ts` clicks `Undo` immediately, before the note is permanently removed; it never empties the Trash while the notification is pending.
- `REQ-2.5.spec.ts` deletes, opens Trash and clicks `Empty Trash`; it never clicks the still-pending `Undo` afterwards (and it reloads the page in its first case, which clears the in-memory notification).

No existing test combines a pending deletion notification with `Empty Trash`, so no existing test observes the `Action undone` status without a restored note.

## 4. Preconditions and reproduction steps

Preconditions: a running Keep instance, Notes view open, no note with the title below.

1. Create a note with title `Stale undo [team18-<run>]` and content `permanently removed content`.
2. Hover the note, open **`More options Stale undo …`**, choose **Delete Note**. Status `Note deleted` with `Undo` appears; the note leaves Notes.
3. Click **Trash** in the sidebar; the note is in `Deleted notes`.
4. Click **Empty Trash**, then **Empty Trash** in the confirmation dialog. The `Deleted notes` region is now empty (0 note regions).
5. Observe that the `Note deleted` notification is still visible with its **Undo** button, and click **Undo**.
6. Observe the status message, the Notes list and Trash.

## 5. Expected and actual behaviour

**Expected (reference behaviour).** Once the note has been permanently removed by `Empty Trash` (REQ-2.5), the stale deletion notification must not offer a successful undo: either the notification is dismissed/updated when the Trash is emptied, or `Undo` must genuinely restore the note. In no case may the UI report `Action undone` while nothing was restored, because REQ-2.4 binds that status to an actual restoration in active Notes.

**Actual (supplied implementation).**

- After step 4 the `Note deleted` notification with `Undo` is still displayed (Trash already empty).
- After step 5 the status changes to **`Action undone`**, but the note is **not** restored: Notes contains 0 regions with that title and Trash contains 0 note regions, before and after a reload.
- Recorded run: "pending status after Empty Trash: Note deleted" → "status after Undo: Action undone | restored note regions: 0".

This is a false success message produced by an Undo whose target no longer exists — a behavioural inconsistency between the notification contract (REQ-2.4) and the permanent-removal contract (REQ-2.5).

## 6. Evidence

| Evidence | Path |
| --- | --- |
| `Empty Trash` confirmation dialog | `assets/white-box-02-empty-trash-confirm.png` |
| Trash emptied, stale `Note deleted` notification still offering `Undo` | `assets/white-box-02-after-empty-trash.png` |
| After clicking `Undo`: status `Action undone`, Trash empty, note absent | `assets/white-box-02-after-undo.png` |
| Notes view after reload — the note was not restored | `assets/white-box-02-notes-after-undo-reload.png` |
| Recorded run with the observed values | `assets/run-log.txt` |

Automation: `tests/keep-team18.spec.ts`, test `white-box-02`:

```sh
cd applications/keep/test/team-18/tests
npm install && npx playwright install chromium
APP_URL=http://127.0.0.1:<port> npx playwright test -g "white-box-02"
```
