import { userService } from '../services/user.service.js';

export const syncUser = async (req, res) => {
  try {
    const existingUser = await userService.findById(req.user.id);
    if (existingUser) {
      return res.status(200).json({
        message: 'User already synced',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.displayName,
          role: existingUser.role,
        },
      });
    }

    const { displayName } = req.validatedBody;

    const user = await userService.createUser({
      id: req.user.id,
      email: req.user.email,
      displayName,
      role: 'user',
    });

    res.status(201).json({
      message: 'User synced successfully',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Internal server error during user sync' });
  }
};
