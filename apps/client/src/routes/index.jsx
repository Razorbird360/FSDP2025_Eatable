import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import ProtectedLayout from '../layouts/ProtectedLayout';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import StallEmenu from "../features/menu/components/StallEmenu"
import SignupPage from '../features/auth/SignupPage';
import LoginPage from '../features/auth/LoginPage';

import StallGallery from '../features/stalls/components/StallGallery';

// Placeholder pages - to be replaced with actual feature pages
const Stalls = () => <div className="p-8"><h1 className="text-3xl font-bold">Stalls</h1></div>;
//const StallDetail = () => <div className="p-8"><h1 className="text-3xl font-bold">Stall Detail</h1></div>;
const Cart = () => <div className="p-8"><h1 className="text-3xl font-bold">Cart</h1></div>;
const OrderHistory = () => <div className="p-8"><h1 className="text-3xl font-bold">Order History</h1></div>;
const NotFound = () => <div className="p-8"><h1 className="text-3xl font-bold">404 - Not Found</h1></div>;

function AppRoutes() {
  return (
    
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public routes */}
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/stalls" element={<Stalls />} />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/stalls/:stallId" element={<StallEmenu />} /> 



        <Route path="/stalls/:stallId/gallery" element={<StallGallery />} />
        {/* Protected routes - requires authentication */}
        <Route element={<ProtectedLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<OrderHistory />} />
          
          {/* TODO: Add more protected routes: profile, upload photo, etc */}
        </Route>
      </Route>

      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
