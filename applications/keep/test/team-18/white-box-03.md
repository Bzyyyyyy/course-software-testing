# white-box-03 — Reopening a note drops a leading newline from its content

| | |
| --- | --- |
| Application | Keep (`applications/keep`) |
| Type | White-box (HTML parsing of the editor markup) |
| Requirement | REQ-2.2, REQ-2.3 |
| Source | `frontend/app.js` — `renderEditor` (line 363), `closeEditor` (lines 506-507) |
| Result | **Fails on the supplied implementation** |

## 1. Test method and design basis

The note content is written into the editor as markup, not through the DOM property:

```js
<textarea id="editor-content" ... rows="6">${esc(d.content)}</textarea>
```

The HTML tokenizer has a special rule for `textarea`: **one newline character immediately after the start tag is
ignored**. The editor is rebuilt from this string on every render, and `closeEditor` copies `textarea.value` back
into the note, so content whose first character is `\n` loses exactly one leading newline on every open/close
cycle.

Input selection: two equivalence classes of content - "does not start with a newline" and "starts with a newline". The
second class is the one that reaches the parser rule; the test uses `"\nFirst paragraph\nSecond line"`, a value that
also covers the plain multiline case so the loss cannot be confused with normalising an empty first line.

## 2. Difference from existing tests

`test/baseline/REQ-2.2.spec.ts` creates a note whose content is `First line\nSecond line` and checks both lines
after a reload, and `test/baseline/REQ-2.3.spec.ts` edits a note whose content starts with a letter. Neither uses
content that starts with a newline, which is exactly the input the `textarea` rule reacts to.

## 3. Preconditions

- Fresh state: `PUT /api/state/keep-notes-v1` `{"value": null}`, reload the page.

## 4. Reproduction steps

1. Click **Take a note**, enter `Title` = `Leading newline note`.
2. In **Content**, enter the three-line value `\nFirst paragraph\nSecond line` - the first line is empty, so the
   text starts with a newline. Read the value back from the field: `"\nFirst paragraph\nSecond line"`.
3. Click **Close**. The card shows the content with the empty first line preserved.
4. Reload the page and click **Open Leading newline note** (open the note again).
5. Read the **Content** field of the reopened editor, then click **Close** and read the card again.

## 5. Expected behavior

REQ-2.2 requires the entered content to be retained ("the note retains the entered content") and REQ-2.3 requires
the editor to open "with that note's existing title and content". Opening and closing the editor without editing
anything must therefore be a no-op: the field must show `"\nFirst paragraph\nSecond line"` in step 5 and the card
must still show the empty first line.

## 6. Actual behavior

The reopened editor already holds a shorter value, and closing it writes that shorter value back, so the note is
permanently changed by an operation that was supposed to only display it:

```
content typed in step 2                 : "\nFirst paragraph\nSecond line"
card content after step 3               : "\nFirst paragraph\nSecond line"
content when reopened in step 5         : "First paragraph\nSecond line"   <-- expected the leading "\n"
card content after closing in step 5    : "First paragraph\nSecond line"
```

Repeating the open/close cycle does not remove a second newline (the parser only swallows the first one), so one
leading blank line is lost exactly once per note.

## 7. Source pointer

`renderEditor` builds `${esc(d.content)}` directly after the `<textarea ...>` start tag. A reference implementation
either writes the value through the DOM (`textarea.value = content`) or inserts one extra newline after the start
tag so the parser's rule consumes the filler instead of the user's content.

## 8. Evidence

- `assets/wb03-leading-newline.png` - reopened editor with the missing first line next to the card content.
- Values above were read from the `Content` field and from `article.note-card .note-content`; reproduced twice from
  a clean state.

- Also automated in the team's Playwright suite: `tests/keep-team18-extra.spec.ts` → test `white-box-03` (run as described in `../README.md`; recorded output in `assets/run-log-extra.txt`).
