import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { userService } from '../services/user.service.js';

export const signup = async (req, res) => {
  try {
    const { email, password, displayName } = req.validatedBody;

    // Check if user already exists in PostgreSQL
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Create user in Supabase Auth
    const {
      data: { user: supabaseUser },
      error: supabaseError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for development
    });

    if (supabaseError) {
      console.error('Supabase signup error:', supabaseError);
      return res.status(400).json({ error: supabaseError.message });
    }

    // Sync user to PostgreSQL database
    const user = await userService.createUser({
      id: supabaseUser.id,
      email: supabaseUser.email,
      displayName,
      role: 'user',
    });

    // Generate session token
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAdmin.auth.admin.createSession({
      userId: supabaseUser.id,
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Return user data (exclude sensitive info) and tokens
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
};
