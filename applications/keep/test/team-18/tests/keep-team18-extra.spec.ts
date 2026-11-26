// Team 18 — Keep: reproduction scripts for the four additional cases
// (black-box-02, black-box-03, white-box-03, white-box-04).
// Each test fails on the supplied implementation and documents one behavioural fault.
// Run: see ../README.md (needs a running Keep instance and APP_URL).

import { expect, test, type Locator, type Page } from '@playwright/test';

const action = (scope: Page | Locator, name: string) =>
  scope.getByRole('button', { name, exact: true });
const note = (page: Page, title: string) =>
  page.getByRole('region', { name: title, exact: true });
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Sidebar', exact: true });
const editor = (page: Page) => page.getByRole('dialog', { name: 'Note editor', exact: true });
const labelsDialog = (page: Page) => page.getByRole('dialog', { name: 'Edit Labels', exact: true });
const chooser = (page: Page) => page.getByRole('dialog', { name: 'Note labels', exact: true });

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

async function createLabel(page: Page, label: string) {
  await action(sidebar(page), 'Edit Labels').click();
  const dialog = labelsDialog(page);
  await dialog.getByRole('textbox', { name: 'New label', exact: true }).fill(label);
  await action(dialog, 'Create label').click();
  await expect(dialog.getByRole('textbox', { name: `Label name ${label}`, exact: true })).toHaveValue(label);
  await action(dialog, 'Done').click();
  await expect(dialog).toBeHidden();
}

/* ------------------------------------------------------------------ */
/* black-box-02  REQ-3.2/2.8 — rename makes the {label} action ambiguous */
/* ------------------------------------------------------------------ */
test('black-box-02: renaming a label onto an existing name must not duplicate its accessible name', async ({ page }) => {
  await openHome(page);
  const original = identity('Work rename source');
  const taken = identity('Personal rename target');
  await createLabel(page, original);
  await createLabel(page, taken);

  await action(sidebar(page), 'Edit Labels').click();
  const dialog = labelsDialog(page);
  await dialog.getByRole('textbox', { name: `Label name ${original}`, exact: true }).fill(taken);
  await action(dialog, `Save label ${original}`).click();
  await action(dialog, 'Done').click();

  const sidebarCount = await sidebar(page).getByRole('button', { name: taken, exact: true }).count();
  console.log('[black-box-02] sidebar buttons named', JSON.stringify(taken), ':', sidebarCount);
  expect.soft(sidebarCount, 'the sidebar exposes one action per label name').toBe(1);

  const title = identity('Ambiguity probe');
  await createNote(page, title, 'label name reuse');
  await note(page, title).hover();
  await action(note(page, title), `More options ${title}`).click();
  await page.getByRole('menuitem', { name: 'Change labels', exact: true }).click();
  const boxCount = await chooser(page).getByRole('checkbox', { name: taken, exact: true }).count();
  console.log('[black-box-02] "Note labels" checkboxes named', JSON.stringify(taken), ':', boxCount);
  expect.soft(boxCount, 'the label chooser exposes one checkbox per label name').toBe(1);
  await action(chooser(page), 'Done').click();

  await page.reload();
  const afterReload = await sidebar(page).getByRole('button', { name: taken, exact: true }).count();
  console.log('[black-box-02] sidebar buttons after reload:', afterReload);
  expect.soft(afterReload, 'the duplicate is persisted, not a transient render').toBe(1);
});

/* ------------------------------------------------------------------ */
/* black-box-03  REQ-4.1 — Suggested filters must follow the focus    */
/* ------------------------------------------------------------------ */
test('black-box-03: Suggested filters must be shown whenever Search has the focus', async ({ page }) => {
  await openHome(page);
  const search = page.getByRole('searchbox', { name: 'Search', exact: true });
  const panel = page.getByRole('region', { name: 'Suggested filters', exact: true });

  await search.click();
  await expect(panel).toBeVisible();                    // (focused, empty)
  await search.fill('zz');
  await expect(panel).toBeVisible();                    // (focused, text)
  await search.fill('');                                // back to (focused, empty)
  await page.waitForTimeout(250);
  const focused = await page.evaluate(() => document.activeElement?.id);
  console.log('[black-box-03] active element after clearing:', focused, '| panel count:', await panel.count());
  expect.soft(focused, 'precondition: the search box keeps the focus').toBe('search-input');
  await expect.soft(panel, 'Suggested filters must be present in the focused, empty state').toBeVisible();

  // Control: the same state reached through a blur + refocus does show the panel.
  await page.mouse.click(700, 700);
  await search.click();
  await expect(panel).toBeVisible();
});

/* ------------------------------------------------------------------ */
/* white-box-03  REQ-2.2/2.3 — leading newline survives open/close    */
/* ------------------------------------------------------------------ */
test('white-box-03: a note whose content starts with a newline must keep it after reopening', async ({ page }) => {
  await openHome(page);
  const title = identity('Leading newline note');
  const content = '\nFirst paragraph\nSecond line';
  await createNote(page, title, content);
  expect(await note(page, title).locator('.note-content').textContent()).toBe(content);

  await page.reload();
  await action(note(page, title), `Open ${title}`).click();
  const inEditor = await editor(page).getByRole('textbox', { name: 'Content', exact: true }).inputValue();
  console.log('[white-box-03] content in the reopened editor:', JSON.stringify(inEditor));
  expect.soft(inEditor, 'the editor must show the stored content').toBe(content);

  await action(editor(page), 'Close').click();
  await page.reload();
  const onCard = await note(page, title).locator('.note-content').textContent();
  console.log('[white-box-03] content on the card after reopen + close + reload:', JSON.stringify(onCard));
  expect.soft(onCard, 'closing the editor must not shorten the stored content').toBe(content);
});

/* ------------------------------------------------------------------ */
/* white-box-04  REQ-3.2/4.1 — label selection vs leftover keyword    */
/* ------------------------------------------------------------------ */
test('white-box-04: selecting a label must list that label\'s notes despite a leftover search keyword', async ({ page }) => {
  await openHome(page);
  const label = identity('Errands');
  const labeled = identity('Grocery list');
  await createLabel(page, label);
  await createNote(page, labeled, 'Milk and bread');
  await note(page, labeled).hover();
  await action(note(page, labeled), `More options ${labeled}`).click();
  await page.getByRole('menuitem', { name: 'Change labels', exact: true }).click();
  await chooser(page).getByRole('checkbox', { name: label, exact: true }).check();
  await action(chooser(page), 'Done').click();

  const search = page.getByRole('searchbox', { name: 'Search', exact: true });
  await search.fill('keyword that matches no note');
  await expect(note(page, labeled)).toBeHidden();

  await action(sidebar(page), label).click();
  const leftover = await search.inputValue();
  const visible = await note(page, labeled).count();
  console.log('[white-box-04] leftover search:', JSON.stringify(leftover), '| labeled note regions:', visible, '| current:', await action(sidebar(page), label).getAttribute('aria-current'));
  expect.soft(visible, 'the label filter must list the notes assigned that label').toBe(1);
  await expect.soft(action(sidebar(page), label)).toHaveAttribute('aria-current', 'true');
});
