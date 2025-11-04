import { Routes, Route } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import ProtectedLayout from '../layouts/ProtectedLayout';

// Placeholder pages - to be replaced with actual feature pages
const Home = () => <div className="p-8"><h1 className="text-3xl font-bold">Home</h1></div>;
const Stalls = () => <div className="p-8"><h1 className="text-3xl font-bold">Stalls</h1></div>;
const StallDetail = () => <div className="p-8"><h1 className="text-3xl font-bold">Stall Detail</h1></div>;
const Cart = () => <div className="p-8"><h1 className="text-3xl font-bold">Cart</h1></div>;
const OrderHistory = () => <div className="p-8"><h1 className="text-3xl font-bold">Order History</h1></div>;
const Login = () => <div className="p-8"><h1 className="text-3xl font-bold">Login</h1></div>;
const Register = () => <div className="p-8"><h1 className="text-3xl font-bold">Register</h1></div>;
const NotFound = () => <div className="p-8"><h1 className="text-3xl font-bold">404 - Not Found</h1></div>;

function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/stalls" element={<Stalls />} />
        <Route path="/stalls/:stallId" element={<StallDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes - requires authentication */}
        <Route element={<ProtectedLayout />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<OrderHistory />} />
          {/* TODO: Add more protected routes: profile, upload photo, etc */}
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
