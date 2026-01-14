import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * @fileoverview Global scroll-to-top component for React Router navigation.
 * @module components/ScrollToTop
 */

/**
 * Automatically scrolls to top of page on route changes.
 * 
 * This component should be placed inside BrowserRouter to enable
 * global scroll-to-top behavior across all route transitions.
 * 
 * @component
 * @example
 * // In App.jsx
 * import ScrollToTop from './components/ScrollToTop';
 * 
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <ScrollToTop />
 *       <AppRoutes />
 *     </BrowserRouter>
 *   );
 * }
 * 
 * @returns {null} This component does not render any visible content.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
