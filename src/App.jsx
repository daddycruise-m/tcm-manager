import React, { useState } from 'react';
import Header from './assets/components/Header';
import LandingPage from './assets/components/LandingPage';
import LoginModal from './assets/components/Auth/LoginModal';
import { TCMProvider, useTCM } from './assets/context/TCMContext';
import Navigation from './assets/components/Navigation';
import Members from './assets/components/Members/Members';
import UnitManager from './assets/components/Workers/UnitManager';
import Leaders from './assets/components/Leaders/Leaders';
import Analytics from './assets/components/Analytics';
import ReportGenerator from './assets/components/ReportGenerator';
import './assets/styles/glassmorphism.css';
import './assets/styles/mobile.css';

function Mainlayout() {
  const [ currentView, setCurrentView ] = useState('landing');
  const [ previousView, setPreviousView ] = useState('landing');
  const [ isLoginOpen, setIsLoginOpen ] = useState(false);
  const [ targetRole, setTargetRole ] = useState('workers');

  // Pull context state safely
  const tcmContext = useTCM();
  const members = tcmContext?.members || [];
  const workers = tcmContext?.workers || [];
  const leaders = tcmContext?.leaders || [];
  const portalRole = tcmContext?.portalRole || null;

  const counts = {
    members: members.length,
    workers: workers.length,
    leaders: leaders.length
  };

  // Helper function to clear active login session for portals
  const clearAuthSession = () => {
    if (typeof tcmContext?.setPortalRole === 'function') {
      tcmContext.setPortalRole(null);
    }
  };

  const handleOpenLogin = (role = 'workers') => {
    setPreviousView(currentView);
    setTargetRole(role);
    setIsLoginOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
    // Revert back to safe previous tab if login is cancelled
    const isAuthedForTarget = portalRole === targetRole || portalRole === 'admin';
    if (!isAuthedForTarget) {
      setCurrentView(previousView);
    }
  };

  const handleLoginSuccess = (userData) => {
    const activeRole = userData?.role || targetRole;
    
    // Set explicit portal role inside Context
    if (typeof tcmContext?.setPortalRole === 'function') {
      tcmContext.setPortalRole(activeRole);
    }

    setIsLoginOpen(false);
    setCurrentView(activeRole);
  };

  const handleViewChange = (newView) => {
    // 1. IF SWITCHING AWAY to a non-restricted tab or a different portal, CLEAR SESSION
    if (currentView === 'workers' && newView !== 'workers') {
      clearAuthSession();
    } else if (currentView === 'leaders' && newView !== 'leaders') {
      clearAuthSession();
    }

    // 2. CHECK CREDENTIALS for restricted tabs
    if (newView === 'workers') {
      // Always prompt for password when entering workers tab
      clearAuthSession();
      handleOpenLogin('workers');
      return;
    }

    if (newView === 'leaders') {
      // Always prompt for password when entering leaders tab
      clearAuthSession();
      handleOpenLogin('leaders');
      return;
    }

    setCurrentView(newView);
  };

  // Helper flags for rendering components using portalRole state
  const isWorkerAuthorized = portalRole === 'workers' || portalRole === 'admin';
  const isLeaderAuthorized = portalRole === 'leaders' || portalRole === 'admin';

  return (
    <div className="app-main-wrapper">
      <Header />

      <Navigation 
        currentView={currentView}
        setCurrentView={handleViewChange}
        onOPenLogin={handleOpenLogin}
      />

      <main>
        {currentView === 'landing' && (
          <LandingPage
            onSelectRole={(role) => handleViewChange(role)}
            counts={counts}
          />
        )}

        {currentView === 'members' && <Members />}
        
        {/* Protected Views: strictly locked each time you visit */}
        {currentView === 'workers' && (isWorkerAuthorized ? <UnitManager /> : null)}
        {currentView === 'leaders' && (isLeaderAuthorized ? <Leaders /> : null)}
        
        {currentView === 'analytics' && <Analytics />}
        {currentView === 'reports' && <ReportGenerator />}
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={handleCloseLogin}
        role={targetRole}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <TCMProvider>
      <Mainlayout />
    </TCMProvider>
  );
}