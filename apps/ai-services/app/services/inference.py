"""
Image validation and inference service
"""


class ImageValidator:
    def __init__(self):
        self.model = None

    def validate_food_image(self, image_path: str) -> dict:
        """
        Validate if image contains food

        Args:
            image_path: Path to image file

        Returns:
            dict with validation results
        """
        return {
            "is_food": True,
            "confidence": 0.85,
        }

    def classify_dish(self, image_path: str) -> dict:
        """
        Classify what type of dish is in the image

        Args:
            image_path: Path to image file

        Returns:
            dict with classification results
        """
        return {
            "dish_name": "chicken rice",
            "confidence": 0.82,
        }
