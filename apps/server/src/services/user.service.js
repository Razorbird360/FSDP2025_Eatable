import prisma from '../lib/prisma.js';

export const userService = {
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
    });
  },

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
    });
  },

  async createUser({ id, email, username, displayName, role = 'user' }) {
    return await prisma.user.create({
      data: {
        id,
        email,
        username,
        displayName,
        role,
      },
    });
  },

  async updateUser(id, data) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  },

  async deleteUser(id) {
    return await prisma.user.delete({
      where: { id },
    });
  },

  setSkipOnboarding(id, skip) {
    return prisma.user.update({
      where: { id },
      data: { skipOnboarding: skip },
    });
  }

};
