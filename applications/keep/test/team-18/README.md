# Team 18 — Keep: fault-revealing tests

Application under test: **Keep personal note management** (`applications/keep`), commit `024c2bcef427351918168a0eb414cf907822b4ac` of `code-philia/course-software-testing`.

## Team members

| Member | Role |
| --- | --- |
| YingYujie | Leader, test design and automation |

All Team 18 submission files are in this directory (`applications/keep/test/team-18/`).

## Submitted tests

| ID | Type | Requirement | Fault exposed | Document |
| --- | --- | --- | --- | --- |
| `black-box-01` | Black-box (input partitioning by query casing and match location) | REQ-4.1 (also REQ-2.1) | A search query whose casing differs from the note text is written into the note: title `Study schedule` renders as `STudy schedule`, and the highlight region contains the query (`ST`) instead of the matched fragment (`St`). The corruption persists after reload. | [black-box-01.md](black-box-01.md) |
| `white-box-01` | White-box (event-delegation path `ui.openColorNoteId` → `render()`) | REQ-5.1 | Toggling a Settings checkbox while a note colour palette is still open re-renders the dialog from the stale draft; the checkbox flips back immediately and `Save` persists the old value. | [white-box-01.md](white-box-01.md) |
| `white-box-02` | White-box (state path: delete notification + `emptyTrash()`) | REQ-2.4, REQ-2.5 | After `Empty Trash` permanently removes the note, the still-pending `Note deleted` notification keeps its `Undo`; clicking it displays `Action undone` although nothing is restored (Notes: 0, Trash: 0). | [white-box-02.md](white-box-02.md) |

Each document states the design basis, the requirement IDs, how it differs from `test/baseline`, exact reproduction steps, expected vs actual behaviour, and the evidence files.

## Layout

```
applications/keep/test/team-18/
├── README.md
├── black-box-01.md
├── white-box-01.md
├── white-box-02.md
├── assets/                     # screenshots and the recorded run log
└── tests/
    ├── package.json
    ├── playwright.config.ts
    └── keep-team18.spec.ts     # three reproduction scripts
```

## Running the reproduction scripts

The scripts are **expected to fail** on the supplied implementation: each failure is the fault being reported. They need Node.js 18+ and Playwright (the application itself needs no npm packages).

```sh
# 1. start the application (prints the real URL; the port is auto-selected in 3000-3999)
cd applications/keep
sh start.sh
#    e.g. "Listening on 3781" — use that port below

# 2. run the reproduction scripts
cd applications/keep/test/team-18/tests
npm install
npx playwright install chromium        # first run only
APP_URL=http://127.0.0.1:3781 npx playwright test
```

`APP_URL` defaults to `http://127.0.0.1:3000` if omitted. The tests use a deterministic run suffix per note title, so they do not collide with existing notes or with each other; no data reset is required (the application keeps notes between launches).

Recorded output of a run against the supplied implementation: [`assets/run-log.txt`](assets/run-log.txt) — 3 failed, with the observed values.

## Screenshots

| File | Shows |
| --- | --- |
| `assets/black-box-01-after-search.png` | Search `ST`: title rendered as `STudy schedule`, content as `Read a STory` |
| `assets/black-box-01-title-card.png`, `assets/black-box-01-content-card.png` | Close-ups of the two corrupted note cards |
| `assets/black-box-01-after-reload.png` | The same corruption after `F5` |
| `assets/white-box-01-settings-open.png` | Settings dialog with the colour palette still open behind it |
| `assets/white-box-01-after-toggle.png` | Immediately after clicking `Add new items to the bottom` — the checkbox is unchecked again |
| `assets/white-box-01-after-save-reload.png` | After `Save` + reload — the option was not committed |
| `assets/white-box-02-after-empty-trash.png` | Trash empty, `Note deleted` notification with `Undo` still shown |
| `assets/white-box-02-after-undo.png` | After clicking `Undo`: status `Action undone`, Trash empty, note gone |
| `assets/white-box-02-empty-trash-confirm.png` | The `Empty Trash` confirmation dialog |
