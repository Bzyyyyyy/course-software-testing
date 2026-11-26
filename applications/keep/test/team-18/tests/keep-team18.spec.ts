// Team 18 — Keep: fault-revealing reproduction scripts.
// Requirements: applications/keep/requirements/requirements.yaml
// Each test fails on the supplied implementation and documents one behavioural fault.
// Run: see README.md in ../README.md (needs a running Keep instance and APP_URL).

import { expect, test, type Locator, type Page } from '@playwright/test';

const action = (scope: Page | Locator, name: string) =>
  scope.getByRole('button', { name, exact: true });
const note = (page: Page, title: string) =>
  page.getByRole('region', { name: title, exact: true });
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Sidebar', exact: true });
const editor = (page: Page) => page.getByRole('dialog', { name: 'Note editor', exact: true });

// Unique business identity per run/worker/case; hex-only suffixes cannot match search keywords.
let counter = 0;
function identity(example: string): string {
  counter += 1;
  return `${example} [team18-${Date.now().toString(36)}-w${test.info().workerIndex}-${counter}]`;
}

async function openHome(page: Page) {
  await page.goto('/');
  await expect(action(page, 'Take a note')).toBeVisible();
}

async function createNote(page: Page, title: string, content: string) {
  await action(page, 'Take a note').click();
  await expect(editor(page)).toBeVisible();
  await editor(page).getByRole('textbox', { name: 'Title', exact: true }).fill(title);
  await editor(page).getByRole('textbox', { name: 'Content', exact: true }).fill(content);
  await action(editor(page), 'Close').click();
  await expect(editor(page)).toBeHidden();
  await expect(note(page, title)).toHaveCount(1);
}

/* ------------------------------------------------------------------ */
/* black-box-01  REQ-4.1 — case-insensitive search rewrites note text  */
/* ------------------------------------------------------------------ */
test('black-box-01: search must highlight the matched text without changing the note text', async ({ page }) => {
  await openHome(page);
  const titleMatch = identity('Study schedule');      // keyword only in the title ("St")
  const contentMatch = identity('Reading plan');      // keyword only in the content ("St" of "Story")
  await createNote(page, titleMatch, 'Math on Monday');
  await createNote(page, contentMatch, 'Read a Story');

  const search = page.getByRole('searchbox', { name: 'Search', exact: true });
  await search.fill('ST');                            // upper-case query, note text is mixed case
  await expect(note(page, titleMatch)).toBeVisible();
  await expect(note(page, contentMatch)).toBeVisible();

  const titleButton = action(note(page, titleMatch), `Open ${titleMatch}`);
  const titleMark = note(page, titleMatch).getByRole('region', { name: 'Highlight ST', exact: true });
  const contentMark = note(page, contentMatch).getByRole('region', { name: 'Highlight ST', exact: true });

  console.log('[black-box-01] visible title:', JSON.stringify(await titleButton.textContent()));
  console.log('[black-box-01] title highlight:', JSON.stringify(await titleMark.textContent()));
  console.log('[black-box-01] content highlight:', JSON.stringify(await contentMark.textContent()));

  // The note keeps its own characters: "Study schedule" / "Read a Story".
  await expect.soft(titleButton).toHaveText(titleMatch);
  await expect.soft(note(page, contentMatch).locator('.note-content')).toHaveText('Read a Story');
  // The highlight fragment shows the matched text (case of the note), not the query.
  await expect.soft(titleMark).toHaveText('St');
  await expect.soft(contentMark).toHaveText('St');

  // The corruption also survives a reload because the query is kept in private state.
  await page.reload();
  await expect.soft(action(note(page, titleMatch), `Open ${titleMatch}`)).toHaveText(titleMatch);
});

/* ------------------------------------------------------------------ */
/* white-box-01  REQ-5.1 — Save loses a toggled option (input loss)    */
/* ------------------------------------------------------------------ */
test('white-box-01: a toggled Settings option must survive Save while a colour palette is open', async ({ page }) => {
  await openHome(page);
  const title = identity('Palette target');
  await createNote(page, title, 'palette open behind the settings dialog');

  // Leave the note colour palette open (frontend/app.js: ui.openColorNoteId).
  await note(page, title).hover();
  await action(note(page, title), `Background color ${title}`).click();
  await expect(page.locator('.color-palette')).toBeVisible();

  await action(page, 'Settings menu').click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await expect(dialog).toBeVisible();

  const option = () => dialog.getByRole('checkbox', { name: 'Add new items to the bottom', exact: true });
  const saved = await option().isChecked();
  const wanted = !saved;
  await option().click();
  const afterClick = await option().isChecked();
  console.log('[white-box-01] option value before click:', saved, '| after click (want', wanted, '):', afterClick);
  // Clicking the checkbox must leave it toggled for the following Save.
  expect.soft(afterClick, 'the checkbox reverted immediately after being toggled').toBe(wanted);

  await action(dialog, 'Save').click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await action(page, 'Settings menu').click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
  const persisted = await page.getByRole('dialog', { name: 'Settings', exact: true })
    .getByRole('checkbox', { name: 'Add new items to the bottom', exact: true }).isChecked();
  console.log('[white-box-01] persisted value after Save + reload:', persisted, '(want', wanted, ')');
  expect.soft(persisted, 'Save did not commit the toggled option').toBe(wanted);
});

/* ------------------------------------------------------------------ */
/* white-box-02  REQ-2.4 / REQ-2.5 — Undo reports success after Empty  */
/* Trash permanently removed the note                                  */
/* ------------------------------------------------------------------ */
test('white-box-02: Undo must not report "Action undone" after Empty Trash removed the note', async ({ page }) => {
  await openHome(page);
  const title = identity('Stale undo');
  await createNote(page, title, 'permanently removed content');

  await note(page, title).hover();
  await action(note(page, title), `More options ${title}`).click();
  await page.getByRole('menuitem', { name: 'Delete Note', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Note deleted', exact: true })).toBeVisible();

  await action(sidebar(page), 'Trash').click();
  await expect(note(page, title)).toHaveCount(1);
  await action(page, 'Empty Trash').click();
  const confirm = page.getByRole('dialog', { name: 'Empty Trash', exact: true });
  await action(confirm, 'Empty Trash').click();
  await expect(page.getByRole('region', { name: 'Deleted notes', exact: true })
    .getByRole('region')).toHaveCount(0);

  // The deletion notification is still pending after the note was permanently removed.
  const status = page.getByRole('status');
  await expect(status).toBeVisible();
  console.log('[white-box-02] pending status after Empty Trash:', await status.getAttribute('aria-label'));
  await action(status, 'Undo').click();

  const label = await page.getByRole('status').getAttribute('aria-label');
  const restored = await note(page, title).count();
  console.log('[white-box-02] status after Undo:', label, '| restored note regions:', restored);

  // Either Undo restores the note (REQ-2.4) or it must not claim that the action was undone.
  expect(restored === 1 || label !== 'Action undone',
    `Undo reported "${label}" but the note was not restored (regions: ${restored})`).toBe(true);
});
