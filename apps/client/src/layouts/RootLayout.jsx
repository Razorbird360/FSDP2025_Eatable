import { Outlet } from "react-router-dom";
import Navbar from "../ui/Navbar";
import CartSidebar from "../features/orders/components/CartSidebar";
import { Toaster } from "../components/ui/toaster";
import FloatingOrderBubble from "../pages/FloatingOrderBubble";
import BudgetAlertProvider from "../pages/BudgetAlertProvider";

function RootLayout() {
  return (
    <BudgetAlertProvider>
      <div className="flex min-h-screen flex-col bg-[#f8fdf3]">
        <Navbar />

        <main className="flex-1 pt-16 lg:pt-[4rem]">
          <Outlet />
        </main>

        <CartSidebar />
      <FloatingOrderBubble />
        <Toaster />
      </div>
    </BudgetAlertProvider>
  );
}

export default RootLayout;
