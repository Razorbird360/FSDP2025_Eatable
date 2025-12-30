import FormData from 'form-data';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const aiValidationService = {
  /**
   * Validates if an image contains food (generic check)
   * @param {Buffer} imageBuffer - The image buffer to validate
   * @returns {Promise<{is_food: number, message: string}>}
   */
  async validateFoodGeneric(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer provided');
    }

    try {
      const detected = await fileTypeFromBuffer(imageBuffer);
      const contentType = detected?.mime || 'application/octet-stream';
      const ext = detected?.ext || 'jpg';

      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: `image.${ext}`,
        contentType,
      });

      const response = await axios.post(
        `${AI_SERVICE_URL}/food/validate-generic`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('AI validation error (generic):', error.message);
      throw new Error('Failed to validate image with AI service');
    }
  },

  /**
   * Validates if an image contains a specific dish
   * @param {Buffer} imageBuffer - The image buffer to validate
   * @param {string} dishName - The name of the dish to validate against
   * @returns {Promise<{is_match: number, message: string, dish_name: string}>}
   */
  async validateFoodSpecific(imageBuffer, dishName) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer provided');
    }
    if (!dishName || typeof dishName !== 'string' || dishName.trim().length === 0) {
      throw new Error('Invalid dish name provided');
    }

    try {
      const detected = await fileTypeFromBuffer(imageBuffer);
      const contentType = detected?.mime || 'application/octet-stream';
      const ext = detected?.ext || 'jpg';

      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: `image.${ext}`,
        contentType,
      });
      formData.append('dish_name', dishName);

      const response = await axios.post(
        `${AI_SERVICE_URL}/food/validate-specific`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('AI validation error (specific):', error.message);
      throw new Error('Failed to validate dish with AI service');
    }
  },
};
