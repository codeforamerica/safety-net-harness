import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tag } from '@trussworks/react-uswds';
import { useApiData } from '../hooks/useApiData';
import { apiRequest } from '../api/generic';
import { DesignGap } from '../components/DesignGap';

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

export function ReviewPage() {
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
    <div>
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
            {application.primaryApplicantName
              ? `${id?.slice(0, 8).toUpperCase()} — ${application.primaryApplicantName}`
              : id?.slice(0, 8).toUpperCase()}
          </li>
        </ol>
      </nav>

      {/* Page title + task status */}
      <div className="display-flex flex-align-center column-gap-2 margin-bottom-1">
        <h1 className="margin-0 font-heading-xl">Process a new application</h1>
        <Tag className={taskStatusClass}>{taskStatusLabel}</Tag>
        {application.isExpedited && <Tag className="bg-red-warm-50v">Expedited</Tag>}
      </div>
      <p className="usa-intro margin-top-05 margin-bottom-4 text-base">
        Review all sections and verify the applicant's information before making a determination.
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
          <dl className="usa-list usa-list--unstyled grid-row grid-gap-4">

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt className="text-base-dark font-body-xs text-uppercase margin-bottom-05">Applicant</dt>
              <dd className="margin-0 font-body-md text-bold">
                {application.primaryApplicantName ?? '—'}
              </dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt
                className="text-base-dark font-body-xs text-uppercase margin-bottom-05"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Case ID
                <DesignGap description="Case ID is a vendor-assigned identifier (e.g. from CBMS). The blueprint tracks applications by application ID only — no case ID concept in the baseline." />
              </dt>
              <dd className="margin-0 font-mono-xs text-base">{id?.slice(0, 8).toUpperCase()}</dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt className="text-base-dark font-body-xs text-uppercase margin-bottom-05">Language preference</dt>
              <dd className="margin-0">{languageLabel}</dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt className="text-base-dark font-body-xs text-uppercase margin-bottom-05">Submitted</dt>
              <dd className="margin-0">{formatDate(application.submittedAt)}</dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt
                className="text-base-dark font-body-xs text-uppercase margin-bottom-05"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Due date
                <DesignGap description="dueDate is a CBMS overlay field — not in the baseline blueprint application schema." />
              </dt>
              <dd className="margin-0">{formatDate(application.dueDate)}</dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt
                className="text-base-dark font-body-xs text-uppercase margin-bottom-05"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Real-time eligibility
                <DesignGap description="Blueprint has no real-time eligibility check API. States connect to their own eligibility engines via adapters." />
              </dt>
              <dd className="margin-0 text-base">—</dd>
            </div>

            <div className="grid-col-6 tablet:grid-col-4 margin-bottom-205">
              <dt className="text-base-dark font-body-xs text-uppercase margin-bottom-05">Last modified</dt>
              <dd className="margin-0">{formatDate(application.updatedAt)}</dd>
            </div>

            <div className="grid-col-12 margin-bottom-205">
              <dt className="text-base-dark font-body-xs text-uppercase margin-bottom-1">Programs</dt>
              <dd className="margin-0" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
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
              </dd>
            </div>

          </dl>
        </div>
      </div>
    </div>
  );
}
