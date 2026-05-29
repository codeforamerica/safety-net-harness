import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Header, Title, NavMenuButton, PrimaryNav } from '@trussworks/react-uswds';
import { useState } from 'react';
import { DemoProvider, useDemo } from './context/DemoContext';
import { DemoTray } from './components/DemoTray';
import { QueuePage } from './pages/QueuePage';
import { OverviewPage } from './pages/OverviewPage';
import { ProgramReviewPage } from './pages/ProgramReviewPage';
import { IncomeEditPage } from './pages/IncomeEditPage';

function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { activeUser } = useDemo();

  const navItems = [
    <Link key="queue" to="/queue" className="usa-nav__link">
      Queue
    </Link>,
  ];

  return (
    <>
      <Header basic>
        <div className="usa-nav-container">
          <div className="usa-navbar">
            <Title>Caseworker Portal</Title>
            <NavMenuButton
              label="Menu"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            />
          </div>
          <PrimaryNav
            items={navItems}
            mobileExpanded={mobileNavOpen}
            onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
          />
        </div>
      </Header>

      {/* Active user indicator */}
      <div
        style={{
          background: '#f0f0f0',
          borderBottom: '1px solid #dfe1e2',
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          color: '#3d4551',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span>Logged in as</span>
        <strong>{activeUser.name}</strong>
        <span style={{ color: '#71767a', textTransform: 'capitalize' }}>
          ({activeUser.role.replace('_', ' ')})
        </span>
      </div>

      <main className="grid-container padding-y-4">
        <Routes>
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/applications/:id" element={<OverviewPage />} />
          <Route path="/applications/:id/review" element={<ProgramReviewPage />} />
          <Route path="/applications/:id/review/income/:memberId" element={<IncomeEditPage />} />
          <Route path="/" element={<Navigate to="/queue" replace />} />
        </Routes>
      </main>

      <DemoTray />
    </>
  );
}

export function App() {
  return (
    <DemoProvider>
      <AppShell />
    </DemoProvider>
  );
}
