/**
 * Section components for displaying application data.
 * Used by the application detail/review page.
 */
import { Tag, Table } from '@trussworks/react-uswds';
import { DesignGap } from './DesignGap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReviewProgressStatus = 'not_started' | 'in_progress' | 'complete' | 'flagged';
export type ReviewSection = 'assets' | 'contact' | 'demographics' | 'employment' | 'expenses' | 'health-coverage' | 'household' | 'identity' | 'income';

export interface Application {
  id: string;
  status: string;
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

export interface MemberIncome {
  id: string;
  type: string;
  unearnedType?: string;
  incomeBasis?: string;
  amount: number;
  frequency: string;
  startDate?: string;
  endDate?: string;
}

export interface MemberExpense {
  id: string;
  type: string;
  amount: number;
  frequency: string;
}

export interface MemberAsset {
  id: string;
  type: string;
  value: number;
}

export interface MemberEmployment {
  id: string;
  employerName?: string;
  startDate?: string;
  endDate?: string;
}

export interface MemberHealthCoverage {
  id: string;
  type: string;
}

export interface ReviewContextMember {
  id: string;
  applicationId: string;
  roles: string[];
  personId?: string | null;
  dateOfBirth?: string;
  relationshipToHead?: string;
  citizenshipStatus?: string;
  programs?: string[];
  // CBMS overlay fields
  givenName?: string;
  familyName?: string;
  incomes: MemberIncome[];
  expenses: MemberExpense[];
  assets: MemberAsset[];
  employmentRecords: MemberEmployment[];
  healthCoverages: MemberHealthCoverage[];
}

export interface ReviewProgressEntry {
  id: string;
  applicationId: string;
  section: ReviewSection;
  memberId?: string | null;
  status: ReviewProgressStatus;
}

export interface ApplicationNote {
  id: string;
  applicationId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewContext {
  application: Application;
  householdInfo: Record<string, unknown> | null;
  members: ReviewContextMember[];
  reviewProgress: ReviewProgressEntry[];
  notes: ApplicationNote[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SECTIONS: { id: ReviewSection; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'contact', label: 'Contact' },
  { id: 'identity', label: 'Identity' },
  { id: 'demographics', label: 'Demographics' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'assets', label: 'Assets' },
  { id: 'employment', label: 'Employment' },
  { id: 'health-coverage', label: 'Health coverage' },
];

export const PROGRESS_LABEL: Record<ReviewProgressStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  flagged: 'Flagged',
};

export const PROGRESS_CLASS: Record<ReviewProgressStatus, string> = {
  not_started: 'bg-base-lighter text-base',
  in_progress: 'bg-gold-20v',
  complete: 'bg-green-cool-20v',
  flagged: 'bg-red-warm-20v',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function memberLabel(member: ReviewContextMember, index: number): string {
  if (member.givenName || member.familyName) {
    const name = [member.givenName, member.familyName].filter(Boolean).join(' ');
    const primary = member.roles.includes('primary_applicant') ? ' (primary)' : '';
    return name + primary;
  }
  const primary = member.roles.includes('primary_applicant') ? 'Primary applicant' : null;
  const role = primary ?? member.roles[0]?.replace(/_/g, ' ') ?? `Member ${index + 1}`;
  const dob = member.dateOfBirth ? ` (DOB: ${formatDate(member.dateOfBirth)})` : '';
  return role.charAt(0).toUpperCase() + role.slice(1) + dob;
}

export function progressForSection(
  reviewProgress: ReviewProgressEntry[],
  sectionId: ReviewSection,
  memberId?: string,
): ReviewProgressStatus {
  const entry = reviewProgress.find(
    (p) => p.section === sectionId && (memberId ? p.memberId === memberId : !p.memberId),
  );
  return entry?.status ?? 'not_started';
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return <p className="text-base font-body-sm padding-y-2">No {label.toLowerCase()} recorded.</p>;
}

export function HouseholdSection({ context }: { context: ReviewContext }) {
  const { application, householdInfo, members } = context;
  return (
    <div>
      <h3 className="font-heading-sm margin-bottom-1">Application</h3>
      <dl className="usa-list usa-list--unstyled grid-row grid-gap margin-bottom-3">
        <div className="grid-col-6">
          <dt className="text-base-dark font-body-xs text-uppercase">Programs</dt>
          <dd className="margin-0 margin-top-05">{application.programs.map((p) => p.toUpperCase()).join(', ') || '—'}</dd>
        </div>
        <div className="grid-col-6">
          <dt className="text-base-dark font-body-xs text-uppercase">Channel</dt>
          <dd className="margin-0 margin-top-05 text-capitalize">{application.channel?.replace('_', ' ') ?? '—'}</dd>
        </div>
        <div className="grid-col-6 margin-top-2">
          <dt className="text-base-dark font-body-xs text-uppercase">Submitted</dt>
          <dd className="margin-0 margin-top-05">{formatDate(application.submittedAt)}</dd>
        </div>
        <div className="grid-col-6 margin-top-2">
          <dt className="text-base-dark font-body-xs text-uppercase">Expedited</dt>
          <dd className="margin-0 margin-top-05">
            {application.isExpedited === true ? <Tag className="bg-red-warm-50v">Yes</Tag> :
             application.isExpedited === false ? 'No' : '—'}
          </dd>
        </div>
        {application.dueDate && (
          <div className="grid-col-6 margin-top-2">
            <dt className="text-base-dark font-body-xs text-uppercase">
              Due{' '}
              <DesignGap description="CBMS overlay field — not in the baseline blueprint." />
            </dt>
            <dd className="margin-0 margin-top-05">{formatDate(application.dueDate)}</dd>
          </div>
        )}
      </dl>

      <h3 className="font-heading-sm margin-bottom-1">Household members ({members.length})</h3>
      {members.length === 0 ? (
        <div className="usa-alert usa-alert--info usa-alert--slim" role="note">
          <div className="usa-alert__body">
            <p className="usa-alert__text">No members added yet.</p>
          </div>
        </div>
      ) : (
        <Table fullWidth>
          <thead>
            <tr>
              <th>Name <DesignGap description="givenName/familyName are CBMS overlay fields — not in baseline member schema." /></th>
              <th>Role</th>
              <th>Date of birth</th>
              <th>Relationship</th>
              <th>Citizenship</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.givenName || m.familyName
                    ? `${m.givenName ?? ''} ${m.familyName ?? ''}`.trim()
                    : <span className="text-base">—</span>}
                </td>
                <td className="text-capitalize">{m.roles.join(', ').replace(/_/g, ' ')}</td>
                <td>{formatDate(m.dateOfBirth)}</td>
                <td className="text-capitalize">{m.relationshipToHead?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="text-capitalize">{m.citizenshipStatus?.replace(/_/g, ' ') ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {householdInfo && (
        <>
          <h3 className="font-heading-sm margin-top-3 margin-bottom-1">Household info</h3>
          <pre className="font-mono-xs bg-base-lightest padding-2 overflow-auto">
            {JSON.stringify(householdInfo, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

export function IncomeSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          {m.incomes.length === 0 ? <EmptyState label="income records" /> : (
            <Table fullWidth>
              <thead><tr><th>Type</th><th>Amount</th><th>Frequency</th></tr></thead>
              <tbody>
                {m.incomes.map((inc) => (
                  <tr key={inc.id}>
                    <td className="text-capitalize">{inc.unearnedType?.replace(/_/g, ' ') ?? inc.type.replace(/_/g, ' ')}</td>
                    <td>${inc.amount.toLocaleString()}</td>
                    <td className="text-capitalize">{inc.frequency.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}

export function ExpensesSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          {m.expenses.length === 0 ? <EmptyState label="expense records" /> : (
            <Table fullWidth>
              <thead><tr><th>Type</th><th>Amount</th><th>Frequency</th></tr></thead>
              <tbody>
                {m.expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-capitalize">{exp.type.replace(/_/g, ' ')}</td>
                    <td>${exp.amount.toLocaleString()}</td>
                    <td className="text-capitalize">{exp.frequency.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}

export function AssetsSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          {m.assets.length === 0 ? <EmptyState label="asset records" /> : (
            <Table fullWidth>
              <thead><tr><th>Type</th><th>Value</th></tr></thead>
              <tbody>
                {m.assets.map((a) => (
                  <tr key={a.id}>
                    <td className="text-capitalize">{a.type.replace(/_/g, ' ')}</td>
                    <td>${a.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}

export function EmploymentSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          {m.employmentRecords.length === 0 ? <EmptyState label="employment records" /> : (
            <Table fullWidth>
              <thead><tr><th>Employer</th><th>Start</th><th>End</th></tr></thead>
              <tbody>
                {m.employmentRecords.map((e) => (
                  <tr key={e.id}>
                    <td>{e.employerName ?? '—'}</td>
                    <td>{formatDate(e.startDate)}</td>
                    <td>{formatDate(e.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}

export function HealthCoverageSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          {m.healthCoverages.length === 0 ? <EmptyState label="health coverage records" /> : (
            <Table fullWidth>
              <thead><tr><th>Type</th></tr></thead>
              <tbody>
                {m.healthCoverages.map((hc) => (
                  <tr key={hc.id}><td className="text-capitalize">{hc.type.replace(/_/g, ' ')}</td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ))}
    </div>
  );
}

export function DemographicsSection({ members }: { members: ReviewContextMember[] }) {
  if (members.length === 0) return <EmptyState label="members" />;
  return (
    <div>
      {members.map((m, i) => (
        <div key={m.id} className="margin-bottom-4">
          <h3 className="font-heading-sm margin-bottom-1">{memberLabel(m, i)}</h3>
          <dl className="usa-list usa-list--unstyled grid-row grid-gap">
            <div className="grid-col-6">
              <dt className="text-base-dark font-body-xs text-uppercase">Date of birth</dt>
              <dd className="margin-0 margin-top-05">{formatDate(m.dateOfBirth)}</dd>
            </div>
            <div className="grid-col-6">
              <dt className="text-base-dark font-body-xs text-uppercase">Citizenship</dt>
              <dd className="margin-0 margin-top-05 text-capitalize">{m.citizenshipStatus?.replace(/_/g, ' ') ?? '—'}</dd>
            </div>
            <div className="grid-col-6 margin-top-2">
              <dt className="text-base-dark font-body-xs text-uppercase">Programs applying for</dt>
              <dd className="margin-0 margin-top-05">
                {(m.programs ?? []).length > 0
                  ? (m.programs as string[]).map((p) => p.toUpperCase()).join(', ')
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

export function NotesSection({ notes }: { notes: ApplicationNote[] }) {
  if (notes.length === 0) return <EmptyState label="notes" />;
  return (
    <div>
      {notes.map((note) => (
        <div key={note.id} className="border-left-2px border-base-light padding-left-2 margin-bottom-3">
          <p className="margin-0 line-height-body-5">{note.body}</p>
          <p className="text-base font-body-xs margin-top-1 margin-bottom-0">{formatDate(note.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

export function renderSection(sectionId: ReviewSection, context: ReviewContext) {
  switch (sectionId) {
    case 'household': return <HouseholdSection context={context} />;
    case 'income': return <IncomeSection members={context.members} />;
    case 'expenses': return <ExpensesSection members={context.members} />;
    case 'assets': return <AssetsSection members={context.members} />;
    case 'employment': return <EmploymentSection members={context.members} />;
    case 'health-coverage': return <HealthCoverageSection members={context.members} />;
    case 'demographics': return <DemographicsSection members={context.members} />;
    case 'identity':
    case 'contact':
      return <p className="text-base font-body-sm">No {sectionId} data available.</p>;
    default: return null;
  }
}
