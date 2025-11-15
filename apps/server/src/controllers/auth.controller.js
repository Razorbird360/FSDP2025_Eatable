import { userService } from '../services/user.service.js';

export const authController = {
  async checkAvailability(req, res) {
    try {
      const { email, username } = req.body ?? {};

      if (!email || !username) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [
            ...(email ? [] : [{ field: 'email', message: 'Email is required' }]),
            ...(username ? [] : [{ field: 'username', message: 'Username is required' }]),
          ],
        });
      }

      const [emailMatch, usernameMatch] = await Promise.all([
        userService.findByEmail(email),
        userService.findByUsername(username),
      ]);

      res.status(200).json({
        emailTaken: Boolean(emailMatch),
        usernameTaken: Boolean(usernameMatch),
      });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  },


  async getCurrentUser(req, res) {
    try {
      const profile = await userService.findById(req.user.id);

      if (!profile) {
        return res.status(200).json({
          id: req.user.id,
          email: req.user.email,
          username: req.user.user_metadata?.username ?? null,
          displayName: req.user.user_metadata?.display_name ?? null,
          role: req.user.app_metadata?.role ?? 'user',
          isSynced: false,
        });
      }

      res.status(200).json({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        displayName: profile.displayName,
        role: profile.role,
        isSynced: true,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to load current user' });
    }
  },

  async syncUser(req, res) {
    try {
      const existingUser = await userService.findById(req.user.id);
      if (existingUser) {
        return res.status(200).json({
          message: 'User already synced',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            displayName: existingUser.displayName,
            role: existingUser.role,
          },
        });
      }

      const { username, displayName } = req.validatedBody;

      const user = await userService.createUser({
        id: req.user.id,
        email: req.user.email,
        username,
        displayName,
        role: 'user',
      });

      res.status(201).json({
        message: 'User synced successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({ error: 'Internal server error during user sync' });
    }
  },
};
