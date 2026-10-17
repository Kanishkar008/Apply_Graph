import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { ResumesPage } from './pages/ResumesPage';
import { JobsPage } from './pages/JobsPage';
import { ApplicationsPlaceholder } from './pages/ApplicationsPlaceholder';
import { AnalyticsPlaceholder } from './pages/AnalyticsPlaceholder';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="resumes" element={<ResumesPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applications" element={<ApplicationsPlaceholder />} />
          <Route path="analytics" element={<AnalyticsPlaceholder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
