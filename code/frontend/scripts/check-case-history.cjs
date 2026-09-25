const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  const output = path.resolve('../../.codex_tmp/case-history-check');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let saved = null;
      await context.addInitScript(() => {
        localStorage.setItem('ortho_user', JSON.stringify({ id: 1, name: 'Form Test', role: 'STAFF', initials: 'FT' }));
        localStorage.setItem('ortho_token', 'local-ui-test');
        localStorage.setItem('ortho_theme', 'light');
      });
      await page.route('http://localhost:8080/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        let data = [];
        if (url.pathname === '/patient/next-registration-number') data = { registrationNumber: 'ORT-2026-0001' };
        else if (url.pathname === '/patient/register' || request.method() === 'PUT') {
          saved = { ...saved, ...request.postDataJSON(), id: 'test-patient', patientId: 'ORT-2026-0001', name: 'UI Test Patient', radiographs: [], historyLogs: [] };
          data = saved;
        } else if (url.pathname === '/patient/test-patient') data = saved;
        else if (url.pathname === '/patient') data = saved ? [saved] : [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto('http://localhost:5173/?page=new-patient');
      await page.getByLabel('Full Name *', { exact: true }).fill('UI Test Patient');
      await page.getByLabel('Date of Birth', { exact: true }).fill('2010-06-12');
      await page.getByRole('button', { name: '03 Examination' }).click();
      const group = name => page.getByRole('group', { name, exact: true });
      await group('Past dental history').getByLabel('Fractures', { exact: true }).check();
      await group('Periodontal health').getByLabel('Plaque', { exact: true }).check();
      await group('Periodontal health').getByLabel('Calculus', { exact: true }).check();
      await group('Periodontal health').getByLabel('Satisfactory', { exact: true }).check();
      assert.equal(await group('Periodontal health').getByLabel('Plaque', { exact: true }).isChecked(), false);
      await group('Anteroposterior skeletal pattern').getByLabel('Class 2', { exact: true }).check();
      await group('Skeletal discrepancy severity').getByLabel('Severe', { exact: true }).check();
      await group('Anteroposterior skeletal pattern').getByLabel('Class 1', { exact: true }).check();
      assert.equal(await group('Skeletal discrepancy severity').count(), 0);
      await group('Anteroposterior skeletal pattern').getByLabel('Class 2', { exact: true }).check();
      assert.equal(await group('Skeletal discrepancy severity').getByRole('radio', { checked: true }).count(), 0);
      await group('Skeletal discrepancy severity').getByLabel('Mild', { exact: true }).check();
      await page.getByLabel('Family history', { exact: true }).fill('Family history recorded');
      await page.getByLabel('Right overjet (mm)', { exact: true }).fill('-2');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByText('Enter a non-negative measurement.', { exact: true }).waitFor();
      assert.equal(saved, null);
      await page.getByLabel('Right overjet (mm)', { exact: true }).fill('2.5');
      await group('Special investigations').getByLabel('OPG', { exact: true }).check();
      await group('Special investigations').getByLabel('CBCT', { exact: true }).check();
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.getByTitle('Switch to dark theme', { exact: true }).click();
        await group('Facial profile').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${viewport.width}-${theme}.png`) });
        const overflowing = await page.locator('.case-history').evaluate(root => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll('input, textarea, label, legend')].filter(element => {
            const rect = element.getBoundingClientRect();
            return rect.right > Math.min(window.innerWidth, bounds.right) + 1 || rect.left < bounds.left - 1;
          }).map(element => element.textContent || element.getAttribute('aria-label'));
        });
        assert.deepEqual(overflowing, [], 'Clinical controls must stay within the viewport');
      }
      await page.getByRole('button', { name: '05 Review' }).click();
      await page.getByRole('button', { name: 'Create Patient', exact: true }).click();
      await page.getByRole('heading', { name: 'Patients', exact: true }).waitFor();
      assert.equal(saved.caseHistory.rightOverjet, '2.5');
      assert.deepEqual(saved.caseHistory.investigations, ['OPG', 'CBCT']);
      await page.getByText('UI Test Patient', { exact: true }).click();
      await page.getByRole('tab', { name: 'Examination', exact: true }).click();
      await page.getByRole('heading', { name: 'Orthodontic case history', exact: true }).waitFor();
      await page.getByRole('tabpanel', { name: 'Examination' }).getByText('OPG, CBCT', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Edit Patient', exact: true }).click();
      await page.getByRole('button', { name: '03 Examination' }).click();
      assert.equal(await group('Special investigations').getByLabel('CBCT', { exact: true }).isChecked(), true);
      assert.equal(await page.getByLabel('Family history', { exact: true }).inputValue(), 'Family history recorded');
      await group('Special investigations').getByLabel('CBCT', { exact: true }).uncheck();
      await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
      await page.getByRole('button', { name: 'Edit Patient', exact: true }).waitFor();
      assert.deepEqual(saved.caseHistory.investigations, ['OPG']);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}px: selections, conditional clearing, validation, save, view, edit, light/dark, layout.`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
