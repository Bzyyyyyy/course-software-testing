# black-box-02 — Renaming a label onto an existing name makes `{label}` ambiguous

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | Black-box (equivalence partitioning of the rename target; name-based identity) |
| Requirement | REQ-3.2 (primary), REQ-2.8 |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

REQ-3.2 and REQ-2.8 address every label **by its name**: the sidebar exposes `"{label}"(role=button)` and clicking it "displays only active notes assigned that label", and the label chooser exposes `"{label}"(role=checkbox)` for assigning or clearing that label. REQ-3.2 adds that sidebar actions "are identified by business identity rather than position".

The interface was treated as a black box. The rename input was partitioned by target name:

1. the label's own current name (covered by the baseline),
2. a fresh name (covered by the baseline),
3. **the name of another existing label** — the class that makes two different labels share one name, i.e. one required accessible name for two different business identities.

The scenario is not about whether duplicate names should be validated on input (REQ-3.1 leaves empty-name and duplicate-name validation unspecified). It is about the observable consequence: after the rename, the two named actions that REQ-3.2/REQ-2.8 require to select a single label no longer identify a single label, so "clicking `{label}`" and "checking `{label}`" have two referents and one of the filters can no longer be reached by name.

## 2. Difference from existing tests

`test/baseline/REQ-3.1.spec.ts` creates one label and checks its sidebar action. `test/baseline/REQ-3.3.spec.ts` renames a label to a fresh name and checks membership. Neither renames onto a name that is already in use, and no baseline test counts how many controls carry a given label name — so no existing test can observe two controls sharing one accessible name.

## 3. Preconditions

- No label named `Work` or `Personal` exists. (The manual steps below use those names; the automated script appends a unique run suffix instead and therefore needs no state reset.)
- Nothing else is required — Keep has no sign-in.

## 4. Reproduction steps

1. Open **Edit Labels**; in **New label** type `Work`, click **Create label**.
2. In **New label** type `Personal`, click **Create label**.
3. In the row for `Work`, replace **Label name Work** with `Personal`, click **Save label Work**.
4. Click **Done**, then count the buttons named `Personal` inside `Sidebar`(role=navigation).
5. Create a note (**Take a note** → `Title` = `Ambiguity probe` → **Close**), open **More options Ambiguity probe** → **Change labels**, and count the checkboxes named `Personal` in the `Note labels` dialog.
6. Reload the page and count the sidebar buttons again.

## 5. Expected behavior

REQ-3.2 and REQ-2.8 make the label **name** the address of a label action. After any rename, each `{label}` button in the sidebar and each `{label}` checkbox in the chooser must still identify exactly one label:

- one sidebar action per label name, so that "clicking `{label}` displays only active notes assigned that label" has a single, unambiguous referent (REQ-3.2, "identified by business identity rather than position");
- one checkbox per label name, so that checking or clearing `{label}` assigns or removes that one label (REQ-2.8).

If the implementation allows the rename to proceed, it must not leave two labels that are indistinguishable by the name the requirements use to address them. Refusing the rename and disambiguating the names are both acceptable; exposing two `{label}` controls with different ids is not.

## 6. Actual behavior

The rename is accepted and the same accessible name now refers to two different labels:

```
sidebar buttons named "Personal"          : 2
"Note labels" checkboxes named "Personal" : 2
after page reload, sidebar buttons        : 2
```

The two sidebar actions filter by different label ids and only one of them reports `current=true` at a time, so the required action "clicking `{label}` shows only the notes assigned that label" has no single meaning: one of the two filters is reachable only by position, which REQ-3.2 rules out. The duplicate survives a reload, so it is persisted data rather than a transient rendering artifact.

## 7. Evidence

- Counts above measured with Playwright (Chromium, viewport 1280x900), twice — before and after reload.
- Screenshot: `assets/bb02-duplicate-label-name.png` (two `Personal` buttons in the sidebar, two `Personal` checkboxes in the chooser).
- Manual run command used by the author: `python repro.py` with Playwright installed (`pip install playwright && playwright install chromium`), pointing at the launcher URL printed by `applications/keep/start.bat --port auto`.

- Also automated in the team's Playwright suite: `tests/keep-team18-extra.spec.ts` → test `black-box-02` (run as described in `../README.md`; recorded output in `assets/run-log-extra.txt`).
