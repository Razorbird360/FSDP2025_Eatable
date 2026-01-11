import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AppRoutes from './routes';
import { AuthProvider } from './features/auth/AuthProvider';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
