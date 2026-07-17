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
import UserSupportPage from './pages/user/UserSupportPage.jsx';
import UserBookingsPage from './pages/user/UserBookingsPage.jsx';
import UserTransactionsPage from './pages/user/UserTransactionsPage.jsx';
import UserWishlistPage from './pages/user/UserWishlistPage.jsx';
import UserNotificationsPage from './pages/user/UserNotificationsPage.jsx';
import UserReferEarnPage from './pages/user/UserReferEarnPage.jsx';

// Host ("Switch to Host") — a member manages their own experience listings.
import HostLayout from './layouts/HostLayout.jsx';
import HostDashboardPage from './pages/host/HostDashboardPage.jsx';
import HostListingsPage from './pages/host/HostListingsPage.jsx';
import HostListingFormPage from './pages/host/HostListingFormPage.jsx';
import HostResolveObjectionsPage from './pages/host/HostResolveObjectionsPage.jsx';
import HostProfilePage from './pages/host/HostProfilePage.jsx';
import HostTransactionsPage from './pages/host/HostTransactionsPage.jsx';
import HostSupportPage from './pages/host/HostSupportPage.jsx';
import HostListingBookingsPage from './pages/host/HostListingBookingsPage.jsx';
import HostBookingDetailPage from './pages/host/HostBookingDetailPage.jsx';
import HostNotificationsPage from './pages/host/HostNotificationsPage.jsx';

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
import ChatSupportPage from './pages/admin/ChatSupportPage.jsx';
import TeamManagementPage from './pages/admin/TeamManagementPage.jsx';
import AdminReviewsPage from './pages/admin/AdminReviewsPage.jsx';
import AdminReviewAnalyticsPage from './pages/admin/AdminReviewAnalyticsPage.jsx';

// Team Portal — internal staff (BD/COPS/Account Manager/CSM/QCOPS/Marketing).
// Reuses the exact admin Supplier/Experience form components (permission-
// gated on the backend), wrapped in its own layout + auth.
import TeamLayout from './layouts/TeamLayout.jsx';
import TeamProtectedRoute from './components/team/TeamProtectedRoute.jsx';
import TeamLoginPage from './pages/team/TeamLoginPage.jsx';
import TeamDashboardPage from './pages/team/TeamDashboardPage.jsx';
import TeamSuppliersPage from './pages/team/TeamSuppliersPage.jsx';
import TeamExperiencesPage from './pages/team/TeamExperiencesPage.jsx';
import TeamReviewQueuePage from './pages/team/TeamReviewQueuePage.jsx';
import TeamReviewDetailPage from './pages/team/TeamReviewDetailPage.jsx';
import TeamResolveObjectionsPage from './pages/team/TeamResolveObjectionsPage.jsx';
import TeamQcVisitsPage from './pages/team/TeamQcVisitsPage.jsx';
import TeamExperienceViewPage from './pages/team/TeamExperienceViewPage.jsx';
import TeamQcManagementPage from './pages/team/TeamQcManagementPage.jsx';
import TeamAccountManagerPage from './pages/team/TeamAccountManagerPage.jsx';
import TeamCsmPage from './pages/team/TeamCsmPage.jsx';

// Supplier Portal — a supplier's own login (Phase 4). Reuses the EXACT same
// Host*Page components (host.controller.js resolves ownership from
// req.supplier here vs req.user on /host/*) via a `basePath` prop.
import SupplierLayout from './layouts/SupplierLayout.jsx';
import SupplierProtectedRoute from './components/supplier/SupplierProtectedRoute.jsx';
import SupplierLoginPage from './pages/supplier/SupplierLoginPage.jsx';

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
          <Route path="notifications" element={<UserNotificationsPage />} />
          <Route path="support" element={<UserSupportPage />} />
          <Route path="refer" element={<UserReferEarnPage />} />
        </Route>

        {/* Host mode — same member account, hosting their own experiences */}
        <Route
          path="/host"
          element={
            <UserProtectedRoute>
              <HostLayout />
            </UserProtectedRoute>
          }
        >
          <Route index element={<HostDashboardPage />} />
          <Route path="listings" element={<HostListingsPage />} />
          <Route path="listings/new" element={<HostListingFormPage />} />
          <Route path="listings/:id/edit" element={<HostListingFormPage />} />
          <Route path="listings/:id/resolve" element={<HostResolveObjectionsPage />} />
          <Route path="listings/:id/bookings" element={<HostListingBookingsPage />} />
          <Route path="bookings/:id" element={<HostBookingDetailPage />} />
          <Route path="notifications" element={<HostNotificationsPage />} />
          <Route path="transactions" element={<HostTransactionsPage />} />
          <Route path="support" element={<HostSupportPage />} />
          <Route path="profile" element={<HostProfilePage />} />
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
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="reviews/analytics" element={<AdminReviewAnalyticsPage />} />
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
          <Route path="chat-support" element={<ChatSupportPage />} />
          <Route path="team" element={<TeamManagementPage />} />
        </Route>

        {/* Team Portal — BD/COPS/Account Manager/CSM/QCOPS/Marketing */}
        <Route path="/team/login" element={<TeamLoginPage />} />
        <Route
          path="/team"
          element={
            <TeamProtectedRoute>
              <TeamLayout />
            </TeamProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeamDashboardPage />} />
          <Route path="suppliers" element={<TeamSuppliersPage />} />
          <Route path="suppliers/new" element={<SupplierFormPage />} />
          <Route path="experiences" element={<TeamExperiencesPage />} />
          <Route path="experiences/new" element={<ExperienceFormPage />} />
          <Route path="experiences/:id/edit" element={<ExperienceFormPage />} />
          <Route path="experiences/:id/resolve" element={<TeamResolveObjectionsPage />} />
          <Route path="experiences/:id/view" element={<TeamExperienceViewPage />} />
          <Route path="review-queue" element={<TeamReviewQueuePage />} />
          <Route path="review-queue/:id" element={<TeamReviewDetailPage />} />
          <Route path="qc-visits" element={<TeamQcVisitsPage />} />
          <Route path="qc-management" element={<TeamQcManagementPage />} />
          <Route path="my-suppliers" element={<TeamAccountManagerPage />} />
          <Route path="my-customers" element={<TeamCsmPage />} />
        </Route>

        {/* Supplier Portal — a supplier's own login, dashboard cloned from Host */}
        <Route path="/supplier/login" element={<SupplierLoginPage />} />
        <Route
          path="/supplier"
          element={
            <SupplierProtectedRoute>
              <SupplierLayout />
            </SupplierProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HostDashboardPage basePath="/supplier" title="Supplier Dashboard" />} />
          <Route path="listings" element={<HostListingsPage basePath="/supplier" />} />
          <Route path="listings/new" element={<HostListingFormPage basePath="/supplier" />} />
          <Route path="listings/:id/edit" element={<HostListingFormPage basePath="/supplier" />} />
          <Route path="listings/:id/resolve" element={<HostResolveObjectionsPage basePath="/supplier" />} />
          <Route path="listings/:id/bookings" element={<HostListingBookingsPage basePath="/supplier" />} />
          <Route path="bookings/:id" element={<HostBookingDetailPage basePath="/supplier" />} />
          <Route path="transactions" element={<HostTransactionsPage basePath="/supplier" />} />
        </Route>

        {/* Anything else → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global OTP login modal — opened from anywhere via requestLogin(). */}
      <UserLoginModal />
    </>
  );
}
