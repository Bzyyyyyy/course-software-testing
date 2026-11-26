# white-box-01 — Save loses a toggled Settings option when a colour palette is still open

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | White-box |
| Requirement | REQ-5.1 |
| Source | `frontend/app.js` — click delegation (lines 685–700), `renderSettings` (430–451), `openSettings` (658–663), `saveSettings` (665–675) |
| Automation | `tests/keep-team18.spec.ts` → `white-box-01` |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

REQ-5.1 requires the Settings dialog to be configured through its two checkboxes and to **commit the options on `Save`**: "Users configure `Add new items to the bottom`(role=checkbox) … then click `Save`(role=button) to commit the options and close … Reopening reflects saved selections … and saved selections survive reload."

Source reading (white-box design) identified two facts:

1. The Settings checkboxes are **uncontrolled**: they carry no `data-action` and no change handler. Their value is read from the DOM only at save time (`saveSettings`, lines 666–671), and the dialog is rendered from `ui.settingsDraft` (line 438), which `openSettings` copies once at line 660.
2. The document-level click handler at line 685 treats **any** click without a `data-action` as an "outside click". If `ui.openColorNoteId` is still set, the branch at lines 689–697 clears the transient menus **and calls `render()`** (line 696), which rebuilds the whole application, including the Settings dialog, from `ui.settingsDraft`.

Therefore the chosen path is:

> Settings dialog open **while a note colour palette is still open behind it** → click a checkbox (no `data-action`) → line 689 is true → line 696 re-renders → the checkbox is recreated from the unchanged draft → `Save` reads the recreated (old) DOM value.

Input selection: the only precondition needed to reach this branch is that `ui.openColorNoteId` is non-null. Opening a note's background-colour palette (REQ-2.7) and then opening Settings leaves it set: `openSettings` clears `ui.settingsMenuOpen` but not `ui.openColorNoteId`. This is a legal sequence of two required features; no developer tooling or source modification is used.

## 2. Requirement reference

- **REQ-5.1** — "Users configure `Add new items to the bottom`(role=checkbox) and `Move checked items to bottom`(role=checkbox), then click `Save`(role=button) to **commit the options** and close… Reopening reflects saved selections… and saved selections survive reload."
- **REQ-2.7** — background colour palette on an existing note (used only as the precondition that leaves `ui.openColorNoteId` set).

## 3. Difference from existing tests

`test/baseline/REQ-5.1.spec.ts` opens Settings from a clean workspace, toggles a checkbox and clicks `Save`/`Cancel`. It never opens the dialog while another transient overlay is active, so it never reaches the click-delegation branch at line 687 with pending dialog input, and it cannot observe the re-render discarding the toggle.

This test adds a new path (outside-click re-render while the Settings dialog holds uncommitted input) and new assertions (the checkbox must stay toggled; the value must be committed and survive reload), which no existing test covers.

## 4. Preconditions and reproduction steps

Preconditions: a running Keep instance, Notes view open, at least one note.

1. Create a note with title `Palette target [team18-<run>]` and content `palette open behind the settings dialog` (Take a note → Title/Content → Close).
2. Hover the note and click **`Background color Palette target …`**; the colour palette opens and stays open.
3. Click **Settings menu** → **Settings**. The Settings dialog opens on top; the palette is still open behind it.
4. Click the **`Add new items to the bottom`** checkbox (it starts unchecked).
5. Observe the checkbox, then click **Save**, reload the page, and reopen **Settings menu → Settings**.

## 5. Expected and actual behaviour

**Expected (reference behaviour).**

- Step 4 leaves the checkbox checked; an unrelated overlay being open must not discard input the user has just typed/clicked.
- **Save** commits `Add new items to the bottom = checked`; after reload the reopened dialog shows it checked (REQ-5.1).

**Actual (supplied implementation).**

- Step 4: the checkbox does not remain checked — the click re-renders the dialog (line 696) and the checkbox is recreated from `ui.settingsDraft`, which still holds the old value.
- `Save` therefore writes the old value; after reload the option is still unchecked. The user's change is silently lost.

Recorded values from the run: "option value before click: false | after click (want true): false" and "persisted value after Save + reload: false (want true)".

## 6. Evidence

| Evidence | Path |
| --- | --- |
| Settings dialog with the colour palette still open behind it | `assets/white-box-01-settings-open.png` |
| Immediately after clicking the checkbox — unchecked again | `assets/white-box-01-after-toggle.png` |
| After `Save` + reload — value not committed | `assets/white-box-01-after-save-reload.png` |
| Recorded run with the observed values | `assets/run-log.txt` |

Automation: `tests/keep-team18.spec.ts`, test `white-box-01`:

```sh
cd applications/keep/test/team-18/tests
npm install && npx playwright install chromium
APP_URL=http://127.0.0.1:<port> npx playwright test -g "white-box-01"
```
