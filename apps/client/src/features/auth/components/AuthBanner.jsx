import { Box, Image } from '@chakra-ui/react';
import BannerImage from '../../../assets/Login/Banner.jpg';

/**
 * AuthBanner Component
 * Displays the banner image filling the right side of the signup page
 */
const AuthBanner = () => {
  return (
    <Box
      height="100vh"
      width="100%"
      overflow="hidden"
    >
      <Image
        src={BannerImage}
        alt="Eatable banner"
        width="100%"
        height="100%"
        objectFit="cover"
      />
    </Box>
  );
};

export default AuthBanner;
