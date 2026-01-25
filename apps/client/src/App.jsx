import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AppRoutes from './routes';
import { AuthProvider } from './features/auth/AuthProvider';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from './features/orders/components/CartContext.jsx';

function App() {
  return (
    
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
