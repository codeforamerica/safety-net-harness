import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApiData } from '../hooks/useApiData';
import { apiRequest } from '../api/generic';
import { type ReviewContext, type MemberIncome } from '../components/ApplicationSections';

const BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? 'http://localhost:1080';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INCOME_TYPE_LABELS: Record<string, string> = {
  employed: 'Employed',
  self_employed: 'Self-employed',
  unearned: 'Unearned',
};

const FREQUENCY_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  every_2_weeks: 'Every 2 weeks',
  twice_a_month: 'Twice a month',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const BASIS_LABELS: Record<string, string> = {
  gross: 'Gross',
  net: 'Net',
};

const UNEARNED_TYPE_LABELS: Record<string, string> = {
  unemployment: 'Unemployment',
  kinship_payment: 'Kinship payment',
  veterans_programs: 'Veterans programs',
  adoption_and_refugee_services: 'Adoption and refugee services',
  ssi_or_ssdi: 'SSI / SSDI',
  private_disability: 'Private disability',
  workers_compensation: "Worker's compensation",
  disability_from_veterans_programs: 'Disability from veterans programs',
  legal_settlement: 'Legal settlement',
  scholarship: 'Scholarship',
  educational_grant: 'Educational grant',
  work_study: 'Work study',
  spousal_support: 'Spousal support',
  child_support: 'Child support',
  retirement_or_pension: 'Retirement or pension',
  investment_interest_and_dividends: 'Investment / interest / dividends',
  social_security_retirement: 'Social Security retirement',
  rental_income: 'Rental income',
  gambling_or_lottery_winnings: 'Gambling or lottery winnings',
  gifts_or_donations: 'Gifts or donations',
  loan_or_mortgage_income: 'Loan or mortgage income',
  research_participation: 'Research participation',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function memberDisplayName(m: { givenName?: string; familyName?: string; roles: string[] }): string {
  if (m.givenName || m.familyName) return [m.givenName, m.familyName].filter(Boolean).join(' ');
  return m.roles.includes('primary_applicant') ? 'Primary applicant' : 'Household member';
}

function memberDisplayRole(m: { roles: string[]; relationshipToHead?: string }): string {
  if (m.roles.includes('primary_applicant')) return 'Applicant';
  if (m.roles.includes('household_member')) {
    if (m.relationshipToHead === 'child') return 'Dependent minor';
    return 'Household member';
  }
  return m.roles[0]?.replace(/_/g, ' ') ?? 'Member';
}

function isIncomplete(fields: Partial<MemberIncome>): boolean {
  if (!fields.type || !fields.frequency) return true;
  if (fields.amount == null || fields.amount <= 0) return true;
  if (fields.type === 'unearned' && !fields.unearnedType) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Form field components
// ---------------------------------------------------------------------------

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.3rem' }}>
      {children}
      {required && <span style={{ color: '#b50909', marginLeft: '0.2rem' }}>*</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #565c65',
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
      }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #565c65',
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        background: '#fff',
        appearance: 'auto',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Income record card
// ---------------------------------------------------------------------------

interface IncomeDraft {
  tempId: string;
  realId?: string; // set for existing records
  fields: Partial<MemberIncome>;
  isNew: boolean;
}

function IncomeRecordCard({
  draft,
  index,
  onChange,
  onRemove,
}: {
  draft: IncomeDraft;
  index: number;
  onChange: (field: keyof MemberIncome, value: string | number) => void;
  onRemove: () => void;
}) {
  const { fields } = draft;
  const incomplete = isIncomplete(fields);

  return (
    <div
      style={{
        border: `2px solid ${incomplete ? '#b50909' : '#dfe1e2'}`,
        borderRadius: '4px',
        padding: '1.25rem',
        background: '#fff',
        marginBottom: '1rem',
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Income {index + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {incomplete && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#b50909', fontWeight: 700, fontSize: '0.875rem' }}>
              <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#b50909', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, flexShrink: 0 }}>!</span>
              Incomplete
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#71767a', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit', padding: '0' }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Form grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <FieldLabel required>Income type</FieldLabel>
          <SelectInput
            value={fields.type ?? ''}
            onChange={(v) => onChange('type', v)}
            options={Object.entries(INCOME_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>

        <div>
          <FieldLabel required>Frequency</FieldLabel>
          <SelectInput
            value={fields.frequency ?? ''}
            onChange={(v) => onChange('frequency', v)}
            options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>

        {fields.type === 'unearned' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel required>Unearned income type</FieldLabel>
            <SelectInput
              value={fields.unearnedType ?? ''}
              onChange={(v) => onChange('unearnedType', v)}
              options={Object.entries(UNEARNED_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
        )}

        <div>
          <FieldLabel required>Amount</FieldLabel>
          <TextInput
            type="number"
            value={fields.amount != null ? String(fields.amount) : ''}
            onChange={(v) => onChange('amount', parseFloat(v) || 0)}
            placeholder="0.00"
          />
        </div>

        <div>
          <FieldLabel>Income basis</FieldLabel>
          <SelectInput
            value={fields.incomeBasis ?? ''}
            onChange={(v) => onChange('incomeBasis', v)}
            options={Object.entries(BASIS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>

        <div>
          <FieldLabel>Start date</FieldLabel>
          <TextInput
            type="date"
            value={fields.startDate ?? ''}
            onChange={(v) => onChange('startDate', v)}
          />
        </div>

        <div>
          <FieldLabel>End date</FieldLabel>
          <TextInput
            type="date"
            value={fields.endDate ?? ''}
            onChange={(v) => onChange('endDate', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IncomeEditPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();

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

  const [drafts, setDrafts] = useState<IncomeDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (context && memberId) {
      const member = context.members.find((m) => m.id === memberId);
      if (member) {
        setDrafts(
          member.incomes.map((inc) => ({
            tempId: inc.id,
            realId: inc.id,
            fields: { ...inc },
            isNew: false,
          })),
        );
      }
    }
  }, [context, memberId]);

  function updateDraft(tempId: string, field: keyof MemberIncome, value: string | number) {
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, fields: { ...d.fields, [field]: value } } : d)),
    );
  }

  function addRecord() {
    setDrafts((prev) => [
      ...prev,
      { tempId: `new-${Date.now()}`, fields: {}, isNew: true },
    ]);
  }

  function removeRecord(tempId: string) {
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  }

  async function handleConfirm() {
    if (!id || !memberId) return;
    setSaving(true);
    setSaveError(null);
    try {
      for (const draft of drafts) {
        const body = { ...draft.fields };
        // Remove empty optional fields
        if (!body.unearnedType) delete body.unearnedType;
        if (!body.incomeBasis) delete body.incomeBasis;
        if (!body.startDate) delete body.startDate;
        if (!body.endDate) delete body.endDate;

        if (draft.isNew) {
          if (body.type && body.amount && body.frequency) {
            await apiRequest(
              `${BASE_URL}/intake/applications/${id}/members/${memberId}/incomes`,
              { method: 'POST', body: JSON.stringify(body) },
            );
          }
        } else if (draft.realId) {
          await apiRequest(
            `${BASE_URL}/intake/applications/${id}/members/${memberId}/incomes/${draft.realId}`,
            { method: 'PATCH', body: JSON.stringify(body) },
          );
        }
      }
      navigate(`/applications/${id}/review`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

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

  const member = context.members.find((m) => m.id === memberId);
  if (!member) return <p className="usa-prose padding-y-4">Member not found.</p>;

  const applicantName = context.application.primaryApplicantName ?? id?.slice(0, 8).toUpperCase();
  const hasIncomplete = drafts.some((d) => isIncomplete(d.fields));

  return (
    <div style={{ paddingBottom: '5rem' }}>
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
            <Link to={`/applications/${id}`} className="usa-breadcrumb__link">{applicantName}</Link>
          </li>
          <li className="usa-breadcrumb__list-item">
            <Link to={`/applications/${id}/review`} className="usa-breadcrumb__link">Program review</Link>
          </li>
          <li className="usa-breadcrumb__list-item usa-current" aria-current="page">
            Income
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h1 className="margin-0 font-heading-xl">Income</h1>
        {hasIncomplete && (
          <span
            style={{
              border: '1px solid #ad5700',
              borderRadius: '99px',
              padding: '0.15rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#ad5700',
            }}
          >
            Incomplete
          </span>
        )}
      </div>
      <p className="margin-top-05 margin-bottom-4 font-body-sm text-base">
        {memberDisplayName(member)} · {memberDisplayRole(member)}
      </p>

      {/* Save error */}
      {saveError && (
        <div className="usa-alert usa-alert--error margin-bottom-3" role="alert">
          <div className="usa-alert__body">
            <p className="usa-alert__text">{saveError}</p>
          </div>
        </div>
      )}

      {/* Income cards */}
      {drafts.length === 0 && (
        <p className="text-base font-body-sm margin-bottom-3">No income sources recorded. Add one below.</p>
      )}
      {drafts.map((draft, i) => (
        <IncomeRecordCard
          key={draft.tempId}
          draft={draft}
          index={i}
          onChange={(field, value) => updateDraft(draft.tempId, field, value)}
          onRemove={() => removeRecord(draft.tempId)}
        />
      ))}

      {/* Add income source */}
      <button
        type="button"
        onClick={addRecord}
        style={{
          border: '1px dashed #005ea2',
          borderRadius: '4px',
          padding: '0.6rem 1.25rem',
          background: '#f0f7ff',
          color: '#005ea2',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: 'inherit',
          width: '100%',
          marginBottom: '2rem',
        }}
      >
        + Add income source
      </button>

      {/* Fixed footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #dfe1e2',
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          zIndex: 100,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/applications/${id}/review`)}
          style={{
            border: '1px solid #1b1b1b',
            borderRadius: '4px',
            padding: '0.5rem 1.25rem',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          ← Back to review
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          style={{
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1.5rem',
            background: saving ? '#71767a' : '#005ea2',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Confirm →'}
        </button>
      </div>
    </div>
  );
}
