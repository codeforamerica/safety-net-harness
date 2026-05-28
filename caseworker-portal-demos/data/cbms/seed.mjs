#!/usr/bin/env node
/**
 * CBMS Demo — seed script
 *
 * Seeds Leslie Trent's application via the live HTTP API so it goes through
 * the real submission flow: draft → submitted. The submission event triggers
 * the workflow state machine to create an application_review task automatically.
 * Ashley claims that task from the queue page during the demo, which opens the
 * application for review (submitted → under_review).
 *
 * Income and notes are added here so the review page has data to show.
 *
 * The background queue applications (Marcus Webb, Rosa Delgado, etc.) are
 * seeded separately via YAML (seeds/intake.yaml) because they need pre-set
 * statuses and display fields that bypass the state machine.
 *
 * Run this after the mock server is started. run.mjs handles the sequencing.
 */

const BASE = 'http://localhost:1080';

// Demo users seeded via users.yaml. IDs are stable across runs.
const LESLIE_USER_ID = 'a3000003-0000-4000-8000-000000000001'; // applicant
const ASHLEY_USER_ID = 'a1000001-0000-4000-8000-000000000001'; // caseworker

async function post(path, body, callerId, callerRole) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Caller-Id': callerId,
      'X-Caller-Roles': callerRole,
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

const asApplicant = (path, body) => post(path, body, LESLIE_USER_ID, 'applicant');
const asCaseworker = (path, body) => post(path, body, ASHLEY_USER_ID, 'caseworker');

// ── Leslie Trent — primary demo scenario ─────────────────────────────────────
// Leslie fills out her application as an applicant: creates the application,
// adds household members, declares income — then submits. This mirrors the
// real applicant flow. Submission creates an application_review task
// automatically (via event handler in workflow-state-machine.yaml). Ashley
// claims that task from the queue page during the demo, which opens the
// application (submitted → under_review).
//
// A caseworker note is added after submission so the review page has
// case-management context when Ashley opens it.

const app = await asApplicant('/intake/applications', {
  programs: ['snap', 'medicaid', 'tanf'],
  channel: 'online',
  primaryApplicantName: 'Leslie Trent',
  languagePreference: 'en',
});

// Add household members before submission so they're included in the
// submission event payload (memberIds list).
const leslie = await asApplicant(`/intake/applications/${app.id}/members`, {
  roles: ['primary_applicant'],
  givenName: 'Leslie',
  familyName: 'Trent',
  dateOfBirth: '1985-03-12',
  relationshipToHead: 'head_of_household',
  citizenshipStatus: 'us_citizen',
  programs: ['snap', 'medicaid', 'tanf'],
});

const jordan = await asApplicant(`/intake/applications/${app.id}/members`, {
  roles: ['household_member'],
  givenName: 'Jordan',
  familyName: 'Trent',
  dateOfBirth: '2012-07-28',
  relationshipToHead: 'child',
  citizenshipStatus: 'us_citizen',
  programs: ['snap', 'medicaid'],
});

// Income declared by applicant before submission — realistic self-reported flow.
await asApplicant(`/intake/applications/${app.id}/members/${leslie.id}/incomes`, {
  type: 'unearned',
  unearnedType: 'unemployment',
  amount: 1200,
  frequency: 'monthly',
});

// Applicant submits — triggers creation of application_review task.
await asApplicant(`/intake/applications/${app.id}/submit`);


console.log(`Leslie Trent application: ${app.id}`);
console.log(`  members: ${leslie.id} (Leslie), ${jordan.id} (Jordan)`);
