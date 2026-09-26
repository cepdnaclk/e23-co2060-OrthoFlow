#!/usr/bin/env node
'use strict';

// Read-only account discovery. This file never creates resources or sends email.
// Credentials are read only from the ignored repository-root .env.hosting file.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const hostingFile = path.join(root, '.env.hosting');
const tokenNames = ['RENDER_API_KEY', 'SUPABASE_ACCESS_TOKEN', 'RESEND_API_KEY'];
const requiredNames = tokenNames.slice(0, 2);
const origins = {
  render: 'https://api.render.com',
  supabase: 'https://api.supabase.com',
  resend: 'https://api.resend.com',
};

function usableToken(value) {
  return typeof value === 'string' && value.trim().length >= 12
    && !/\s|<|>|^your[_-]|^replace|^paste|^example|^x+$/i.test(value);
}

function safeText(value, secrets) {
  let text = typeof value === 'string' ? value : '';
  for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
  return text.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 160);
}

function readConfig() {
  if (!fs.existsSync(hostingFile)) return {};
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', '.env.hosting'], { cwd: root });
  if (ignored.status !== 0) throw new Error('Refusing to read .env.hosting: it must be untracked and ignored by Git.');
  try {
    return parseEnv(fs.readFileSync(hostingFile, 'utf8'));
  } catch {
    throw new Error('Could not parse .env.hosting. Use one KEY=value entry per line.');
  }
}

async function inspectAccounts(config, { offline = false, fetchImpl = fetch } = {}) {
  const secrets = tokenNames.map(name => config[name]).filter(value => typeof value === 'string' && value.length);
  const text = value => safeText(value, secrets);
  const missing = requiredNames.filter(name => !usableToken(config[name]));
  const report = {
    mode: 'read-only',
    credentials: Object.fromEntries(tokenNames.map(name => [name, usableToken(config[name]) ? 'present' : 'missing or placeholder'])),
    missing,
    render: { status: 'not checked', workspaces: [], services: [] },
    supabase: { status: 'not checked', organizations: [], projects: [] },
    resend: { status: 'optional, not configured', domains: [] },
    checks: [],
  };

  async function get(provider, endpoint, token) {
    const response = await fetchImpl(new URL(endpoint, origins[provider]), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    // Never print HTTP bodies, headers, raw errors, or full API objects: they can contain secrets.
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  async function check(label, action) {
    try {
      await action();
    } catch (error) {
      const status = /^HTTP \d{3}$/.test(error.message || '') ? error.message : 'network or response error';
      report.checks.push({ check: label, status });
    }
  }

  async function renderList(endpoint, itemKey) {
    const items = [];
    let cursor;
    const seen = new Set();
    for (let page = 0; page < 10; page++) {
      const url = new URL(endpoint, origins.render);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const result = await get('render', url.pathname + url.search, config.RENDER_API_KEY);
      if (!Array.isArray(result)) throw new Error('Unexpected response');
      items.push(...result.map(item => item[itemKey]).filter(Boolean));
      if (result.length < 100) return items;
      cursor = result.at(-1)?.cursor;
      if (!cursor || seen.has(cursor)) throw new Error('Pagination incomplete');
      seen.add(cursor);
    }
    throw new Error('Pagination limit exceeded');
  }

  if (offline) {
    report.checks.push({ check: 'network', status: 'skipped (--offline)' });
    return report;
  }

  const jobs = [];
  if (usableToken(config.RENDER_API_KEY)) jobs.push(check('Render account discovery', async () => {
    const [owners, services] = await Promise.all([
      renderList('/v1/owners', 'owner'), renderList('/v1/services?includePreviews=false', 'service'),
    ]);
    report.render.workspaces = owners.map(owner => ({ id: text(owner.id), name: text(owner.name), type: text(owner.type) }));
    report.render.services = services.map(service => ({
      id: text(service.id), name: text(service.name), type: text(service.type),
      ownerId: text(service.ownerId), plan: text(service.serviceDetails?.plan),
      suspended: text(service.suspended),
    }));
    report.render.status = owners.length ? 'accessible; new web service must explicitly use plan=free' : 'no accessible workspace';
  }));

  if (usableToken(config.SUPABASE_ACCESS_TOKEN)) jobs.push(check('Supabase account discovery', async () => {
    const [organizations, projects] = await Promise.all([
      get('supabase', '/v1/organizations', config.SUPABASE_ACCESS_TOKEN),
      get('supabase', '/v1/projects', config.SUPABASE_ACCESS_TOKEN),
    ]);
    if (!Array.isArray(organizations) || !Array.isArray(projects)) throw new Error('Unexpected response');
    report.supabase.projects = projects.map(project => ({
      id: text(project.id), ref: text(project.ref), name: text(project.name),
      organizationId: text(project.organization_id), organizationSlug: text(project.organization_slug),
      region: text(project.region), status: text(project.status),
    }));
    // Inspect at most 50 organizations, sequentially, to keep discovery bounded.
    for (const organization of organizations.slice(0, 50)) {
      const row = { id: text(organization.id), slug: text(organization.slug), name: text(organization.name), plan: 'unverified' };
      report.supabase.organizations.push(row);
      if (!organization.slug) continue;
      await check('Supabase organization plan: ' + row.slug, async () => {
        const details = await get('supabase', '/v1/organizations/' + encodeURIComponent(organization.slug), config.SUPABASE_ACCESS_TOKEN);
        row.plan = text(details.plan) || 'unverified';
      });
    }
    if (organizations.length > 50) report.checks.push({ check: 'Supabase organization discovery', status: 'truncated to 50 organizations' });
    report.supabase.status = report.supabase.organizations.some(organization => organization.plan === 'free')
      ? 'free organization verified; project quota and region capacity still need checking before creation'
      : 'no verified free organization; do not create a project until a free plan is confirmed';
  }));

  if (usableToken(config.RESEND_API_KEY)) jobs.push(check('Resend domain discovery (requires domain read permission)', async () => {
    const result = await get('resend', '/domains?limit=100', config.RESEND_API_KEY);
    if (!Array.isArray(result.data)) throw new Error('Unexpected response');
    report.resend.domains = result.data.map(domain => ({
      id: text(domain.id), name: text(domain.name), status: text(domain.status), region: text(domain.region),
    }));
    report.resend.status = result.has_more ? 'accessible; first 100 domains only' : 'accessible';
    if (!result.data.some(domain => domain.status === 'verified')) {
      report.resend.status += '; no verified sender domain in this result';
    }
  }));

  await Promise.all(jobs);
  report.nextSteps = [
    'Confirm the selected Supabase organization is on the free plan and has project quota.',
    'Create the Render web service with plan=free; no paid database, disk, or cron service.',
    'Verify a sender domain before enabling Resend email to arbitrary recipients.',
  ];
  return report;
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/hosting-accounts.cjs [--offline]');
    console.log('Reads ignored .env.hosting. GET requests only; prints safe account metadata, never credentials.');
    return;
  }
  if (process.argv.slice(2).some(argument => argument !== '--offline')) {
    throw new Error('Unknown option. Use --help or --offline.');
  }
  const report = await inspectAccounts(readConfig(), { offline: process.argv.includes('--offline') });
  console.log(JSON.stringify(report, null, 2));
  if (report.missing.length || report.checks.some(check => check.status !== 'skipped (--offline)')) process.exitCode = 2;
}

module.exports = { inspectAccounts, safeText, usableToken };
if (require.main === module) main().catch(error => {
  console.error(error.message && /^(Refusing|Could not parse|Unknown option)/.test(error.message)
    ? error.message : 'Account discovery failed. Check .env.hosting and your network connection.');
  process.exitCode = 1;
});
