import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApiData } from '../hooks/useApiData';
import { apiRequest } from '../api/generic';
import { DesignGap } from '../components/DesignGap';
import { BlueprintAddition } from '../components/BlueprintAddition';
import { type ReviewContext, type ReviewContextMember, type ReviewProgressEntry } from '../components/ApplicationSections';

const BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:1080';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRAM_LABELS: Record<string, string> = {
  snap: 'SNAP',
  medicaid: 'Medical assistance',
  tanf: 'TANF',
  wic: 'WIC',
};

// Sections shown per program (using API section enum values)
const PROGRAM_SECTIONS: Record<string, string[]> = {
  snap: ['identity', 'household', 'contact', 'income', 'expenses', 'assets', 'employment'],
  medicaid: ['identity', 'household', 'contact', 'income', 'health-coverage', 'demographics'],
  tanf: ['identity', 'household', 'contact', 'income', 'expenses', 'employment'],
  wic: ['identity', 'household', 'contact', 'income'],
};

const DEFAULT_SECTIONS = ['identity', 'household', 'contact', 'income', 'expenses', 'assets', 'employment', 'health-coverage'];

// Human-readable labels for each section
const SECTION_LABELS: Record<string, string> = {
  identity: 'Applicant details',
  household: 'Household',
  contact: 'Contact information',
  income: 'Income',
  expenses: 'Expenses',
  assets: 'Assets',
  employment: 'Employment',
  'health-coverage': 'Health coverage',
  demographics: 'Demographics / Citizenship',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function memberName(m: ReviewContextMember): string {
  if (m.givenName || m.familyName) return [m.givenName, m.familyName].filter(Boolean).join(' ');
  return m.roles.includes('primary_applicant') ? 'Primary applicant' : 'Household member';
}

function memberRole(m: ReviewContextMember): string {
  if (m.roles.includes('primary_applicant')) return 'Applicant';
  if (m.roles.includes('household_member')) {
    if (m.relationshipToHead === 'child') return 'Dependent minor';
    return 'Household member';
  }
  return m.roles[0]?.replace(/_/g, ' ') ?? 'Member';
}

// ---------------------------------------------------------------------------
// Data completeness
// ---------------------------------------------------------------------------

interface Completeness {
  filled: number;
  total: number;
}

function DataStatus({ filled, total }: Completeness) {
  if (total === 0) return null;
  const complete = filled === total;
  return complete ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#2e5e35', fontWeight: 700, fontSize: '0.875rem' }}>
      <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#2e5e35', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>✓</span>
      Complete
    </span>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#b50909', fontWeight: 700, fontSize: '0.875rem' }}>
      <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#b50909', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>!</span>
      Incomplete
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

function SectionCard({
  sectionId,
  title,
  summary,
  completeness,
  reviewed,
  onToggleReviewed,
  badge,
}: {
  sectionId: string;
  title: React.ReactNode;
  summary: React.ReactNode;
  completeness?: Completeness;
  reviewed: boolean;
  onToggleReviewed: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div
      id={sectionId}
      style={{
        border: '1px solid #dfe1e2',
        borderRadius: '4px',
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        background: reviewed ? '#f9fbf9' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</span>
            {badge}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#3d4551', marginBottom: completeness ? '0.5rem' : 0 }}>{summary}</div>
          {completeness && <DataStatus {...completeness} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem', flexShrink: 0 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: reviewed ? '#4d8055' : '#1b1b1b',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={reviewed}
              onChange={onToggleReviewed}
              style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#4d8055' }}
            />
            Review complete
          </label>
          <button
            type="button"
            style={{
              border: '1px solid #dfe1e2',
              borderRadius: '4px',
              padding: '0.25rem 0.75rem',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

type SectionProps = {
  reviewed: (section: string, memberId?: string) => boolean;
  onToggle: (section: string, memberId?: string) => void;
};

function identityCompleteness(m: ReviewContextMember): Completeness {
  const checks = [m.givenName, m.familyName, m.dateOfBirth, m.citizenshipStatus];
  return { filled: checks.filter(Boolean).length, total: checks.length };
}

function renderIdentityCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => (
    <SectionCard
      key={`identity-${m.id}`}
      sectionId={`identity-${m.id}`}
      title={`Applicant details — ${memberName(m)}`}
      summary={
        <span>
          {memberName(m)}
          {m.dateOfBirth && ` · DOB ${formatDate(m.dateOfBirth)}`}
          {m.citizenshipStatus && ` · ${m.citizenshipStatus.replace(/_/g, ' ')}`}
        </span>
      }
      completeness={identityCompleteness(m)}
      reviewed={reviewed('identity', m.id)}
      onToggleReviewed={() => onToggle('identity', m.id)}
    />
  ));
}

function renderHouseholdCard(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  const summary = members.length > 0
    ? members.map((m) => `${memberName(m)} (${memberRole(m)})`).join(' · ')
    : 'No household members recorded';
  // Each member should have name + DOB + relationship
  const allFields = members.flatMap((m) => [m.givenName, m.familyName, m.dateOfBirth]);
  const completeness: Completeness = { filled: allFields.filter(Boolean).length, total: allFields.length };
  return (
    <SectionCard
      sectionId="household"
      title="Household"
      summary={summary}
      completeness={completeness}
      reviewed={reviewed('household')}
      onToggleReviewed={() => onToggle('household')}
      badge={
        <BlueprintAddition description="Blueprint tracks full household composition with member roles, relationships, and program eligibility — beyond what many legacy systems expose via API." />
      }
    />
  );
}

function renderContactCard({ reviewed, onToggle }: SectionProps): React.ReactNode {
  return (
    <SectionCard
      sectionId="contact"
      title="Contact information"
      summary={<span className="text-base">Phone · Email · Address</span>}
      reviewed={reviewed('contact')}
      onToggleReviewed={() => onToggle('contact')}
      badge={
        <DesignGap description="The blueprint does not yet have a contract for applicant contact information (phone, email, address). This would need a contract extension." />
      }
    />
  );
}

function renderIncomeCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => {
    const summary = m.incomes.length > 0
      ? m.incomes.map((inc) =>
          `${inc.unearnedType?.replace(/_/g, ' ') ?? inc.type.replace(/_/g, ' ')} $${inc.amount.toLocaleString()}/${inc.frequency}`
        ).join(' · ')
      : 'No income recorded';
    return (
      <SectionCard
        key={`income-${m.id}`}
        sectionId={`income-${m.id}`}
        title={`Income — ${memberName(m)}`}
        summary={summary}
        completeness={{ filled: m.incomes.length > 0 ? 1 : 0, total: 1 }}
        reviewed={reviewed('income', m.id)}
        onToggleReviewed={() => onToggle('income', m.id)}
      />
    );
  });
}

function renderExpensesCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => {
    const summary = m.expenses.length > 0
      ? m.expenses.map((e) => `${e.type.replace(/_/g, ' ')} $${e.amount.toLocaleString()}/${e.frequency}`).join(' · ')
      : 'No expenses recorded';
    return (
      <SectionCard
        key={`expenses-${m.id}`}
        sectionId={`expenses-${m.id}`}
        title={`Expenses — ${memberName(m)}`}
        summary={summary}
        completeness={{ filled: m.expenses.length > 0 ? 1 : 0, total: 1 }}
        reviewed={reviewed('expenses', m.id)}
        onToggleReviewed={() => onToggle('expenses', m.id)}
      />
    );
  });
}

function renderAssetsCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => {
    const summary = m.assets.length > 0
      ? m.assets.map((a) => `${a.type.replace(/_/g, ' ')} $${a.value.toLocaleString()}`).join(' · ')
      : 'No assets recorded';
    return (
      <SectionCard
        key={`assets-${m.id}`}
        sectionId={`assets-${m.id}`}
        title={`Assets — ${memberName(m)}`}
        summary={summary}
        completeness={{ filled: m.assets.length > 0 ? 1 : 0, total: 1 }}
        reviewed={reviewed('assets', m.id)}
        onToggleReviewed={() => onToggle('assets', m.id)}
      />
    );
  });
}

function renderEmploymentCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => {
    const summary = m.employmentRecords.length > 0
      ? m.employmentRecords.map((e) => e.employerName ?? 'Employer on record').join(' · ')
      : 'No employment records';
    return (
      <SectionCard
        key={`employment-${m.id}`}
        sectionId={`employment-${m.id}`}
        title={`Employment — ${memberName(m)}`}
        summary={summary}
        completeness={{ filled: m.employmentRecords.length > 0 ? 1 : 0, total: 1 }}
        reviewed={reviewed('employment', m.id)}
        onToggleReviewed={() => onToggle('employment', m.id)}
      />
    );
  });
}

function renderHealthCoverageCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => {
    const summary = m.healthCoverages.length > 0
      ? m.healthCoverages.map((hc) => hc.type.replace(/_/g, ' ')).join(' · ')
      : 'No coverage records';
    return (
      <SectionCard
        key={`health-${m.id}`}
        sectionId={`health-${m.id}`}
        title={`Health coverage — ${memberName(m)}`}
        summary={summary}
        completeness={{ filled: m.healthCoverages.length > 0 ? 1 : 0, total: 1 }}
        reviewed={reviewed('health-coverage', m.id)}
        onToggleReviewed={() => onToggle('health-coverage', m.id)}
      />
    );
  });
}

function renderDemographicsCards(members: ReviewContextMember[], { reviewed, onToggle }: SectionProps): React.ReactNode {
  return members.map((m) => (
    <SectionCard
      key={`demographics-${m.id}`}
      sectionId={`demographics-${m.id}`}
      title={`Demographics / Citizenship — ${memberName(m)}`}
      summary={m.citizenshipStatus?.replace(/_/g, ' ') ?? 'Not recorded'}
      completeness={{ filled: m.citizenshipStatus ? 1 : 0, total: 1 }}
      reviewed={reviewed('demographics', m.id)}
      onToggleReviewed={() => onToggle('demographics', m.id)}
    />
  ));
}

function renderSections(sectionIds: string[], members: ReviewContextMember[], sectionProps: SectionProps): React.ReactNode {
  return sectionIds.map((sid) => {
    switch (sid) {
      case 'identity': return <div key="identity">{renderIdentityCards(members, sectionProps)}</div>;
      case 'household': return <div key="household">{renderHouseholdCard(members, sectionProps)}</div>;
      case 'contact': return <div key="contact">{renderContactCard(sectionProps)}</div>;
      case 'income': return <div key="income">{renderIncomeCards(members, sectionProps)}</div>;
      case 'expenses': return <div key="expenses">{renderExpensesCards(members, sectionProps)}</div>;
      case 'assets': return <div key="assets">{renderAssetsCards(members, sectionProps)}</div>;
      case 'employment': return <div key="employment">{renderEmploymentCards(members, sectionProps)}</div>;
      case 'health-coverage': return <div key="health-coverage">{renderHealthCoverageCards(members, sectionProps)}</div>;
      case 'demographics': return <div key="demographics">{renderDemographicsCards(members, sectionProps)}</div>;
      default: return null;
    }
  });
}

// Section anchor labels for "On this page" nav
function sectionAnchors(sectionIds: string[], members: ReviewContextMember[]): { id: string; label: string }[] {
  const anchors: { id: string; label: string }[] = [];
  for (const sid of sectionIds) {
    const label = SECTION_LABELS[sid] ?? sid;
    switch (sid) {
      case 'identity':
        members.forEach((m) => anchors.push({ id: `identity-${m.id}`, label: `${label} — ${memberName(m)}` }));
        break;
      case 'household':
        anchors.push({ id: 'household', label });
        break;
      case 'contact':
        anchors.push({ id: 'contact', label });
        break;
      case 'income':
        members.forEach((m) => anchors.push({ id: `income-${m.id}`, label: `Income — ${memberName(m)}` }));
        break;
      case 'expenses':
        members.forEach((m) => anchors.push({ id: `expenses-${m.id}`, label: `Expenses — ${memberName(m)}` }));
        break;
      case 'assets':
        members.forEach((m) => anchors.push({ id: `assets-${m.id}`, label: `Assets — ${memberName(m)}` }));
        break;
      case 'employment':
        members.forEach((m) => anchors.push({ id: `employment-${m.id}`, label: `Employment — ${memberName(m)}` }));
        break;
      case 'health-coverage':
        members.forEach((m) => anchors.push({ id: `health-${m.id}`, label: `Health coverage — ${memberName(m)}` }));
        break;
      case 'demographics':
        members.forEach((m) => anchors.push({ id: `demographics-${m.id}`, label: `Demographics / Citizenship — ${memberName(m)}` }));
        break;
    }
  }
  return anchors;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProgramReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState<ReviewProgressEntry[]>([]);

  const fetcher = useMemo(
    () =>
      id
        ? async () => {
            const res = await apiRequest(`${BASE_URL}/intake/applications/${id}/review-context`);
            return res as ReviewContext;
          }
        : null,
    [id],
  );

  const { data: context, loading, error } = useApiData<ReviewContext>(fetcher);

  useEffect(() => {
    if (context) {
      if (!activeProgram && context.application.programs.length > 0) {
        setActiveProgram(context.application.programs[0]);
      }
      setReviewProgress(context.reviewProgress ?? []);
    }
  }, [context, activeProgram]);

  // Check if a (section, memberId) pair is marked complete
  const isReviewed = useCallback(
    (section: string, memberId?: string): boolean => {
      return reviewProgress.some(
        (e) =>
          e.section === section &&
          (memberId ? e.memberId === memberId : !e.memberId) &&
          e.status === 'complete',
      );
    },
    [reviewProgress],
  );

  // Toggle a section between complete and not_started, persisting to the API
  const toggleReviewed = useCallback(
    async (section: string, memberId?: string) => {
      if (!id) return;
      const currentlyReviewed = reviewProgress.some(
        (e) =>
          e.section === section &&
          (memberId ? e.memberId === memberId : !e.memberId) &&
          e.status === 'complete',
      );
      const newStatus = currentlyReviewed ? 'not_started' : 'complete';

      // Optimistic update
      setReviewProgress((prev) => {
        const existing = prev.find(
          (e) => e.section === section && (memberId ? e.memberId === memberId : !e.memberId),
        );
        if (existing) {
          return prev.map((e) =>
            e === existing ? { ...e, status: newStatus } : e,
          );
        }
        return [
          ...prev,
          {
            id: `optimistic-${section}-${memberId ?? 'household'}`,
            applicationId: id,
            section: section as ReviewProgressEntry['section'],
            memberId: memberId ?? null,
            status: newStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      try {
        const body: Record<string, unknown> = { section, status: newStatus };
        if (memberId) body.memberId = memberId;
        const updated = await apiRequest(
          `${BASE_URL}/intake/applications/${id}/review-progress`,
          { method: 'PATCH', body: JSON.stringify(body) },
        ) as ReviewProgressEntry;

        // Replace optimistic entry with server response
        setReviewProgress((prev) =>
          prev.map((e) =>
            e.section === section && (memberId ? e.memberId === memberId : !e.memberId)
              ? updated
              : e,
          ),
        );
      } catch {
        // Revert on failure
        setReviewProgress((prev) =>
          prev.map((e) =>
            e.section === section && (memberId ? e.memberId === memberId : !e.memberId)
              ? { ...e, status: currentlyReviewed ? 'complete' : 'not_started' }
              : e,
          ),
        );
      }
    },
    [id, reviewProgress],
  );

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

  const { application, members } = context;
  const programLabel = activeProgram ? (PROGRAM_LABELS[activeProgram] ?? activeProgram.toUpperCase()) : '—';
  const applicantName = application.primaryApplicantName ?? id?.slice(0, 8).toUpperCase();
  const activeSections = activeProgram
    ? (PROGRAM_SECTIONS[activeProgram] ?? DEFAULT_SECTIONS)
    : DEFAULT_SECTIONS;
  const anchors = sectionAnchors(activeSections, members);

  const sectionProps: SectionProps = { reviewed: isReviewed, onToggle: toggleReviewed };

  // Build a completeness map: anchorId → { filled, total }
  const completenessMap = new Map<string, Completeness>();
  for (const m of members) {
    completenessMap.set(`identity-${m.id}`, identityCompleteness(m));
    completenessMap.set(`income-${m.id}`, { filled: m.incomes.length > 0 ? 1 : 0, total: 1 });
    completenessMap.set(`expenses-${m.id}`, { filled: m.expenses.length > 0 ? 1 : 0, total: 1 });
    completenessMap.set(`assets-${m.id}`, { filled: m.assets.length > 0 ? 1 : 0, total: 1 });
    completenessMap.set(`employment-${m.id}`, { filled: m.employmentRecords.length > 0 ? 1 : 0, total: 1 });
    completenessMap.set(`health-${m.id}`, { filled: m.healthCoverages.length > 0 ? 1 : 0, total: 1 });
    completenessMap.set(`demographics-${m.id}`, { filled: m.citizenshipStatus ? 1 : 0, total: 1 });
  }
  const householdFields = members.flatMap((m) => [m.givenName, m.familyName, m.dateOfBirth]);
  completenessMap.set('household', { filled: householdFields.filter(Boolean).length, total: householdFields.length });

  // Incomplete sections for the alert banner
  const incompleteAnchors = anchors.filter(({ id: anchorId }) => {
    const c = completenessMap.get(anchorId);
    return c ? c.filled < c.total : false;
  });

  // Progress summary for current program
  const totalCards = anchors.length;
  const reviewedCount = anchors.filter(({ id: anchorId }) => {
    const parts = anchorId.split('-');
    if (parts.length === 1) return isReviewed(anchorId);
    const memberId = parts.slice(-5).join('-');
    const section = parts.slice(0, -5).join('-');
    return isReviewed(section === 'health' ? 'health-coverage' : section, memberId);
  }).length;

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>

      {/* ── Left nav ─────────────────────────────────────────────────────── */}
      <nav
        aria-label="Review workflow"
        style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '1rem' }}
      >
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
          {[
            { label: 'Overview', href: `/applications/${id}`, done: true },
            { label: 'Case matching', href: null, done: true, gap: <DesignGap description="Blueprint handles person matching (resolving applicants to Person records) but case-level matching to legacy system case IDs is not yet in scope." /> },
          ].map(({ label, href, done, gap }) => (
            <li key={label} style={{ marginBottom: '0.5rem' }}>
              {href ? (
                <Link
                  to={href}
                  style={{ color: done ? '#4d8055' : '#1b1b1b', fontWeight: done ? 600 : 400, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
                >
                  {done && <span>✓</span>}
                  {label}
                  {gap}
                </Link>
              ) : (
                <span style={{ color: done ? '#4d8055' : '#71767a', fontWeight: done ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                  {done && <span>✓</span>}
                  {label}
                  {gap}
                </span>
              )}
            </li>
          ))}

          {/* Program review — expanded */}
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1b1b1b' }}>Program review</span>
            <ul style={{ listStyle: 'none', padding: '0.35rem 0 0 0.9rem', margin: 0 }}>
              {application.programs.map((prog) => {
                const isActive = prog === activeProgram;
                return (
                  <li key={prog}>
                    <button
                      type="button"
                      onClick={() => setActiveProgram(prog)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.2rem 0',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? '#005ea2' : '#1b1b1b',
                        borderLeft: isActive ? '3px solid #005ea2' : '3px solid transparent',
                        paddingLeft: '0.5rem',
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      {PROGRAM_LABELS[prog] ?? prog.toUpperCase()}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>

          {[
            { label: 'Eligibility determination', gap: <DesignGap description="Eligibility determination rules engine is not yet part of the baseline blueprint." /> },
            { label: 'Authorization', gap: <DesignGap description="Authorization and benefit issuance are not yet part of the baseline blueprint." /> },
          ].map(({ label, gap }) => (
            <li key={label} style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#71767a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {label}
                {gap}
              </span>
            </li>
          ))}
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
            <li className="usa-breadcrumb__list-item">
              <Link to={`/applications/${id}`} className="usa-breadcrumb__link">
                {applicantName}
              </Link>
            </li>
            <li className="usa-breadcrumb__list-item usa-current" aria-current="page">
              {programLabel}
            </li>
          </ol>
        </nav>

        {/* Section label + H1 + progress */}
        <p
          className="margin-0 margin-bottom-05 text-uppercase font-body-xs text-base-dark"
          style={{ letterSpacing: '0.08em', fontWeight: 700 }}
        >
          Program review
        </p>
        <div className="display-flex flex-align-center column-gap-2 margin-bottom-1">
          <h1 className="margin-0 font-heading-xl">{programLabel}</h1>
        </div>
        <p className="text-base font-body-sm margin-top-0 margin-bottom-3">
          {reviewedCount} of {totalCards} sections reviewed
        </p>

        {/* Incomplete data alert */}
        {incompleteAnchors.length > 0 && (
          <div
            className="margin-bottom-3"
            style={{ background: '#fef0c8', border: '1px solid #c2850c', borderRadius: '4px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}
          >
            <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#ad5700', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0, marginTop: '0.05rem' }}>!</span>
            <span className="font-body-sm">
              Review information in the following sections:{' '}
              {incompleteAnchors.map(({ id: anchorId, label }, i) => (
                <span key={anchorId}>
                  {i > 0 && ', '}
                  <a href={`#${anchorId}`} style={{ color: '#ad5700' }}>{label}</a>
                </span>
              ))}
            </span>
          </div>
        )}

        {/* Section cards */}
        {renderSections(activeSections, members, sectionProps)}
      </div>

      {/* ── Right nav (On this page) ──────────────────────────────────────── */}
      <nav
        aria-label="On this page"
        style={{ width: '200px', flexShrink: 0, position: 'sticky', top: '1rem' }}
      >
        <p style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem', color: '#1b1b1b' }}>
          On this page
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {anchors.map(({ id: anchorId, label }) => (
            <li key={anchorId} style={{ marginBottom: '0.4rem' }}>
              <a
                href={`#${anchorId}`}
                style={{ fontSize: '0.85rem', color: '#005ea2', textDecoration: 'none' }}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

    </div>
  );
}
