# black-box-01 — Search rewrites the note text instead of highlighting the stored characters

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | Black-box |
| Requirement | REQ-4.1 (primary), REQ-2.1 (secondary) |
| Automation | `tests/keep-team18.spec.ts` → `black-box-01` |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

REQ-4.1 requires the Search box to filter active notes by case-insensitive title or content matches, and requires **each matching fragment to appear as a `Highlight {keyword}` region that displays only the matching text**, visibly distinguished from the surrounding text.

The interface was treated as a black box: only the rendered page and the accessibility tree were used, without reading the implementation. The inputs were chosen by partitioning the search space:

1. **Query casing** — a class not covered by the existing tests: the query is typed with different capitalisation from the note text (`ST` vs `St`). Case-insensitivity is exactly the situation where the matched characters and the query string differ, so it separates "highlight the matched text" from "copy the query into the note".
2. **Match location** — two partitions, keyword only in the **title** (`Study schedule`) and keyword only in the **content** (`Read a Story`), so the same fault can be observed in both places where REQ-4.1 allows a match.
3. **Persistence** — the query survives a reload in the supplied implementation, so the test repeats the observation after `F5`.

The note texts are fixed English examples; the identity suffix appended to each title is hexadecimal only, so it cannot accidentally contain `st`.

## 2. Requirement reference

- **REQ-4.1** — "Entering a keyword in `Search` filters active notes by case-insensitive title or content matches. Each matching fragment appears as `Highlight {keyword}`(role=region) within its note, **displays only the matching text**, and is visibly distinguished from surrounding text…"
- **REQ-2.1** — "Every active note appears once … as `{title}`(role=region), **whose accessible name equals that note's visible title**." When the search rewrites the title, the visible text no longer matches the note's own title (or its `Open {title}` accessible name).

## 3. Difference from existing tests

`test/baseline/REQ-4.1.spec.ts` searches with the **lower-case** query `st` against `Study schedule` / `Read a story`. With identical casing, substituting the query for the matched fragment is invisible: `st` and `St` render the same length, and the assertion `toHaveText(/^st$/i)` is case-insensitive by construction. The baseline therefore cannot distinguish "highlight the matched text" from "write the query into the note", and it never checks the note's own text after searching.

This test adds a new input class (query casing ≠ note casing) and new assertions (the note's visible title/content must be unchanged, the highlight must contain the matched characters), which no existing test covers.

## 4. Preconditions and reproduction steps

Preconditions: a running Keep instance, the Notes view open, no note with the titles below.

1. Click **Take a note**, enter title `Study schedule [team18-<run>]` and content `Math on Monday`, click **Close**.
2. Click **Take a note**, enter title `Reading plan [team18-<run>]` and content `Read a Story`, click **Close**.
3. Click the **Search** box and type `ST` (upper case).
4. Observe the two note cards and the accessible highlight regions inside them.
5. Reload the page (`F5`) and observe the first card again.

## 5. Expected and actual behaviour

**Expected (reference behaviour).**

- Search is case-insensitive, but the note keeps its own characters. The first card still reads **`Study schedule [team18-<run>]`**, the second still reads **`Read a Story`**.
- The fragment is highlighted in place with its original spelling: the `Highlight ST` region contains **`St`** (`Study` → `St`+`udy`, `Story` → `St`+`ory`), as required by "displays only the matching text".
- The `Open Study schedule …` accessible name and the visible title remain identical (REQ-2.1).
- Reloading does not change the note text.

**Actual (supplied implementation).**

- The first card renders as **`STudy schedule [team18-<run>]`**; the second as **`Read a STory`**.
- Both `Highlight ST` regions contain the query text **`ST`**, not the matched text `St`.
- The `Open …` accessible name still says `Study schedule …`, so the visible title and the accessible name now disagree.
- The corruption is stable and survives a reload while the query remains in the search box.

The note is not merely highlighted: the stored text is displayed with substituted characters, which is a behavioural inconsistency with the reference system and with REQ-4.1/REQ-2.1.

## 6. Evidence

| Evidence | Path |
| --- | --- |
| Search `ST` applied — `STudy schedule`, `Read a STory` | `assets/black-box-01-after-search.png` |
| Close-up of the title match | `assets/black-box-01-title-card.png` |
| Close-up of the content match | `assets/black-box-01-content-card.png` |
| Same state after `F5` | `assets/black-box-01-after-reload.png` |
| Recorded run (assertion diff: expected `Study schedule …` / `St`, received `STudy schedule …` / `ST`) | `assets/run-log.txt` |

Automation: `tests/keep-team18.spec.ts`, test `black-box-01`. Run command (see `../README.md`):

```sh
cd applications/keep/test/team-18/tests
npm install && npx playwright install chromium
APP_URL=http://127.0.0.1:<port> npx playwright test -g "black-box-01"
```

The script prints the rendered title and both highlight texts before asserting, so the failure message contains the observed values.
