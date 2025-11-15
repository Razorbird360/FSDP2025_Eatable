import { Grid, GridItem } from '@chakra-ui/react';
import AuthBanner from './components/AuthBanner';
import LoginForm from './components/LoginForm';

/**
 * LoginPage Component
 * 2-column responsive layout matching the signup page
 * - Desktop: form on the left, banner on the right
 * - Mobile: form only for faster access
 */
const LoginPage = () => {
  return (
    <Grid
      templateColumns={{ base: '1fr', lg: '40% 60%' }}
      height="100vh"
      overflow="hidden"
    >
      <GridItem order={{ base: 1, lg: 1 }}>
        <LoginForm />
      </GridItem>
      <GridItem
        display={{ base: 'none', lg: 'block' }}
        order={{ base: 2, lg: 2 }}
      >
        <AuthBanner />
      </GridItem>
    </Grid>
  );
};

export default LoginPage;
