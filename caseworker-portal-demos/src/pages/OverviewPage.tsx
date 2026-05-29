import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tag } from '@trussworks/react-uswds';
import { useApiData } from '../hooks/useApiData';
import { apiRequest } from '../api/generic';
import { DesignGap } from '../components/DesignGap';
import { BlueprintAddition } from '../components/BlueprintAddition';

const BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:1080';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'pending_approval' | 'withdrawn' | 'closed';

interface Application {
  id: string;
  status: ApplicationStatus;
  programs: string[];
  channel: string;
  submittedAt: string | null;
  isExpedited: boolean | null;
  createdAt: string;
  updatedAt: string;
  primaryApplicantName?: string;
  languagePreference?: string;
  dueDate?: string | null;
  caseId?: string | null;
}

interface ReviewContext {
  application: Application;
}

interface Verification {
  id: string;
  type: string;
  status: string;
}

interface VerificationList {
  items: Verification[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  pending_approval: 'Pending approval',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

// Map application status → caseworker task progress label
const TASK_STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Not started',
  submitted: 'Not started',
  under_review: 'In progress',
  pending_approval: 'Pending approval',
  withdrawn: 'Withdrawn',
  closed: 'Complete',
};

const TASK_STATUS_CLASS: Record<ApplicationStatus, string> = {
  draft: 'bg-base-lighter text-base-dark',
  submitted: 'bg-base-lighter text-base-dark',
  under_review: 'bg-gold-20v',
  pending_approval: 'bg-blue-20v',
  withdrawn: 'bg-base-lighter text-base-dark',
  closed: 'bg-green-cool-20v',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese',
  vi: 'Vietnamese',
  ko: 'Korean',
  tl: 'Tagalog',
  ar: 'Arabic',
  fr: 'French',
  pt: 'Portuguese',
};

const PROGRAM_COLORS: Record<string, string> = {
  snap: 'bg-green-cool-5v',
  medicaid: 'bg-blue-5v',
  tanf: 'bg-violet-5v',
  wic: 'bg-gold-5v',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OverviewPage() {
  const { id } = useParams<{ id: string }>();

  const contextFetcher = useMemo(
    () =>
      id
        ? async () => {
            const res = await apiRequest(`${BASE_URL}/intake/applications/${id}/review-context`);
            return res as ReviewContext;
          }
        : null,
    [id],
  );

  const verificationsFetcher = useMemo(
    () =>
      id
        ? async () => {
            const res = await apiRequest(`${BASE_URL}/intake/applications/${id}/verifications`);
            return res as VerificationList;
          }
        : null,
    [id],
  );

  const { data: context, loading, error } = useApiData<ReviewContext>(contextFetcher);
  const { data: verificationsData } = useApiData<VerificationList>(verificationsFetcher);

  if (loading) return <p className="usa-prose padding-y-4">Loading…</p>;

  if (error) {
    return (
      <div className="usa-alert usa-alert--error" role="alert">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            Could not load application. Is the mock server running at <code>http://localhost:1080</code>?
          </p>
          <p className="usa-alert__text font-mono-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!context) return null;

  const { application } = context;

  const verificationsMissing = (verificationsData?.items ?? []).filter(
    (v) => v.status === 'pending' || v.status === 'required',
  ).length;

  const taskStatusLabel = TASK_STATUS_LABEL[application.status] ?? STATUS_LABEL[application.status];
  const taskStatusClass = TASK_STATUS_CLASS[application.status] ?? '';

  const languageLabel = application.languagePreference
    ? (LANGUAGE_LABELS[application.languagePreference] ?? application.languagePreference.toUpperCase())
    : '—';

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

      {/* ── Left nav ─────────────────────────────────────────────────────── */}
      <nav
        aria-label="Review workflow"
        style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '1rem' }}
      >
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#005ea2', borderLeft: '3px solid #005ea2', paddingLeft: '0.5rem', display: 'block' }}>
              Overview
            </span>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: '#71767a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Case matching
              <DesignGap description="Blueprint handles person matching (resolving applicants to Person records) but case-level matching to legacy system case IDs is not yet in scope." />
            </span>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link
              to={`/applications/${id}/review`}
              style={{ color: '#1b1b1b', fontSize: '0.9rem', textDecoration: 'none' }}
            >
              Program review
            </Link>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: '#71767a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Eligibility determination
              <DesignGap description="Eligibility determination rules engine is not yet part of the baseline blueprint." />
            </span>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ color: '#71767a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Authorization
              <DesignGap description="Authorization and benefit issuance are not yet part of the baseline blueprint." />
            </span>
          </li>
        </ul>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      {/* Breadcrumb */}
      <nav className="usa-breadcrumb margin-bottom-3" aria-label="Breadcrumbs">
        <ol className="usa-breadcrumb__list">
          <li className="usa-breadcrumb__list-item">
            <Link to="/" className="usa-breadcrumb__link">Home</Link>
          </li>
          <li className="usa-breadcrumb__list-item">
            <Link to="/queue" className="usa-breadcrumb__link">Tasks</Link>
          </li>
          <li className="usa-breadcrumb__list-item usa-current" aria-current="page">
            {application.caseId
              ? `${application.caseId} — ${application.primaryApplicantName}`
              : (application.primaryApplicantName ?? id)}
          </li>
        </ol>
      </nav>

      {/* Page title + task status */}
      <div className="display-flex flex-align-center column-gap-2 margin-bottom-1">
        <h1 className="margin-0 font-heading-xl">Process a new application</h1>
        <Tag className={taskStatusClass}>{taskStatusLabel}</Tag>
        {application.isExpedited && (
          <>
            <Tag className="bg-red-warm-50v">Expedited</Tag>
            <BlueprintAddition description="SNAP expedited processing flag — automatically set by the blueprint's eligibility screening when the applicant meets expedited criteria (e.g., income below $150/month). CBMS requires manual flagging." />
          </>
        )}
      </div>
      <p className="usa-intro margin-top-05 margin-bottom-4 text-base">
        Walk through each program review, resolve any missing fields or verifications, then run the eligibility determination. The system saves your progress at every step.
      </p>

      {/* Metric cards */}
      <div className="display-flex column-gap-2 margin-bottom-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div
          style={{
            border: '1px solid #dfe1e2',
            borderRadius: '4px',
            padding: '1rem 1.5rem',
            minWidth: '200px',
            background: '#fff',
          }}
        >
          <div
            className="font-body-xs text-base-dark text-uppercase margin-bottom-05"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Required fields missing
            <DesignGap description="Blueprint has no API for tracking incomplete required fields — this would need a contract extension." />
          </div>
          <div className="font-heading-xl text-ink">—</div>
        </div>

        <div
          style={{
            border: '1px solid #dfe1e2',
            borderRadius: '4px',
            padding: '1rem 1.5rem',
            minWidth: '200px',
            background: '#fff',
          }}
        >
          <div className="font-body-xs text-base-dark text-uppercase margin-bottom-05">
            Verifications missing
          </div>
          <div className={`font-heading-xl ${verificationsMissing > 0 ? 'text-red-warm-50v' : 'text-ink'}`}>
            {verificationsData ? verificationsMissing : '—'}
          </div>
        </div>

      </div>

      {/* Application summary card */}
      <div
        style={{
          border: '1px solid #dfe1e2',
          borderRadius: '4px',
          background: '#fff',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid #dfe1e2',
            background: '#f0f0f0',
          }}
        >
          <h2 className="font-heading-sm margin-0">Application summary</h2>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <dl className="usa-list usa-list--unstyled" style={{ display: 'table', width: '100%', borderCollapse: 'collapse' }}>

            {[
              {
                label: 'Applicant',
                value: <span className="text-bold">{application.primaryApplicantName ?? '—'}</span>,
              },
              {
                label: 'Case ID',
                badge: <DesignGap description="The blueprint resolves applicants to a Person record via person matching — whether that also creates or links a case record is a design question that needs clarification." />,
                value: <span className="font-mono-xs text-base">{application.caseId ?? '—'}</span>,
              },
              {
                label: 'Language preference',
                value: languageLabel,
              },
              {
                label: 'Submitted date',
                value: formatDate(application.submittedAt),
              },
              {
                label: 'Due date',
                value: formatDate(application.dueDate),
              },
              {
                label: 'Expedited',
                badge: <BlueprintAddition description="Automatically set by the blueprint's eligibility screening when the applicant meets SNAP expedited criteria (e.g., income below $150/month or less than $100 in resources)." />,
                value: application.isExpedited ? 'Yes' : 'Pending',
              },
              {
                label: 'Real-time eligibility',
                badge: <DesignGap description="Medicaid real-time eligibility is a per-member decision, not per-application. It's unclear whether this belongs at the application summary level or in the household member section." />,
                value: 'Pending',
              },
              {
                label: 'Modified date',
                value: formatDate(application.updatedAt),
              },
            ].map(({ label, badge, value }) => (
              <div key={label} style={{ display: 'table-row' }}>
                <dt
                  className="text-base font-body-sm"
                  style={{ display: 'table-cell', padding: '0.35rem 1.5rem 0.35rem 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {label}
                    {badge}
                  </span>
                </dt>
                <dd className="margin-0 font-body-sm" style={{ display: 'table-cell', padding: '0.35rem 0', verticalAlign: 'middle' }}>
                  {value}
                </dd>
              </div>
            ))}

            <div style={{ display: 'table-row' }}>
              <dt className="text-base font-body-sm" style={{ display: 'table-cell', padding: '0.35rem 1.5rem 0.35rem 0', whiteSpace: 'nowrap', verticalAlign: 'top', paddingTop: '0.6rem' }}>
                Programs
              </dt>
              <dd className="margin-0" style={{ display: 'table-cell', padding: '0.35rem 0', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {application.programs.length > 0
                    ? application.programs.map((p) => (
                        <Tag
                          key={p}
                          className={PROGRAM_COLORS[p.toLowerCase()] ?? ''}
                          style={{ textTransform: 'uppercase', fontWeight: 700 }}
                        >
                          {p.toUpperCase()}
                        </Tag>
                      ))
                    : <span className="text-base">—</span>}
                </div>
              </dd>
            </div>

          </dl>
        </div>
      </div>

      </div>
    </div>
  );
}
