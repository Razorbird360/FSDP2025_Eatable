import { Routes, Route, Navigate } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import ProtectedLayout from "../layouts/ProtectedLayout";
import HomePage from "../pages/HomePage";
import ProfileLayout from "../layouts/ProfileLayout";
import AboutPage from "../pages/AboutPage";
import CommunityPage from "../pages/CommunityPage";
import HawkerCentresPage from "../features/hawkerCentres/components/HawkerCentresPage";
import HawkerPage from "../features/hawkerPage/components/hawkerpage.jsx";
import StallEmenu from "../features/menu/components/StallEmenu";
import SignupPage from "../features/auth/SignupPage";
import LoginPage from "../features/auth/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import OrderSummaryPage from "../pages/OrderSummaryPage";
import MyCollectionPage from "../pages/MyCollectionPage";
import FavouritesPage from "../pages/FavouritesPage";
import OrdersPage from "../pages/OrdersPage";
import SpendingsPage from "../pages/SpendingsPage";
import VouchersPage from "../pages/VouchersPage";
import AchievementsPage from "../pages/AchievementsPage";
import AdminHomePage from "../pages/AdminHomePage";
import AdminVouchersPage from "../pages/AdminVouchersPage";
import AdminAchievementsPage from "../pages/AdminAchievementsPage";
import AdminModerationUsersPage from "../pages/AdminModerationUsersPage";
import AdminModerationMediaPage from "../pages/AdminModerationMediaPage";
import AdminModerationReportsPage from "../pages/AdminModerationReportsPage";
import AdminLayout from "../layouts/AdminLayout";
import { SettingsPage, BusinessPage, HelpPage } from "../pages/ProfilePlaceholders";

import MakePayment from "../features/payment/MakePayment";
import OrderCompleted from "../features/payment/OrderCompleted";

import StallGallery from "../features/stalls/components/StallGallery";

import RequireRole from "../components/RequireRole";
import StallSetupPage from "../features/stalls/pages/StallSetupPage";
import StallManagementPage from "../features/stalls/pages/StallManagementPage";

import Onboarding from "../features/photos/components/Onboarding";
import PhotoUpload from "../features/photos/components/PhotoUpload";
import UploadDetails from "../features/photos/components/UploadDetails";
import PhotoUploadLayout from "../features/photos/layouts/PhotoUploadLayout";
import DataPage from "../pages/DataPage";

import HawkerMap from "../features/hawkerMap/components/hawkerMap";

// Placeholder pages - to be replaced with actual feature pages
const Stalls = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold">Stalls</h1>
  </div>
);
const Cart = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold">Cart</h1>
  </div>
);
const NotFound = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold">404 - Not Found</h1>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Everything inside RootLayout (Navbar + Sidebar) */}
      <Route element={<RootLayout />}>
        {/* Redirect root to /home */}
        <Route index element={<Navigate to="/home" replace />} />

        {/* Public Pages */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/stalls" element={<Stalls />} />
        <Route path="/hawker-centres/map" element={<HawkerMap />} />
        <Route path="/hawker-centres" element={<HawkerCentresPage />} />
        <Route path="/hawker-centres/:hawkerId" element={<HawkerPage />} />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/stalls/:stallId" element={<StallEmenu />} />
        <Route path="/stalls/:stallId/gallery" element={<StallGallery />} />

        {/* Payment Pages */}
        <Route path="/ordercompleted/:orderid" element={<OrderCompleted />} />
        <Route path="/makepayment/:orderid" element={<MakePayment />} />
        <Route path="/orderSummary" element={<OrderSummaryPage />} />

        {/* Protected pages (requires login) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/cart" element={<Cart />} />

          <Route element={<ProfileLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/my-collection" element={<MyCollectionPage />} />
            <Route path="/favourites" element={<FavouritesPage />} />
            <Route path="/vouchers" element={<VouchersPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/spendingsPage" element={<SpendingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Route>

          {/* Hawker-only routes */}
          <Route
            path="/stall/setup"
            element={
              <RequireRole role="hawker" verified={true}>
                <StallSetupPage />
              </RequireRole>
            }
          />
          <Route
            path="/stall/manage/:stallId"
            element={
              <RequireRole role="hawker" verified={true}>
                <StallManagementPage />
              </RequireRole>
            }
          />

          {/* upload routes */}
          <Route element={<PhotoUploadLayout />}>
            <Route path="/photo-upload/onboarding" element={<Onboarding />} />
            <Route path="/photo-upload" element={<PhotoUpload />} />
            <Route path="/upload-details" element={<UploadDetails />} />
          </Route>
        </Route>

      </Route>

      <Route element={<ProtectedLayout />}>
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route path="vouchers" element={<AdminVouchersPage />} />
          <Route path="achievements" element={<AdminAchievementsPage />} />
          <Route path="rewards" element={<Navigate to="/admin/vouchers" replace />} />
          <Route path="moderation/users" element={<AdminModerationUsersPage />} />
          <Route path="moderation/media" element={<AdminModerationMediaPage />} />
          <Route path="moderation/reports" element={<AdminModerationReportsPage />} />
        </Route>
      </Route>

      {/* Auth routes OUTSIDE the layout */}
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/data" element={<DataPage />} />

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
