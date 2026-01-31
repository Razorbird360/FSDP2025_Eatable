import { Outlet } from "react-router-dom";
import Navbar from "../ui/Navbar";
import CartSidebar from "../features/orders/components/CartSidebar";
import { Toaster } from "../components/ui/toaster";
import FloatingOrderBubble from "../pages/FloatingOrderBubble";
import BudgetAlertProvider from "../pages/BudgetAlertProvider";
import { AgentChatProvider } from "../features/agent/components/AgentChatContext";
import AgentChatButton from "../features/agent/components/AgentChatButton";
import AgentChatPanel from "../features/agent/components/AgentChatPanel";

function RootLayout() {
  return (
    <BudgetAlertProvider>
      <AgentChatProvider>
        <div className="flex min-h-screen flex-col bg-[#f8fdf3]">
          <Navbar />

          <main className="flex-1 pt-16 lg:pt-[4rem]">
            <Outlet />
          </main>

          <CartSidebar />
          <FloatingOrderBubble />
          <AgentChatPanel />
          <AgentChatButton />
          <Toaster />
        </div>
      </AgentChatProvider>
    </BudgetAlertProvider>
  );
}

export default RootLayout;
