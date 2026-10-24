import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RouteFallback from './components/common/RouteFallback.jsx';

// Every page except the landing shell is lazy-loaded, so a visitor (or the
// installed app) downloads only the area it opens — admin/team code never
// reaches a member's phone. See docs/web-pwa (T2 Phase 4).

const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const UserDashboardLayout = lazy(() => import('./layouts/UserDashboardLayout.jsx'));
import ProtectedRoute from './components/admin/ProtectedRoute.jsx';
import UserProtectedRoute from './components/public/UserProtectedRoute.jsx';
import UserLoginModal from './components/public/UserLoginModal.jsx';
import ScrollToTop from './components/public/ScrollToTop.jsx';
import ClarityTracker from './components/ClarityTracker.jsx';
import CampaignVisitTracker from './components/CampaignVisitTracker.jsx';

// Public landing site — mirrors the mobile app's Home screen (docs/web-pwa).
import PublicSiteLayout from './layouts/PublicSiteLayout.jsx';
import PwaRouteGuard from './components/pwa/PwaRouteGuard.jsx';
import PwaStatus from './components/pwa/PwaStatus.jsx';
import AppGate from './components/pwa/AppGate.jsx';
import AppSplash from './components/pwa/AppSplash.jsx';
import HomeLandingPage from './pages/home/HomeLandingPage.jsx';
const ExperiencesListPage = lazy(() => import('./pages/experiences/ExperiencesListPage.jsx'));
const ExperienceDetailPage = lazy(() => import('./pages/experiences/ExperienceDetailPage.jsx'));
const ConnectPage = lazy(() => import('./pages/experiences/ConnectPage.jsx'));
const LegalDocPage = lazy(() => import('./pages/legal/LegalDocPage.jsx'));
const DownloadPage = lazy(() => import('./pages/download/DownloadPage.jsx'));
const SearchPage = lazy(() => import('./pages/home/SearchPage.jsx'));
const DestinationsPage = lazy(() => import('./pages/experiences/DestinationsPage.jsx'));
const ProfileHubPage = lazy(() => import('./pages/home/ProfileHubPage.jsx'));
const AppAuthPage = lazy(() => import('./pages/app/AppAuthPage.jsx'));
const LoginChooserPage = lazy(() => import('./pages/auth/LoginChooserPage.jsx'));
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage.jsx'));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccountPage.jsx'));

// User dashboard
const UserDashboardHomePage = lazy(() => import('./pages/user/UserDashboardHomePage.jsx'));
const UserProfilePage = lazy(() => import('./pages/user/UserProfilePage.jsx'));
const UserSupportPage = lazy(() => import('./pages/user/UserSupportPage.jsx'));
const UserBookingsPage = lazy(() => import('./pages/user/UserBookingsPage.jsx'));
const UserTransactionsPage = lazy(() => import('./pages/user/UserTransactionsPage.jsx'));
const UserWishlistPage = lazy(() => import('./pages/user/UserWishlistPage.jsx'));
const UserNotificationsPage = lazy(() => import('./pages/user/UserNotificationsPage.jsx'));
const UserReferEarnPage = lazy(() => import('./pages/user/UserReferEarnPage.jsx'));

// Host ("Switch to Host") — a member manages their own experience listings.
const HostLayout = lazy(() => import('./layouts/HostLayout.jsx'));
const HostDashboardPage = lazy(() => import('./pages/host/HostDashboardPage.jsx'));
const HostListingsPage = lazy(() => import('./pages/host/HostListingsPage.jsx'));
const HostListingFormPage = lazy(() => import('./pages/host/HostListingFormPage.jsx'));
const HostResolveObjectionsPage = lazy(() => import('./pages/host/HostResolveObjectionsPage.jsx'));
const HostProfilePage = lazy(() => import('./pages/host/HostProfilePage.jsx'));
const HostTransactionsPage = lazy(() => import('./pages/host/HostTransactionsPage.jsx'));
const HostListingBookingsPage = lazy(() => import('./pages/host/HostListingBookingsPage.jsx'));
const HostListingViewPage = lazy(() => import('./pages/host/HostListingViewPage.jsx'));
const HostBookingDetailPage = lazy(() => import('./pages/host/HostBookingDetailPage.jsx'));
const HostAllBookingsPage = lazy(() => import('./pages/host/HostAllBookingsPage.jsx'));
const HostNotificationsPage = lazy(() => import('./pages/host/HostNotificationsPage.jsx'));
const HostSupportPage = lazy(() => import('./pages/host/HostSupportPage.jsx'));

// Booking flow (kept — part of the member experience / payment via Cashfree)
const BookingPreviewPage = lazy(() => import('./pages/user/BookingPreviewPage.jsx'));
const BookingCheckoutPage = lazy(() => import('./pages/user/BookingCheckoutPage.jsx'));
const BookingSuccessPage = lazy(() => import('./pages/user/BookingSuccessPage.jsx'));

// Admin — Main dashboard only (booking management). The "Configure" / website
// content modules from the original project are intentionally not wired here.
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage.jsx'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage.jsx'));
const AdminBookingAnalyticsPage = lazy(() => import('./pages/admin/AdminBookingAnalyticsPage.jsx'));
const BookingVoucherPage = lazy(() => import('./pages/admin/BookingVoucherPage.jsx'));
const AdminTransactionsPage = lazy(() => import('./pages/admin/AdminTransactionsPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage.jsx'));
const ExperiencesPage = lazy(() => import('./pages/admin/ExperiencesPage.jsx'));
const ExperienceFormPage = lazy(() => import('./pages/admin/ExperienceFormPage.jsx'));
const ExperienceViewPage = lazy(() => import('./pages/admin/ExperienceViewPage.jsx'));
const AdminAllListedPage = lazy(() => import('./pages/admin/AdminAllListedPage.jsx'));
const AdminDelistedPage = lazy(() => import('./pages/admin/AdminDelistedPage.jsx'));
const ExperienceSetupPage = lazy(() => import('./pages/admin/ExperienceSetupPage.jsx'));
const MarkupManagementPage = lazy(() => import('./pages/admin/pricing-setup/MarkupManagementPage.jsx'));
const MarkupAnalyticsPage = lazy(() => import('./pages/admin/pricing-setup/MarkupAnalyticsPage.jsx'));
const GstAnalyticsPage = lazy(() => import('./pages/admin/pricing-setup/GstAnalyticsPage.jsx'));
const ConvenienceAnalyticsPage = lazy(() => import('./pages/admin/pricing-setup/ConvenienceAnalyticsPage.jsx'));
const SecurityFraudPage = lazy(() => import('./pages/admin/SecurityFraudPage.jsx'));
const SecurityTwoFactorPage = lazy(() => import('./pages/admin/SecurityTwoFactorPage.jsx'));
const DiscountAnalyticsPage = lazy(() => import('./pages/admin/pricing-setup/DiscountAnalyticsPage.jsx'));
const DiscountManagementPage = lazy(() => import('./pages/admin/pricing-setup/DiscountManagementPage.jsx'));
const GstTaxesManagementPage = lazy(() => import('./pages/admin/pricing-setup/GstTaxesManagementPage.jsx'));
const ConvenienceManagementPage = lazy(() => import('./pages/admin/pricing-setup/ConvenienceManagementPage.jsx'));
const SuppliersPage = lazy(() => import('./pages/admin/SuppliersPage.jsx'));
const SupplierRevenuePage = lazy(() => import('./pages/admin/SupplierRevenuePage.jsx'));
const SupplierFormPage = lazy(() => import('./pages/admin/SupplierFormPage.jsx'));
const ContractFormPage = lazy(() => import('./pages/admin/ContractFormPage.jsx'));
const CompanyProfilePage = lazy(() => import('./pages/admin/CompanyProfilePage.jsx'));
const AppScreensControlPage = lazy(() => import('./pages/admin/AppScreensControlPage.jsx'));
const RevenuePage = lazy(() => import('./pages/admin/RevenuePage.jsx'));
const RevenueAnalysisPage = lazy(() => import('./pages/admin/RevenueAnalysisPage.jsx'));
const RevenueComparePage = lazy(() => import('./pages/admin/RevenueComparePage.jsx'));
const B2BManagementPage = lazy(() => import('./pages/admin/B2BManagementPage.jsx'));
const B2BExperiencePage = lazy(() => import('./pages/admin/B2BExperiencePage.jsx'));
const B2BActivityBookingsPage = lazy(() => import('./pages/admin/B2BActivityBookingsPage.jsx'));
const ChatSupportPage = lazy(() => import('./pages/admin/ChatSupportPage.jsx'));
const TeamManagementPage = lazy(() => import('./pages/admin/TeamManagementPage.jsx'));
const OccasionMarketingPage = lazy(() => import('./pages/admin/OccasionMarketingPage.jsx'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage.jsx'));
const AdminReviewAnalyticsPage = lazy(() => import('./pages/admin/AdminReviewAnalyticsPage.jsx'));

// Team Portal — internal staff (BD/COPS/Account Manager/CSM/QCOPS/Marketing).
// Reuses the exact admin Supplier/Experience form components (permission-
// gated on the backend), wrapped in its own layout + auth.
const TeamLayout = lazy(() => import('./layouts/TeamLayout.jsx'));
import TeamProtectedRoute from './components/team/TeamProtectedRoute.jsx';
const TeamLoginPage = lazy(() => import('./pages/team/TeamLoginPage.jsx'));
const TeamResetPasswordPage = lazy(() => import('./pages/team/TeamResetPasswordPage.jsx'));
const TeamDashboardGate = lazy(() => import('./components/team/TeamDashboardGate.jsx'));
const TeamLanding = lazy(() => import('./components/team/TeamDashboardGate.jsx').then((m) => ({ default: m.TeamLanding })));
const TeamSuppliersPage = lazy(() => import('./pages/team/TeamSuppliersPage.jsx'));
const TeamExperiencesPage = lazy(() => import('./pages/team/TeamExperiencesPage.jsx'));
const TeamReviewQueuePage = lazy(() => import('./pages/team/TeamReviewQueuePage.jsx'));
const CategoryOverviewPage = lazy(() => import('./pages/team/CategoryOverviewPage.jsx'));
const CategoryModulePlaceholder = lazy(() => import('./pages/team/CategoryModulePlaceholder.jsx'));
const CategorySuppliersPage = lazy(() => import('./pages/team/CategorySuppliersPage.jsx'));
const CategoryStatusPage = lazy(() => import('./pages/team/CategoryStatusPage.jsx'));
const CategoryReviewsPage = lazy(() => import('./pages/team/CategoryReviewsPage.jsx'));
const CategoryRevenuePage = lazy(() => import('./pages/team/CategoryRevenuePage.jsx'));
const CategoryOnboardingsPage = lazy(() => import('./pages/team/CategoryOnboardingsPage.jsx'));
const CategoryDelistedPage = lazy(() => import('./pages/team/CategoryDelistedPage.jsx'));
const CategoryChurnPage = lazy(() => import('./pages/team/CategoryChurnPage.jsx'));
const CategoryWinbackPage = lazy(() => import('./pages/team/CategoryWinbackPage.jsx'));
const TeamReviewDetailPage = lazy(() => import('./pages/team/TeamReviewDetailPage.jsx'));
const TeamResolveObjectionsPage = lazy(() => import('./pages/team/TeamResolveObjectionsPage.jsx'));
const TeamQcVisitsPage = lazy(() => import('./pages/team/TeamQcVisitsPage.jsx'));
const TeamExperienceViewPage = lazy(() => import('./pages/team/TeamExperienceViewPage.jsx'));
const TeamQcManagementPage = lazy(() => import('./pages/team/TeamQcManagementPage.jsx'));
const TeamQcListingsPage = lazy(() => import('./pages/team/TeamQcListingsPage.jsx'));
const TeamSupplierExperiencesPage = lazy(() => import('./pages/team/TeamSupplierExperiencesPage.jsx'));
const TeamSupplierListingsPage = lazy(() => import('./pages/team/TeamSupplierListingsPage.jsx'));
const TeamAmListingsPage = lazy(() => import('./pages/team/TeamAmListingsPage.jsx'));
const TeamAccountManagerPage = lazy(() => import('./pages/team/TeamAccountManagerPage.jsx'));
const TeamCsmPage = lazy(() => import('./pages/team/TeamCsmPage.jsx'));

// Supplier Portal — a supplier's own login (Phase 4). Reuses the EXACT same
// Host*Page components (host.controller.js resolves ownership from
// req.supplier here vs req.user on /host/*) via a `basePath` prop.
const SupplierLayout = lazy(() => import('./layouts/SupplierLayout.jsx'));
import SupplierProtectedRoute from './components/supplier/SupplierProtectedRoute.jsx';
const SupplierLoginPage = lazy(() => import('./pages/supplier/SupplierLoginPage.jsx'));
const SupplierResetPasswordPage = lazy(() => import('./pages/supplier/SupplierResetPasswordPage.jsx'));
const SupplierAccountManagerPage = lazy(() => import('./pages/supplier/SupplierAccountManagerPage.jsx'));
const SupplierAccountPage = lazy(() => import('./pages/supplier/SupplierAccountPage.jsx'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      {/* Clarity analytics — public + user pages only; never admin/team/supplier. */}
      <ClarityTracker />
      {/* Reports "landed" and "time on page" back to the occasion campaign
          whose email brought this visitor here (the ?rc= handle). No-op for
          everyone who did not arrive from a greeting. */}
      <CampaignVisitTracker />
      {/* Service worker updates + offline banner (installable app) */}
      <PwaStatus />
      {/* Installed app only: launch splash + sign-in-first gate */}
      <AppSplash />
      <Suspense fallback={<RouteFallback />}>
      <AppGate>
      <Routes>
        {/* Public landing site — same sections + data as the app Home screen */}
        <Route element={<PublicSiteLayout />}>
          <Route path="/" element={<HomeLandingPage />} />
          <Route path="/experiences" element={<ExperiencesListPage />} />
          <Route path="/experiences/:idOrSlug" element={<ExperienceDetailPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/privacy" element={<LegalDocPage type="privacy" />} />
          <Route path="/terms" element={<LegalDocPage type="terms" />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          {/* No About page — old links land on Home. */}
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<ProfileHubPage />} />
          {/* Account deletion — public by requirement: Google Play needs a page a
              user can reach WITHOUT installing the app. Also the target of the
              emailed confirmation link (/delete-account?token=…). */}
          <Route path="/delete-account" element={<DeleteAccountPage />} />
        </Route>

        {/* Sign-in chooser (member OTP / partner) — the app's entry screen */}
        <Route path="/login" element={<LoginChooserPage />} />
        {/* Installed app's sign-in screens (member OTP + supplier) — app only */}
        <Route path="/app/login" element={<AppAuthPage />} />

        {/* Opt-out target for occasion greeting emails — deliberately public. */}
        <Route path="/unsubscribe" element={<UnsubscribePage />} />


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
          <Route path="listings/:id/view" element={<HostListingViewPage />} />
          <Route path="all-bookings" element={<HostAllBookingsPage />} />
          <Route path="bookings/:id" element={<HostBookingDetailPage />} />
          <Route path="notifications" element={<HostNotificationsPage />} />
          <Route path="support" element={<HostSupportPage />} />
          <Route path="transactions" element={<HostTransactionsPage />} />
          <Route path="account-manager" element={<SupplierAccountManagerPage basePath="/host" />} />
          <Route path="profile" element={<HostProfilePage />} />
        </Route>

        {/* Staff portals — blocked inside the installed app (PWA/TWA): the app
            is for members + suppliers only, like the Android app. */}
        <Route element={<PwaRouteGuard />}>
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
            <Route path="bookings/analytics" element={<AdminBookingAnalyticsPage />} />
            <Route path="bookings/:code/voucher" element={<BookingVoucherPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserDetailPage />} />
            <Route path="transactions" element={<AdminTransactionsPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="revenue/analysis" element={<RevenueAnalysisPage />} />
            <Route path="revenue/compare" element={<RevenueComparePage />} />
            <Route path="b2b" element={<B2BManagementPage />} />
            <Route path="b2b/activity/:name" element={<B2BActivityBookingsPage />} />
            <Route path="b2b/:id" element={<B2BExperiencePage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="reviews/analytics" element={<AdminReviewAnalyticsPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="experiences/listed" element={<AdminAllListedPage />} />
            <Route path="experiences/delisted" element={<AdminDelistedPage />} />
            <Route path="experiences/new" element={<ExperienceFormPage />} />
            <Route path="experiences/:id/edit" element={<ExperienceFormPage />} />
            <Route path="experiences/:id/view" element={<ExperienceViewPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/new" element={<SupplierFormPage />} />
            <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
            <Route path="suppliers/:id/revenue" element={<SupplierRevenuePage />} />
            <Route path="contracts/new" element={<ContractFormPage />} />
            <Route path="contracts/:id/edit" element={<ContractFormPage />} />
            <Route path="company-profile" element={<CompanyProfilePage />} />
            <Route path="experience-setup" element={<ExperienceSetupPage />} />
            <Route path="app-screens" element={<AppScreensControlPage />} />
            <Route path="chat-support" element={<ChatSupportPage />} />
            <Route path="team" element={<TeamManagementPage />} />
            {/* Occasion Marketing — festival / weekend / birthday greetings */}
            <Route path="occasions" element={<OccasionMarketingPage />} />
            {/* Pricing Setup Management — markup / discount / GST / convenience */}
            <Route path="pricing-setup" element={<Navigate to="/admin/pricing-setup/markup" replace />} />
            <Route path="pricing-setup/markup" element={<MarkupManagementPage />} />
            <Route path="pricing-setup/markup/analysis" element={<MarkupAnalyticsPage />} />
            <Route path="pricing-setup/discount" element={<DiscountManagementPage />} />
            <Route path="pricing-setup/discount/analysis" element={<DiscountAnalyticsPage />} />
            <Route path="pricing-setup/gst" element={<GstTaxesManagementPage />} />
            <Route path="pricing-setup/gst/analysis" element={<GstAnalyticsPage />} />
            <Route path="pricing-setup/convenience" element={<ConvenienceManagementPage />} />
            <Route path="pricing-setup/convenience/analysis" element={<ConvenienceAnalyticsPage />} />
            {/* Security — payment fraud detection */}
            <Route path="security" element={<Navigate to="/admin/security/fraud" replace />} />
            <Route path="security/fraud" element={<SecurityFraudPage />} />
            <Route path="security/2fa" element={<SecurityTwoFactorPage />} />
          </Route>

          {/* Team Portal — BD/COPS/Account Manager/CSM/QCOPS/Marketing */}
          <Route path="/team/login" element={<TeamLoginPage />} />
          <Route path="/team/reset-password" element={<TeamResetPasswordPage />} />
          <Route
            path="/team"
            element={
              <TeamProtectedRoute>
                <TeamLayout />
              </TeamProtectedRoute>
            }
          >
            <Route index element={<TeamLanding />} />
            <Route path="dashboard" element={<TeamDashboardGate />} />
            <Route path="suppliers" element={<TeamSuppliersPage />} />
            <Route path="suppliers/new" element={<SupplierFormPage />} />
            <Route path="suppliers/:id/listings" element={<TeamSupplierListingsPage />} />
            <Route path="experiences" element={<TeamExperiencesPage />} />
            <Route path="experiences/new" element={<ExperienceFormPage />} />
            <Route path="experiences/:id/edit" element={<ExperienceFormPage />} />
            <Route path="experiences/:id/resolve" element={<TeamResolveObjectionsPage />} />
            <Route path="experiences/:id/view" element={<TeamExperienceViewPage />} />
            <Route path="review-queue" element={<TeamReviewQueuePage />} />
            <Route path="review-queue/:id" element={<TeamReviewDetailPage />} />
            <Route path="qc-visits" element={<TeamQcVisitsPage />} />
            <Route path="qc-listings" element={<TeamQcListingsPage />} />
            <Route path="qc-management" element={<TeamQcManagementPage />} />
            <Route path="my-suppliers/:supplierId" element={<TeamSupplierExperiencesPage />} />
            <Route path="am-listings" element={<TeamAmListingsPage />} />
            <Route path="my-suppliers" element={<TeamAccountManagerPage />} />
            <Route path="my-customers" element={<TeamCsmPage />} />
            {/* Category Manager dashboard */}
            <Route path="category" element={<CategoryOverviewPage />} />
            <Route path="category/suppliers" element={<CategorySuppliersPage />} />
            <Route path="category/status" element={<CategoryStatusPage />} />
            <Route path="category/reviews" element={<CategoryReviewsPage />} />
            <Route path="category/revenue" element={<CategoryRevenuePage />} />
            <Route path="category/onboardings" element={<CategoryOnboardingsPage />} />
            <Route path="category/churn" element={<CategoryChurnPage />} />
            <Route path="category/delisted" element={<CategoryDelistedPage />} />
            <Route path="category/winback" element={<CategoryWinbackPage />} />
          </Route>
        </Route>

        {/* Supplier Portal — a supplier's own login, dashboard cloned from Host */}
        <Route path="/supplier/login" element={<SupplierLoginPage />} />
        <Route path="/supplier/reset-password" element={<SupplierResetPasswordPage />} />
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
          <Route path="listings/:id/view" element={<HostListingViewPage basePath="/supplier" />} />
          <Route path="all-bookings" element={<HostAllBookingsPage basePath="/supplier" />} />
          <Route path="bookings/:id" element={<HostBookingDetailPage basePath="/supplier" />} />
          <Route path="transactions" element={<HostTransactionsPage basePath="/supplier" />} />
          <Route path="account-manager" element={<SupplierAccountManagerPage />} />
          <Route path="notifications" element={<HostNotificationsPage basePath="/supplier" />} />
          <Route path="account" element={<SupplierAccountPage />} />
        </Route>

        {/* Anything else → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AppGate>
      </Suspense>


      {/* Global OTP login modal — opened from anywhere via requestLogin(). */}
      <UserLoginModal />
    </>
  );
}
