import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import ProtectedLayout from '../layouts/ProtectedLayout';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import HawkerCentresPage from '../features/hawkerCentres/components/HawkerCentresPage';
import HawkerPage from '../features/hawkerPage/components/hawkerpage.jsx';
import StallEmenu from "../features/menu/components/StallEmenu"
import SignupPage from '../features/auth/SignupPage';
import LoginPage from '../features/auth/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import OrderSummaryPage from "../pages/OrderSummaryPage";

import MakePayment from "../features/payment/MakePayment";
import OrderCompleted from "../features/payment/OrderCompleted";

import StallGallery from '../features/stalls/components/StallGallery';

import RequireRole from '../components/RequireRole';
import StallSetupPage from '../features/stalls/pages/StallSetupPage';
import StallManagementPage from '../features/stalls/pages/StallManagementPage';

import Onboarding from "../features/photos/components/Onboarding";
import PhotoUpload from "../features/photos/components/PhotoUpload";
import UploadDetails from "../features/photos/components/UploadDetails";
import PhotoUploadLayout from "../features/photos/layouts/PhotoUploadLayout";


// Placeholder pages - to be replaced with actual feature pages
const Stalls = () => <div className="p-8"><h1 className="text-3xl font-bold">Stalls</h1></div>;
const Cart = () => <div className="p-8"><h1 className="text-3xl font-bold">Cart</h1></div>;
const OrderHistory = () => <div className="p-8"><h1 className="text-3xl font-bold">Order History</h1></div>;
const NotFound = () => <div className="p-8"><h1 className="text-3xl font-bold">404 - Not Found</h1></div>;

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
        <Route path="/hawker-centres" element={<HawkerCentresPage />} />
        <Route path="/hawker-centres/:hawkerId" element={<HawkerPage />} />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/stalls/:stallId" element={<StallEmenu />} />
        <Route path="/stalls/:stallId/gallery" element={<StallGallery />} />

        {/* Payment Pages */}
        <Route path="/ordercompleted/:orderid" element={<OrderCompleted />} />
        <Route path="/makepayment/:orderid" element={<MakePayment />} />

        {/* Protected pages (requires login) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/orderSummary" element={<OrderSummaryPage />} />
          <Route path="/profile" element={<ProfilePage />} />

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

      {/* Auth routes OUTSIDE the layout */}
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
