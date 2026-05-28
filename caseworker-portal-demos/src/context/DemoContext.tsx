import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setDefaultHeader } from '../api/generic';

export interface DemoUser {
  id: string;
  name: string;
  role: 'case_worker' | 'supervisor';
  // Workaround for codeforamerica/safety-net-blueprint#328: state machines use
  // "caseworker" but RoleType enum defines "case_worker". callerRole is what
  // gets sent in X-Caller-Roles headers until the blueprint fixes the mismatch.
  callerRole: string;
  email: string;
}

// IDs must match demos/cbms/seeds/users.yaml
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'a1000001-0000-4000-8000-000000000001',
    name: 'Ashley G.',
    role: 'case_worker',
    callerRole: 'caseworker', // blueprint#328 workaround
    email: 'ashley.garcia@county.example.gov',
  },
  {
    id: 'a2000002-0000-4000-8000-000000000001',
    name: 'Snidely Whiplash',
    role: 'supervisor',
    callerRole: 'supervisor',
    email: 'snidely.whiplash@county.example.gov',
  },
];

interface DemoContextValue {
  activeUser: DemoUser;
  setActiveUser: (user: DemoUser) => void;
  users: DemoUser[];
}

const DemoContext = createContext<DemoContextValue>({
  activeUser: DEMO_USERS[0],
  setActiveUser: () => {},
  users: DEMO_USERS,
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUserState] = useState<DemoUser>(DEMO_USERS[0]);

  function setActiveUser(user: DemoUser) {
    setActiveUserState(user);
  }

  useEffect(() => {
    setDefaultHeader('X-Caller-Id', activeUser.id);
  }, [activeUser.id]);

  // Set the initial header on mount
  useEffect(() => {
    setDefaultHeader('X-Caller-Id', DEMO_USERS[0].id);
  }, []);

  return (
    <DemoContext.Provider value={{ activeUser, setActiveUser, users: DEMO_USERS }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
