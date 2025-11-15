import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AppRoutes from './routes';
import { AuthProvider } from './features/auth/AuthProvider';

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
