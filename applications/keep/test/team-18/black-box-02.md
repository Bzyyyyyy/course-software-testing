# black-box-02 — Renaming a label onto an existing name creates two indistinguishable labels

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | Black-box (equivalence partitioning over the label-name input; boundary of the uniqueness rule) |
| Requirement | REQ-3.1 (primary), REQ-3.2, REQ-2.8 |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

The requirement set identifies every label by its **name**: the sidebar exposes `"{label}"(role=button)`
(REQ-3.2), the management dialog exposes `"Label name {label}"(role=textbox)` (REQ-3.3), and the label chooser
exposes `"{label}"(role=checkbox)` (REQ-2.8). `Create label` already refuses a name that is in use, so the
application itself treats label names as unique keys.

Black-box partitioning of the name input gives three classes: a new name, the label's own current name, and the
name of **another** label. The baseline covers create-with-a-new-name and rename-to-a-new-name; the third class -
rename onto a name that is already taken - is the boundary of the uniqueness rule and is not covered.

## 2. Difference from existing tests

`test/baseline/REQ-3.1.spec.ts` creates one label and checks its sidebar action. `test/baseline/REQ-3.3.spec.ts`
renames a label to a fresh name and checks membership. Neither renames onto a name that is already in use, and no
baseline test counts the sidebar actions for a given name.

## 3. Preconditions

- Fresh application state: `PUT /api/state/keep-notes-v1` with `{"value": null}`, then reload the page; no user
  labels exist.
- Nothing else is required (no sign-in in Keep).

## 4. Reproduction steps

1. Open **Edit Labels**; in **New label** type `Work`, click **Create label**.
2. In **New label** type `Personal`, click **Create label**.
3. In the row for `Work`, replace **Label name Work** with `Personal`, click **Save label Work**.
4. Click **Done**, then count the buttons named `Personal` inside `Sidebar`(role=navigation).
5. Create a note (**Take a note** -> `Title` = `Ambiguity probe` -> **Close**), open
   **More options Ambiguity probe** -> **Change labels**, and count the checkboxes named `Personal` in the
   `Note labels` dialog.
6. Reload the page and count the sidebar buttons again.

## 5. Expected behavior

REQ-3.1 keeps a label name unique in management and the sidebar ("added exactly once"), and REQ-3.3 says rename
updates "the sidebar's `{label}` action" - one action per name. Renaming onto a name that is already in use is the
same uniqueness case that `Create label` already refuses, so it must be refused (or the two labels must remain
distinguishable); producing a second action with an identical accessible name is a violation of REQ-3.2/REQ-2.8,
which address labels only by that name.

## 6. Actual behavior

The rename is accepted, so the same accessible name now refers to two different labels:

```
sidebar buttons named "Personal"          : 2
"Note labels" checkboxes named "Personal" : 2
after page reload, sidebar buttons        : 2
```

Both sidebar actions filter by different label ids and only one reports `current=true` at a time, so "clicking
`{label}` shows only the notes assigned that label" (REQ-3.2) no longer has a single referent. The duplicate
survives a reload, so it is persisted data rather than a transient rendering artifact.

## 7. Source pointer

`frontend/app.js`: `createLabel()` (lines 618-627) returns early when a label with that name already exists,
while `saveLabel()` (lines 629-639) assigns `l.name = name` with no such check. A reference implementation would
apply the same guard on rename.

## 8. Evidence

- Counts above measured with Playwright (Chromium/Edge, viewport 1280x900) against a freshly reset state, twice,
  before and after reload.
- Exact run command:
  `python repro.py` with Playwright installed (`pip install playwright && playwright install chromium`), pointing
  at the launcher URL printed by `applications/keep/start.bat --port auto`.

- Also automated in the team's Playwright suite: `tests/keep-team18-extra.spec.ts` → test `black-box-02` (run as described in `../README.md`; recorded output in `assets/run-log-extra.txt`).
