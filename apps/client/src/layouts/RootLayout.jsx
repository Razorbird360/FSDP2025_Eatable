import { Outlet } from 'react-router-dom';
import Navbar from '../ui/Navbar';
import CartSidebar from '../features/orders/components/CartSidebar';

function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fdf3]">
      <Navbar />

      <main className="flex-1 pt-16 lg:pt-[4rem]">
        <Outlet />
      </main>

      <CartSidebar />
    </div>
  );
}

export default RootLayout;
