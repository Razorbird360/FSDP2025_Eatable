import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Input,
  Text,
  VStack,
  chakra,
  SegmentGroup,
} from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import api from '@lib/api';
import LogoImage from '../../../assets/logo/logo_full.png';
import BannerImage from '../../../assets/Login/Banner.jpg';
import GoogleIcon from '../../../assets/Login/google.png';

/**
 * SignupForm Component
 * Step 2: Form with validation, error handling, and Supabase integration
 */
const SignupForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, loading, error: authError, status } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    agreeToTerms: false,
    accountType: 'customer', // 'customer' or 'hawker'
  });
  const [errors, setErrors] = useState({});
  const [pendingEmail, setPendingEmail] = useState(null);

  const redirectPath = location.state?.from?.pathname ?? '/home';

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectPath, { replace: true });
    }
  }, [status, redirectPath, navigate]);

  useEffect(() => {
    if (authError) {
      setErrors((prev) => ({ ...prev, submit: authError }));
    }
  }, [authError]);

  const handleChange = (field) => (event) => {
    const value = field === 'agreeToTerms' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Validate form fields
   * @returns {Object} Object with field errors (empty if valid)
   */
  const validateForm = () => {
    const newErrors = {};

    // Username validation
    const username = formData.username.trim();
    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      newErrors.username = 'Username cannot exceed 20 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Only letters, numbers, and underscores are allowed';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms & Conditions';
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({}); // Clear previous errors

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check if email or username already exist
    try {
      const { data } = await api.post('/auth/check-availability', {
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim().toLowerCase(),
      });

      if (data.usernameTaken || data.emailTaken) {
        setErrors({
          ...(data.usernameTaken && { username: 'Username is already taken' }),
          ...(data.emailTaken && { email: 'Email is already registered' }),
        });
        return;
      }
    } catch (availabilityError) {
      console.error('Availability check failed:', availabilityError);
      setErrors({
        submit: 'Unable to verify username/email. Please try again.',
      });
      return;
    }

    // Call signup API - pass accountType to determine role
    const role = formData.accountType === 'hawker' ? 'hawker' : 'user';
    const result = await signup(formData.email, formData.password, formData.username, role);

    if (!result.success) {
      setErrors({ submit: result.error });
      return;
    }

    if (result.needsConfirmation) {
      setPendingEmail(formData.email.trim().toLowerCase());
    }
  };

  const renderPendingConfirmation = () => (
    <Box
      bg={{ base: 'transparent', lg: 'white' }}
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 8, md: 12, lg: 16, xl: 20 }}
      overflow="auto"
      position="relative"
      backgroundImage={{ base: `url(${BannerImage})`, lg: 'none' }}
      backgroundSize="cover"
      backgroundPosition="center"
    >
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.55)"
        display={{ base: 'block', lg: 'none' }}
        zIndex="1"
      />

      <Box
        width="100%"
        maxWidth={{ base: '420px', lg: '420px' }}
        position="relative"
        zIndex="2"
        bg={{ base: 'rgba(255,255,255,0.08)', lg: '#F6FBF2' }}
        borderRadius={{ base: 0, lg: '24px' }}
        p={{ base: 8, lg: 10 }}
        boxShadow={{ base: 'none', lg: '0px 20px 60px rgba(22, 38, 29, 0.12)' }}
      >
        <Image
          src={LogoImage}
          alt="Eatable Logo"
          width={{ base: '140px', lg: '120px' }}
          mb={{ base: 8, lg: 5 }}
          display={{ base: 'none', lg: 'block' }}
        />
        <VStack align="stretch" spacing={5}>
          <Text fontSize={{ base: '28px', lg: '24px' }} fontWeight="700" color={{ base: 'white', lg: '#1C201D' }}>
            Verify your email
          </Text>
          <Text fontSize="md" color={{ base: 'rgba(255,255,255,0.9)', lg: '#4A554B' }} lineHeight="1.6">
            We just sent a confirmation link to{' '}
            <Text as="span" fontWeight="600">
              {pendingEmail}
            </Text>
            . Open that email to activate your account. Once confirmed, return here and log in.
          </Text>
          <Button
            onClick={() => navigate('/login')}
            bg="#21421B"
            color="white"
            height="48px"
            borderRadius="12px"
            fontSize="16px"
            fontWeight="600"
            _hover={{ bg: '#1A3517' }}
          >
            Go to log in
          </Button>
          <Button
            variant="outline"
            borderColor={{ base: 'white', lg: '#21421B' }}
            color={{ base: 'white', lg: '#21421B' }}
            borderRadius="12px"
            onClick={() => setPendingEmail(null)}
          >
            Use a different email
          </Button>
        </VStack>
      </Box>
    </Box>
  );

  if (pendingEmail && status !== 'authenticated') {
    return renderPendingConfirmation();
  }

  return (
    <Box
      bg={{ base: 'transparent', lg: 'white' }}
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: 8, md: 12, lg: 16, xl: 20 }}
      overflow="auto"
      position="relative"
      backgroundImage={{ base: `url(${BannerImage})`, lg: 'none' }}
      backgroundSize="cover"
      backgroundPosition="center"
    >
      {/* Dark overlay for mobile */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.55)"
        display={{ base: 'block', lg: 'none' }}
        zIndex="1"
      />

      <Box width="100%" maxWidth={{ base: '420px', lg: '380px' }} position="relative" zIndex="2">
        <Image
          src={LogoImage}
          alt="Eatable Logo"
          width={{ base: '140px', lg: '115px' }}
          mb={{ base: 10, lg: 5 }}
          display={{ base: 'none', lg: 'block' }}
        />
        <Text
          fontSize={{ base: '28px', md: '36px', lg: '28px' }}
          fontWeight="700"
          color={{ base: 'white', lg: '#1C201D' }}
          mb={{ base: 3, lg: 2 }}
        >
          Create an account
        </Text>
        <Text
          fontSize={{ base: '15px', lg: '13px' }}
          color={{ base: 'rgba(255, 255, 255, 0.9)', lg: '#6B7D73' }}
          mb={{ base: 6, lg: 4 }}
          lineHeight="1.6"
        >
          Be the first to know about newly onboarded stalls and keep your hawker favourites in sync.
        </Text>

        {/* Account Type Selector */}
        <Box mb={{ base: 6, lg: 4 }}>
          <Text
            fontSize={{ base: '13px', lg: '12px' }}
            fontWeight="500"
            color={{ base: 'rgba(255,255,255,0.85)', lg: '#6B7D73' }}
            mb={2}
          >
            I am signing up as:
          </Text>
          <SegmentGroup.Root
            value={formData.accountType}
            onValueChange={(details) => setFormData((prev) => ({ ...prev, accountType: details.value }))}
            size={{ base: 'md', lg: 'sm' }}
          >
            <SegmentGroup.Indicator
              bg="#21421B"
              borderRadius="8px"
            />
            <SegmentGroup.Item
              value="customer"
              px={{ base: 6, lg: 5 }}
              py={{ base: 2.5, lg: 2 }}
              fontSize={{ base: '15px', lg: '14px' }}
              fontWeight="600"
              color={{ base: 'rgba(255,255,255,0.9)', lg: '#6B7D73' }}
              _checked={{
                color: 'white',
              }}
              cursor="pointer"
            >
              <SegmentGroup.ItemText>Customer</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
            <SegmentGroup.Item
              value="hawker"
              px={{ base: 6, lg: 5 }}
              py={{ base: 2.5, lg: 2 }}
              fontSize={{ base: '15px', lg: '14px' }}
              fontWeight="600"
              color={{ base: 'rgba(255,255,255,0.9)', lg: '#6B7D73' }}
              _checked={{
                color: 'white',
              }}
              cursor="pointer"
            >
              <SegmentGroup.ItemText>Hawker</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          </SegmentGroup.Root>
        </Box>

        <VStack as="form" onSubmit={handleSubmit} spacing={{ base: 5, lg: 3 }} align="stretch">
          <Box>
            <Text
              fontSize={{ base: '14px', lg: '13px' }}
              fontWeight="600"
              color={{ base: 'white', lg: '#1C201D' }}
              mb={2}
            >
              Username
            </Text>
            <Input
              height={{ base: '52px', lg: '44px' }}
              borderRadius="14px"
              border="1px solid"
              borderColor={errors.username ? '#E53E3E' : '#E1E9DF'}
              bg="white"
              color="#1C201D"
              fontSize={{ base: '15px', lg: '14px' }}
              px="20px"
              _placeholder={{ color: '#6B7D73' }}
              _hover={{ borderColor: errors.username ? '#E53E3E' : '#21421B', bg: 'white' }}
              _focus={{
                borderColor: errors.username ? '#E53E3E' : '#21421B',
                boxShadow: 'none',
                outline: 'none',
              }}
              _focusVisible={{
                borderColor: errors.username ? '#E53E3E' : '#21421B',
                boxShadow: 'none',
                outline: 'none',
              }}
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange('username')}
            />
            {errors.username && (
              <Text fontSize="13px" color="#E53E3E" mt={2}>
                {errors.username}
              </Text>
            )}
          </Box>

          <Box>
            <Text
              fontSize={{ base: '14px', lg: '13px' }}
              fontWeight="600"
              color={{ base: 'white', lg: '#1C201D' }}
              mb={2}
            >
              Email
            </Text>
            <Input
              height={{ base: '52px', lg: '44px' }}
              borderRadius="14px"
              border="1px solid"
              borderColor={errors.email ? '#E53E3E' : '#E1E9DF'}
              bg="white"
              color="#1C201D"
              fontSize={{ base: '15px', lg: '14px' }}
              px="20px"
              _placeholder={{ color: '#6B7D73' }}
              _hover={{ borderColor: errors.email ? '#E53E3E' : '#21421B', bg: 'white' }}
              _focus={{
                borderColor: errors.email ? '#E53E3E' : '#21421B',
                boxShadow: 'none',
                outline: 'none',
              }}
              _focusVisible={{
                borderColor: errors.email ? '#E53E3E' : '#21421B',
                boxShadow: 'none',
                outline: 'none',
              }}
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange('email')}
            />
            {errors.email && (
              <Text fontSize="13px" color="#E53E3E" mt={2}>
                {errors.email}
              </Text>
            )}
          </Box>

          <Box>
            <Text
              fontSize={{ base: '14px', lg: '13px' }}
              fontWeight="600"
              color={{ base: 'white', lg: '#1C201D' }}
              mb={2}
            >
              Password
            </Text>
            <Box position="relative">
              <Input
                height={{ base: '52px', lg: '44px' }}
                borderRadius="14px"
                border="1px solid"
                borderColor={errors.password ? '#E53E3E' : '#E1E9DF'}
                bg="white"
                color="#1C201D"
                fontSize={{ base: '15px', lg: '14px' }}
                px="20px"
                _placeholder={{ color: '#6B7D73' }}
                _hover={{ borderColor: errors.password ? '#E53E3E' : '#21421B', bg: 'white' }}
                _focus={{
                  borderColor: errors.password ? '#E53E3E' : '#21421B',
                  boxShadow: 'none',
                  outline: 'none',
                }}
                _focusVisible={{
                  borderColor: errors.password ? '#E53E3E' : '#21421B',
                  boxShadow: 'none',
                  outline: 'none',
                }}
                pr="60px"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange('password')}
              />
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                variant="ghost"
                color="#6B7D73"
                onClick={() => setShowPassword((prev) => !prev)}
                _hover={{ color: '#21421B' }}
                position="absolute"
                top="50%"
                right="2"
                transform="translateY(-50%)"
              >
                {showPassword ? <LuEye size={18} /> : <LuEyeOff size={18} />}
              </IconButton>
            </Box>
            {errors.password && (
              <Text fontSize="13px" color="#E53E3E" mt={2}>
                {errors.password}
              </Text>
            )}
          </Box>

          <Box mt={{ base: 1, lg: 0 }}>
            <Flex align="center" gap={3}>
              <chakra.input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange('agreeToTerms')}
                accentColor="#21421B"
                width="18px"
                height="18px"
                borderRadius="5px"
                border="1px solid"
                borderColor="#C9D7C5"
                bg="white"
              />
              <Text
                fontSize={{ base: '14px', lg: '13px' }}
                color={{ base: 'rgba(255, 255, 255, 0.9)', lg: '#6B7D73' }}
              >
                I agree to all the{' '}
                <Text as="span" fontWeight="600" color={{ base: 'white', lg: '#21421B' }}>
                  Terms & Conditions
                </Text>
              </Text>
            </Flex>
            {errors.agreeToTerms && (
              <Text fontSize="13px" color="#E53E3E" mt={2}>
                {errors.agreeToTerms}
              </Text>
            )}
          </Box>

          {/* General submit error */}
          {errors.submit && (
            <Box
              bg="rgba(229, 62, 62, 0.1)"
              border="1px solid"
              borderColor="#E53E3E"
              borderRadius="10px"
              px={4}
              py={3}
              mt={2}
            >
              <Text fontSize="14px" color="#E53E3E">
                {errors.submit}
              </Text>
            </Box>
          )}

          <Button
            type="submit"
            bg="#21421B"
            color="white"
            height={{ base: '52px', lg: '44px' }}
            borderRadius="12px"
            fontSize={{ base: '16px', lg: '14px' }}
            fontWeight="600"
            _hover={{ bg: loading ? '#21421B' : '#1A3517' }}
            _active={{ bg: loading ? '#21421B' : '#142812' }}
            mt={{ base: 3, lg: 1 }}
            disabled={loading}
            cursor={loading ? 'not-allowed' : 'pointer'}
            opacity={loading ? 0.7 : 1}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

          <Flex align="center" gap={4}>
            <Box flex="1" height="1px" bg="rgba(255, 255, 255, 0.35)" display={{ base: 'block', lg: 'none' }} />
            <Box flex="1" height="1px" bg="#E1E9DF" display={{ base: 'none', lg: 'block' }} />
            <Text fontSize={{ base: '13px', lg: '12px' }} fontWeight="600" color={{ base: 'white', lg: '#6B7D73' }}>
              or
            </Text>
            <Box flex="1" height="1px" bg="rgba(255, 255, 255, 0.35)" display={{ base: 'block', lg: 'none' }} />
            <Box flex="1" height="1px" bg="#E1E9DF" display={{ base: 'none', lg: 'block' }} />
          </Flex>

          <Button
            variant="outline"
            borderColor={{ base: 'transparent', lg: '#E1E9DF' }}
            bg={{ base: 'rgba(255,255,255,0.12)', lg: 'white' }}
            color={{ base: 'white', lg: '#1C201D' }}
            height={{ base: '52px', lg: '44px' }}
            borderRadius="12px"
            fontSize={{ base: '16px', lg: '14px' }}
            fontWeight="600"
            gap={3}
            _hover={{ bg: { base: 'rgba(255,255,255,0.16)', lg: '#F6FBF2' } }}
            _active={{ bg: { base: 'rgba(255,255,255,0.2)', lg: '#ECF5E7' } }}
          >
            <Image src={GoogleIcon} alt="Google icon" boxSize="22px" />
            Continue with Google
          </Button>
        </VStack>

        <Flex mt={{ base: 6, lg: 3 }} direction="column" gap={2}>
          <Text
            fontSize={{ base: '14px', lg: '13px' }}
            color={{ base: 'rgba(255, 255, 255, 0.9)', lg: '#6B7D73' }}
            textAlign="center"
          >
            Already have an account?{' '}
            <Link to="/login">
              <Text as="span" fontWeight="600" className='hover:underline' color={{ base: 'white', lg: '#21421B' }}>
                Log in
              </Text>
            </Link>
          </Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default SignupForm;
