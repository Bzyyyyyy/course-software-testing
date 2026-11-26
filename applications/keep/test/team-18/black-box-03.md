# black-box-03 — Suggested filters stay hidden after the search text is cleared

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | Black-box (state-based testing of the Search box) |
| Requirement | REQ-4.1 |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

The Search box has two independent state variables that the requirement talks about: whether it holds the focus
("Focusing `Search`(role=searchbox) displays `Suggested filters`(role=region)") and whether it holds text
("Entering a keyword ... filters active notes"). The requirement states the suggestion panel as a function of the
**focus** state only.

Black-box design: model the box as a state machine over (focus, text) = (focused, empty) -> (focused, "zz") ->
(focused, empty). The first and the last state are the same pair of values, so a state-based test expects the same
observable UI in both: the suggestion panel present. The transition "erase the text while the box keeps the focus"
is the input that separates a correct implementation from one that ties the panel to the text.

## 2. Difference from existing tests

`test/baseline/REQ-4.1.spec.ts` clicks Search and immediately chooses `Reminders` from the visible panel, and its
second scenario fills the box once. It never types a keyword and then erases it while the focus stays in the box,
and it never re-checks the panel after clearing. This test adds that transition and the comparison of the two
equal states.

## 3. Preconditions

- Fresh state: `PUT /api/state/keep-notes-v1` `{"value": null}`, reload the page, nothing in the search box.
- At least one note is not required for the panel itself.

## 4. Reproduction steps

1. Click the **Search** searchbox; the `Suggested filters` region appears.
2. Type `zz` into the box (no note matches it). The `Suggested filters` region is still visible.
3. Erase the text so the box is empty again and keep the focus in the box (`document.activeElement` is still the
   search input).
4. Look for the `Suggested filters` region.

## 5. Expected behavior

After step 3 the box is in exactly the state of step 1 - focused, empty - so REQ-4.1's rule "focusing Search
displays `Suggested filters`" must hold and the region must still be visible.

## 6. Actual behavior

The region is gone while the box still has the focus; it only comes back after the focus leaves the box and
returns:

```
panel right after focusing Search                    : 1
panel while Search holds "zz"                        : 1
panel after clearing the text (Search still focused) : 0    <-- expected 1
panel after blur + refocus                           : 1
```

A user who types a keyword, finds nothing, and erases it silently loses the suggestion shortcuts until they click
somewhere else and come back to the box.

## 7. Source pointer

`frontend/app.js`, the `input` handler for `#search-input` (lines 857-869): when the new value is empty it sets
`ui.searchFocused = false` and removes the `.suggested-filters` node, although no `focusout` happened. The
`focusin` handler (lines 878-888) only re-inserts the panel when `ui.searchFocused` is false - which it now is -
but it never fires again because the focus never left the element.

## 8. Evidence

- `assets/bb03-suggested-filters-cleared.png` - state after step 3: empty search box with the cursor in it and no
  `Suggested filters` region.
- Measured counts above come from `document.querySelectorAll('.suggested-filters').length`; reproduced twice from a
  clean state.

- Also automated in the team's Playwright suite: `tests/keep-team18-extra.spec.ts` → test `black-box-03` (run as described in `../README.md`; recorded output in `assets/run-log-extra.txt`).
