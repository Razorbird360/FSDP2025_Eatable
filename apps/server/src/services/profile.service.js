import prisma from "../lib/prisma.js";

export const getProfileById = async (userId) => {
    return await prisma.user.findUnique({
        where: { id: userId },
    });
};

export const updateUserProfile = async (userId, data) => {
    // Construct the update object based on allowed fields
    const updateData = {};

    if (data.display_name !== undefined) updateData.displayName = data.display_name;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.language !== undefined) updateData.language = data.language;

    return await prisma.user.update({
        where: { id: userId },
        data: updateData,
    });
};
