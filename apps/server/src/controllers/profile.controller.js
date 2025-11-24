import * as profileService from "../services/profile.service.js";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await profileService.getProfileById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Map Prisma camelCase to snake_case for frontend compatibility
    const responseData = {
      ...user,
      display_name: user.displayName,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await profileService.updateUserProfile(userId, req.body);

    const responseData = {
      ...updatedUser,
      display_name: updatedUser.displayName,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error updating profile:", error);
    // Handle unique constraint violation (e.g., username)
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
};
