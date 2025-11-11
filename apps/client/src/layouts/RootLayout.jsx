import { Outlet } from 'react-router-dom';
import Navbar from '../ui/Navbar';

/**
 * RootLayout - Base layout with navigation and footer
 * Used for: All public pages (home, stalls, menu browsing)
 */
function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fdf3]">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-[4rem]">
        <Outlet />
      </main>
    </div>
  );
}

export default RootLayout;
