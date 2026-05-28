import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag } from '@trussworks/react-uswds';
import { useDemo } from '../context/DemoContext';

const BASE = 'http://localhost:1080';

interface Task {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  taskType: string;
  name: string;
  subjectType: string;
  subjectId: string;
  assignedToId?: string;
  priority?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskList {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
}

interface Application {
  id: string;
  primaryApplicantName?: string;
  programs: string[];
  languagePreference?: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  application_review: 'Application review',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrograms(programs: string[]): string {
  return programs.map((p) => p.toUpperCase()).join(', ');
}

export function QueuePage() {
  const { activeUser } = useDemo();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [applications, setApplications] = useState<Record<string, Application>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/workflow/tasks?limit=100`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: TaskList = await res.json();

      // Only show pending (unassigned) tasks in the queue
      const pending = data.items.filter((t) => t.status === 'pending');
      setTasks(pending);
      setTotal(pending.length);

      // Fetch associated applications for display names
      const appIds = [...new Set(pending.filter((t) => t.subjectType === 'application').map((t) => t.subjectId))];
      const appEntries = await Promise.all(
        appIds.map(async (id) => {
          const r = await fetch(`${BASE}/intake/applications/${id}`);
          if (!r.ok) return null;
          const app: Application = await r.json();
          return [id, app] as [string, Application];
        }),
      );
      setApplications(Object.fromEntries(appEntries.filter(Boolean) as [string, Application][]));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleClaim = async (task: Task) => {
    setClaiming(task.id);
    try {
      const res = await fetch(`${BASE}/workflow/tasks/${task.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Caller-Id': activeUser.id,
          'X-Caller-Roles': activeUser.callerRole,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Claim failed: ${res.status} ${text}`);
      }
      // Navigate to the application review page
      navigate(`/applications/${task.subjectId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setClaiming(null);
    }
  };

  return (
    <div>
      <div className="display-flex flex-align-center flex-justify margin-bottom-3">
        <h1 className="margin-0">Task queue</h1>
        {!loading && !error && (
          <span className="text-base font-body-sm">{total} pending</span>
        )}
      </div>

      {loading && (
        <div className="padding-y-4 text-center text-base">Loading tasks…</div>
      )}

      {error && (
        <div className="usa-alert usa-alert--error" role="alert">
          <div className="usa-alert__body">
            <p className="usa-alert__text">
              Could not load tasks. Is the mock server running at <code>http://localhost:1080</code>?
            </p>
            <p className="usa-alert__text font-mono-xs">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="padding-y-4 text-center text-base">No tasks in the queue.</div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <Table fullWidth striped>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Applicant</th>
              <th scope="col">Programs</th>
              <th scope="col">Received</th>
              <th scope="col">Priority</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const app = applications[task.subjectId];
              const isClaiming = claiming === task.id;
              return (
                <tr key={task.id}>
                  <td>
                    <span className="text-bold">
                      {TASK_TYPE_LABELS[task.taskType] ?? task.name}
                    </span>
                  </td>
                  <td>
                    {app?.primaryApplicantName ?? (
                      <span className="font-mono-sm text-base">{task.subjectId.slice(0, 8).toUpperCase()}</span>
                    )}
                    {app?.languagePreference && app.languagePreference !== 'en' && (
                      <span className="display-block font-body-3xs text-base-dark margin-top-05 text-uppercase">
                        {app.languagePreference}
                      </span>
                    )}
                  </td>
                  <td>{app ? formatPrograms(app.programs ?? []) : '—'}</td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td>
                    {task.priority != null ? (
                      <Tag className={task.priority <= 1 ? 'bg-red-warm-50v' : task.priority <= 2 ? 'bg-gold-20v' : ''}>
                        {task.priority <= 1 ? 'High' : task.priority <= 2 ? 'Medium' : 'Normal'}
                      </Tag>
                    ) : '—'}
                  </td>
                  <td>
                    <Button
                      type="button"
                      onClick={() => handleClaim(task)}
                      disabled={isClaiming}
                    >
                      {isClaiming ? 'Claiming…' : 'Claim'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
