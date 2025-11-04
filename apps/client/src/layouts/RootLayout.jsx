import { Outlet, Link } from 'react-router-dom';

/**
 * RootLayout - Base layout with navigation and footer
 * Used for: All public pages (home, stalls, menu browsing)
 */
function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* TODO: Replace with proper Navbar component */}
      <nav className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex gap-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/stalls" className="hover:underline">Stalls</Link>
          <Link to="/cart" className="hover:underline">Cart</Link>
          <Link to="/login" className="hover:underline">Login</Link>
        </div>
      </nav>

      {/* Main content area - child routes render here */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* TODO: Add footer if needed */}
    </div>
  );
}

export default RootLayout;
