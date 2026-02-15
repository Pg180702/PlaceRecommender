import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import ExplorePage from '@/pages/ExplorePage';
import PreferencesPage from '@/pages/PreferencesPage';
import EnjoyedRestaurantsPage from '@/pages/EnjoyedRestaurantsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SignedOut>
                <LandingPage />
              </SignedOut>
              <SignedIn>
                <Navigate to="/dashboard" replace />
              </SignedIn>
            </>
          }
        />
        <Route
          element={
            <>
              <SignedIn>
                <AuthenticatedLayout />
              </SignedIn>
              <SignedOut>
                <Navigate to="/" replace />
              </SignedOut>
            </>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/enjoyed" element={<EnjoyedRestaurantsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
