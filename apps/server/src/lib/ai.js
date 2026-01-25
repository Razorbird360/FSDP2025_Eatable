export const aiService = {
  async validateImage(_imageUrl, _menuItemName) {
    throw new Error('AI validation not implemented');
  },

  async healthCheck() {
    return false;
  },
};

export default aiService;
