export const aiService = {
  async validateImage(imageUrl, menuItemName) {
    // TODO: Call FastAPI service to validate food image
    throw new Error('AI validation not implemented');
  },

  async healthCheck() {
    // TODO: Check AI service health
    return false;
  },
};

export default aiService;
