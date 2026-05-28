import { useState, useEffect, useCallback } from 'react';
import { useDemo } from '../context/DemoContext';
import { apiRequest } from '../api/generic';

const BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:1080';

type Tab = 'user' | 'reset' | 'events';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DomainEvent {
  id: string;
  type: string;
  source: string;
  subject?: string;
  time: string;
  traceid?: string;
  traceparent?: string;
  data?: unknown;
}

interface EventList {
  items: DomainEvent[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Events tab ─────────────────────────────────────────────────────────────────

function EventsTab() {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceFilter, setTraceFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const load = useCallback(async (traceid?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ sort: '-time', limit: '50' });
      if (traceid) qs.set('traceid', traceid);
      const res = await apiRequest(`${BASE_URL}/platform/events?${qs}`);
      const data = res as EventList;
      setEvents(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(traceFilter ?? undefined);
  }, [load, traceFilter]);

  function handleTraceClick(traceid: string) {
    setTraceFilter(traceid);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#71767a' }}>
          {traceFilter ? (
            <>Trace: <code style={{ fontSize: '0.75rem' }}>{traceFilter.slice(0, 16)}…</code></>
          ) : (
            <>{events.length} of {total} events (newest first)</>
          )}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {traceFilter && (
            <button
              type="button"
              onClick={() => setTraceFilter(null)}
              style={{ background: 'none', border: 'none', color: '#005ea2', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
            >
              Show all
            </button>
          )}
          <button
            type="button"
            onClick={() => load(traceFilter ?? undefined)}
            style={{ background: 'none', border: 'none', color: '#71767a', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <p style={{ fontSize: '0.8rem', color: '#71767a' }}>Loading…</p>}

      {error && (
        <p style={{ fontSize: '0.75rem', color: '#b50909', background: '#fff3f2', padding: '0.5rem', borderRadius: '4px' }}>
          {error}
        </p>
      )}

      {!loading && !error && events.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: '#71767a' }}>
          No events yet. Interact with the app to emit events.
        </p>
      )}

      {events.map((evt) => (
        <div
          key={evt.id}
          style={{
            borderBottom: '1px solid #dfe1e2',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, wordBreak: 'break-word' }}>
                {evt.type}
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#3d4551' }}>
                {evt.source}
                {evt.subject && (
                  <> · <code style={{ fontSize: '0.65rem' }}>{evt.subject.slice(0, 8)}…</code></>
                )}
              </p>
            </div>
            <span style={{ fontSize: '0.65rem', color: '#71767a', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatEventTime(evt.time)}
            </span>
          </div>

          {(evt.traceid || evt.traceparent) && (
            <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {evt.traceid && (
                <button
                  type="button"
                  onClick={() => handleTraceClick(evt.traceid!)}
                  title="Show events with this trace ID"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005ea2',
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  traceid:{evt.traceid.slice(0, 16)}…
                </button>
              )}
              {evt.traceparent && !evt.traceid && (
                <button
                  type="button"
                  onClick={() => {
                    // W3C traceparent format: 00-<trace-id>-<parent-id>-<flags>
                    const traceId = evt.traceparent!.split('-')[1];
                    if (traceId) handleTraceClick(traceId);
                  }}
                  title="Show events with this traceparent"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#005ea2',
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  traceparent:{evt.traceparent.slice(3, 19)}…
                </button>
              )}
            </div>
          )}

          {evt.data != null && (
            <div style={{ marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => toggleExpanded(evt.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#005ea2',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {expanded.has(evt.id) ? '▾ Hide payload' : '▸ Show payload'}
              </button>
              {expanded.has(evt.id) && (
                <pre style={{
                  margin: '0.4rem 0 0',
                  padding: '0.5rem',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}>
                  {JSON.stringify(evt.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DemoTray() {
  const { activeUser, setActiveUser, users } = useDemo();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('user');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setResetMsg(null);
    try {
      // Step 1: reset YAML fixture data
      const res = await fetch(`${BASE_URL}/mock/reset`, { method: 'POST' });
      if (!res.ok) throw new Error(`Reset failed: HTTP ${res.status}`);

      // Step 2: replay seed.mjs — create Leslie Trent's application through the
      // real state machine so an application_review task appears in the queue.
      // IDs must match demos/cbms/seeds/users.yaml
      const LESLIE = 'a3000003-0000-4000-8000-000000000001';

      async function post(path: string, body: unknown, callerId: string, callerRole: string) {
        const r = await fetch(`${BASE_URL}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Caller-Id': callerId,
            'X-Caller-Roles': callerRole,
          },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`POST ${path} → ${r.status}: ${text}`);
        }
        return r.json() as Promise<Record<string, string>>;
      }

      const asApplicant = (path: string, body: unknown) => post(path, body, LESLIE, 'applicant');

      const app = await asApplicant('/intake/applications', {
        programs: ['snap', 'medicaid', 'tanf'],
        channel: 'online',
        primaryApplicantName: 'Leslie Trent',
        languagePreference: 'en',
      });

      const leslie = await asApplicant(`/intake/applications/${app.id}/members`, {
        roles: ['primary_applicant'],
        givenName: 'Leslie',
        familyName: 'Trent',
        dateOfBirth: '1985-03-12',
        relationshipToHead: 'head_of_household',
        citizenshipStatus: 'us_citizen',
        programs: ['snap', 'medicaid', 'tanf'],
      });

      await asApplicant(`/intake/applications/${app.id}/members`, {
        roles: ['household_member'],
        givenName: 'Jordan',
        familyName: 'Trent',
        dateOfBirth: '2012-07-28',
        relationshipToHead: 'child',
        citizenshipStatus: 'us_citizen',
        programs: ['snap', 'medicaid'],
      });

      await asApplicant(`/intake/applications/${app.id}/members/${leslie.id}/incomes`, {
        type: 'unearned',
        unearnedType: 'unemployment',
        amount: 1200,
        frequency: 'monthly',
      });

      await asApplicant(`/intake/applications/${app.id}/submit`, {});

      window.location.assign('/queue');
    } catch (e) {
      setResetMsg(`Reset failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResetting(false);
    }
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '0.6rem 0',
    background: 'none',
    border: 'none',
    borderBottom: tab === t ? '3px solid #005ea2' : '3px solid transparent',
    color: tab === t ? '#005ea2' : '#71767a',
    fontWeight: tab === t ? 700 : 400,
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <>
      {/* Fixed trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle demo admin tray"
        aria-expanded={open}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          background: '#f0be41',
          color: '#1b1b1b',
          border: 'none',
          borderRadius: '4px',
          padding: '0.5rem 1.25rem',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        Admin
      </button>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9997,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}

      {/* Drawer */}
      {open && (
        <div
          role="complementary"
          aria-label="Demo admin tray"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '360px',
            zIndex: 9998,
            background: '#fff',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Source Sans Pro Web, Helvetica Neue, Helvetica, Roboto, Arial, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: '#f0be41',
            borderBottom: '1px solid #dfe1e2',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Demo Admin</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close demo tray"
              style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Active user badge */}
          <div style={{
            padding: '0.5rem 1rem',
            background: '#f0f0f0',
            borderBottom: '1px solid #dfe1e2',
            fontSize: '0.8rem',
            color: '#3d4551',
          }}>
            Logged in as <strong>{activeUser.name}</strong>
            <span style={{ color: '#71767a', marginLeft: '0.5rem', textTransform: 'capitalize' }}>
              ({activeUser.role.replace('_', ' ')})
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #dfe1e2' }}>
            {(['user', 'reset', 'events'] as Tab[]).map((t) => (
              <button key={t} type="button" style={tabStyle(t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {tab === 'user' && (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#3d4551', marginTop: 0 }}>
                  Switch the active user. All API calls send this user's ID as{' '}
                  <code style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                    X-Caller-Id
                  </code>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {users.map((user) => {
                    const active = activeUser.id === user.id;
                    return (
                      <label
                        key={user.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: '4px',
                          border: active ? '2px solid #005ea2' : '1px solid #dfe1e2',
                          background: active ? '#e8f1fa' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="demo-user"
                          value={user.id}
                          checked={active}
                          onChange={() => setActiveUser(user)}
                          style={{ marginTop: '0.2rem', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#71767a', textTransform: 'capitalize' }}>
                            {user.role.replace('_', ' ')}
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#a9aeb1', marginTop: '0.2rem' }}>
                            {user.id}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === 'reset' && (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#3d4551', marginTop: 0 }}>
                  Reset all mock server databases to the seeded fixture data.
                  Any changes made during the demo will be discarded.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  style={{
                    background: resetting ? '#dfe1e2' : '#e52207',
                    color: resetting ? '#71767a' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.6rem 1.25rem',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: resetting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resetting ? 'Resetting…' : 'Reset to fixtures'}
                </button>
                {resetMsg && (
                  <p style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    color: resetMsg.startsWith('Reset failed') ? '#b50909' : '#4d8055',
                  }}>
                    {resetMsg}
                  </p>
                )}
              </div>
            )}

            {tab === 'events' && <EventsTab />}
          </div>
        </div>
      )}
    </>
  );
}
