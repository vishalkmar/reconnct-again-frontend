import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from './layouts/AdminLayout.jsx';
import UserDashboardLayout from './layouts/UserDashboardLayout.jsx';
import ProtectedRoute from './components/admin/ProtectedRoute.jsx';
import UserProtectedRoute from './components/public/UserProtectedRoute.jsx';
import UserLoginModal from './components/public/UserLoginModal.jsx';
import ScrollToTop from './components/public/ScrollToTop.jsx';

import LandingPage from './pages/LandingPage.jsx';

// User dashboard
import UserDashboardHomePage from './pages/user/UserDashboardHomePage.jsx';
import UserProfilePage from './pages/user/UserProfilePage.jsx';
import UserBookingsPage from './pages/user/UserBookingsPage.jsx';
import UserTransactionsPage from './pages/user/UserTransactionsPage.jsx';
import UserWishlistPage from './pages/user/UserWishlistPage.jsx';
import UserReferEarnPage from './pages/user/UserReferEarnPage.jsx';

// Booking flow (kept — part of the member experience / payment via Cashfree)
import BookingPreviewPage from './pages/user/BookingPreviewPage.jsx';
import BookingCheckoutPage from './pages/user/BookingCheckoutPage.jsx';
import BookingSuccessPage from './pages/user/BookingSuccessPage.jsx';

// Admin — Main dashboard only (booking management). The "Configure" / website
// content modules from the original project are intentionally not wired here.
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import AdminBookingsPage from './pages/admin/AdminBookingsPage.jsx';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage.jsx';
import ExperiencesPage from './pages/admin/ExperiencesPage.jsx';
import ExperienceFormPage from './pages/admin/ExperienceFormPage.jsx';
import ExperienceViewPage from './pages/admin/ExperienceViewPage.jsx';
import ExperienceSetupPage from './pages/admin/ExperienceSetupPage.jsx';
import SuppliersPage from './pages/admin/SuppliersPage.jsx';
import SupplierFormPage from './pages/admin/SupplierFormPage.jsx';
import ContractFormPage from './pages/admin/ContractFormPage.jsx';
import CompanyProfilePage from './pages/admin/CompanyProfilePage.jsx';
import AppScreensControlPage from './pages/admin/AppScreensControlPage.jsx';
import RevenuePage from './pages/admin/RevenuePage.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public entry — branded sign-in landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Booking flow — requires a signed-in member. Full-bleed, no sidebar. */}
        <Route
          path="/book/:type/:id"
          element={
            <UserProtectedRoute>
              <BookingPreviewPage />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/checkout/:code"
          element={
            <UserProtectedRoute>
              <BookingCheckoutPage />
            </UserProtectedRoute>
          }
        />
        <Route
          path="/booking-success/:code"
          element={
            <UserProtectedRoute>
              <BookingSuccessPage />
            </UserProtectedRoute>
          }
        />

        {/* Authenticated member dashboard */}
        <Route
          path="/dashboard"
          element={
            <UserProtectedRoute>
              <UserDashboardLayout />
            </UserProtectedRoute>
          }
        >
          <Route index element={<UserDashboardHomePage />} />
          <Route path="profile" element={<UserProfilePage />} />
          <Route path="bookings" element={<UserBookingsPage />} />
          <Route path="transactions" element={<UserTransactionsPage />} />
          <Route path="wishlist" element={<UserWishlistPage />} />
          <Route path="refer" element={<UserReferEarnPage />} />
        </Route>

        {/* Admin — Main dashboard (bookings, users, transactions) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="experiences" element={<ExperiencesPage />} />
          <Route path="experiences/new" element={<ExperienceFormPage />} />
          <Route path="experiences/:id/edit" element={<ExperienceFormPage />} />
          <Route path="experiences/:id/view" element={<ExperienceViewPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="suppliers/new" element={<SupplierFormPage />} />
          <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
          <Route path="contracts/new" element={<ContractFormPage />} />
          <Route path="contracts/:id/edit" element={<ContractFormPage />} />
          <Route path="company-profile" element={<CompanyProfilePage />} />
          <Route path="experience-setup" element={<ExperienceSetupPage />} />
          <Route path="app-screens" element={<AppScreensControlPage />} />
        </Route>

        {/* Anything else → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global OTP login modal — opened from anywhere via requestLogin(). */}
      <UserLoginModal />
    </>
  );
}
