# white-box-04 — A leftover search keyword hides notes from the label filter

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | White-box (branch comparison of the navigation click handler) |
| Requirement | REQ-3.2, REQ-4.1 |
| Source | `frontend/app.js` — click handler (lines 722-748), `renderNotesView` (line 238) |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

Every navigation action that changes which notes are listed goes through one of four branches of the click
delegate. Comparing those branches shows that two of them clear the stored search text and two do not:

| Branch | Lines | Clears `privateState.search`? |
| --- | --- | --- |
| `nav-notes` | 722-725 | yes |
| `suggest-reminders` | 744-748 | yes |
| `nav-reminders` | 726-730 | **no** |
| `nav-label` | 731-733 | **no** |

`renderNotesView` (line 238) computes `activeNotes().filter(byLabel).filter(noteMatchesSearch(q))`, so when the
label branch is taken with a non-empty search text the label filter is applied **and** the old keyword is still
applied. White-box design: pick the branch pair that differs in the code (`nav-notes` vs `nav-label`), fix the same
user input for both, and compare. Input selection: a keyword that matches no note, so the second filter can only
hide notes.

## 2. Difference from existing tests

`test/baseline/REQ-3.2.spec.ts` selects a label from a clean search box, and `test/baseline/REQ-4.1.spec.ts` builds a
search from the notes view. No baseline test leaves a keyword in the box before using a label action, so the
difference between the `nav-notes` and `nav-label` branches is not covered.

## 3. Preconditions

- Fresh state: `PUT /api/state/keep-notes-v1` `{"value": null}`, reload.
- One user label `Errands` created through **Edit Labels** -> `New label` -> `Create label` -> `Done`.
- One note `Grocery list` (content `Milk and bread`) carrying `Errands`, one note `Call dentist` (content
  `Book the appointment`) carrying the default `Reminders`.

## 4. Reproduction steps

1. Type `calm blue waves` into the **Search** box - no note matches it, so both sections are empty.
2. Without clearing the box, click **Errands** in `Sidebar`.
3. Look at the notes list and at the contents of the Search box.
4. Clear the Search box and look at the list again.

## 5. Expected behavior

REQ-3.2 says the label action shows the notes assigned to that label ("displays only active notes assigned that
label"). Selecting `Errands` is a navigation action, and the code's own `nav-notes` branch shows that the intended
behaviour is to drop the previous keyword, so step 3 must show `Grocery list` and an empty Search box.

## 6. Actual behavior

The keyword survives the label navigation and continues to filter, so the label filter appears empty:

```
list while searching "calm blue waves"        : []
after clicking Errands (search box still has) : "calm blue waves", list = []      <-- expected ["Grocery list"], box empty
after clearing the Search box                 : ["Grocery list"]
```

The two navigation branches therefore behave differently for the same user intention - reaching a label with an
empty search box always works, reaching it after a search silently shows nothing.

## 7. Source pointer

`case 'nav-label': setRoute('label', btn.dataset.labelId);` (lines 731-733) and `case 'nav-reminders':` (lines
726-730) do not reset `privateState.search`, unlike `nav-notes` and `suggest-reminders`. A reference implementation
clears the search text in all four branches (or renders the label list independently of the search box).

## 8. Evidence

- `assets/wb04-stale-search-label.png` - step 3: `Errands` selected, search box still holding `calm blue waves`,
  empty list.
- Reproduced twice from a clean state; the control step 4 shows the note reappearing.

- Also automated in the team's Playwright suite: `tests/keep-team18-extra.spec.ts` → test `white-box-04` (run as described in `../README.md`; recorded output in `assets/run-log-extra.txt`).
