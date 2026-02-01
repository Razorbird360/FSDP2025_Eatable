import * as profileService from "../services/profile.service.js";
import { storageService } from "../services/storage.service.js";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await profileService.getProfileById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userProfile = await profileService.getUserProfileByUserId(userId);

    // Map Prisma camelCase to snake_case for frontend compatibility
    const responseData = {
      ...user,
      display_name: user.displayName,
      profile_pic_url: userProfile?.profilePicUrl ?? null,
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
    const userProfile = await profileService.getUserProfileByUserId(userId);

    const responseData = {
      ...updatedUser,
      display_name: updatedUser.displayName,
      profile_pic_url: userProfile?.profilePicUrl ?? null,
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

export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const compressed = await storageService.compressImage(req.file.buffer, "square");
    const filePath = storageService.generateFilePath("avatars", userId, "jpg");
    const imageUrl = await storageService.uploadFile(
      "profile-pictures",
      filePath,
      compressed,
      "image/jpeg"
    );

    const updatedProfile = await profileService.upsertUserProfilePic(
      userId,
      imageUrl
    );

    res.status(200).json({ profilePicUrl: updatedProfile.profilePicUrl });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ error: "Failed to upload profile picture" });
  }
};
