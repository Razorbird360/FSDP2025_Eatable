import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { toaster } from '../../../lib/toaster';

interface StallSetupFormState {
  name: string;
  description: string;
  cuisineType: string;
  hawkerCentreId: string;
  tags: string[];
  dietaryTags: string[];
  imageFile: File | null;
  imagePreview: string | null;
}

interface HawkerCentre {
  id: string;
  name: string;
  address: string | null;
}

const CUISINE_OPTIONS = [
  'Chinese',
  'Malay',
  'Indian',
  'Western',
  'Thai',
  'Japanese',
  'Korean',
  'Vietnamese',
  'Fusion',
  'Others',
];

const DIETARY_TAG_OPTIONS = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
];

const STALL_TAG_OPTIONS = [
  'Budget-Friendly',
  'Popular',
  'Award-Winning',
  'Family-Owned',
  'Must-Try',
  'Signature Dish',
  'Quick Service',
];

export default function StallSetupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<StallSetupFormState>({
    name: '',
    description: '',
    cuisineType: '',
    hawkerCentreId: '',
    tags: [],
    dietaryTags: [],
    imageFile: null,
    imagePreview: null,
  });

  const [hawkerCentres, setHawkerCentres] = useState<HawkerCentre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCentres, setIsLoadingCentres] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

  // Fetch hawker centres on component mount
  useEffect(() => {
    const fetchHawkerCentres = async () => {
      try {
        setIsLoadingCentres(true);
        const response = await api.get('/hawker-centres/all');
        setHawkerCentres(response.data || []);
      } catch (err) {
        console.error('Failed to fetch hawker centres:', err);
        setError('Failed to load hawker centres. Please refresh the page.');
      } finally {
        setIsLoadingCentres(false);
      }
    };

    fetchHawkerCentres();
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
      }
    };
  }, []);

  // Handle text input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle tag toggles
  const handleTagToggle = (tagType: 'tags' | 'dietaryTags', tag: string) => {
    setForm((prev) => {
      const currentTags = prev[tagType];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      return { ...prev, [tagType]: newTags };
    });
  };

  // Handle image upload
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        imageFile: 'Image must be less than 5MB',
      }));
      return;
    }

    // Cleanup previous object URL
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = previewUrl;

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));

    // Clear validation error
    if (validationErrors.imageFile) {
      setValidationErrors((prev) => {
        const { imageFile, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Stall name
    if (!form.name.trim()) {
      errors.name = 'Stall name is required';
    }

    // Hawker centre
    if (!form.hawkerCentreId) {
      errors.hawkerCentreId = 'Please select a hawker centre';
    }

    // Cuisine type
    if (!form.cuisineType) {
      errors.cuisineType = 'Please select a cuisine type';
    }

    // Image
    if (!form.imageFile) {
      errors.imageFile = 'Please upload a stall image';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Upload stall image
      const formData = new FormData();
      formData.append('image', form.imageFile!);

      const uploadRes = await api.post('/media/upload/stall-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const imageUrl = uploadRes.data.imageUrl;

      // Step 2: Create stall
      const stallPayload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        cuisineType: form.cuisineType,
        hawkerCentreId: form.hawkerCentreId,
        image_url: imageUrl,
        tags: form.tags,
        dietaryTags: form.dietaryTags,
      };

      await api.post('/stalls', stallPayload);

      // Success - show toast and redirect
      toaster.create({
        title: 'Stall created successfully!',
        description: 'Welcome to your hawker dashboard.',
        type: 'success',
        duration: 3000,
      });

      // Redirect to dashboard
      navigate('/hawker/dashboard');
    } catch (err: any) {
      console.error('[handleSubmit]', err);
      const message =
        err.response?.data?.error ||
        'Failed to create stall. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCentres) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21421B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1C201D] mb-2">
            Setup Your Stall
          </h1>
          <p className="text-gray-600">
            Complete your stall profile to start receiving orders
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stall Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Stall Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] ${
                  validationErrors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Ah Seng Chicken Rice"
                disabled={isLoading}
                maxLength={100}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            {/* Stall Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stall Image <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-6 transition-colors ${
                  validationErrors.imageFile
                    ? 'border-red-500'
                    : 'border-gray-300 hover:border-[#21421B]'
                }`}
                disabled={isLoading}
              >
                {form.imagePreview ? (
                  <img
                    src={form.imagePreview}
                    alt="Stall preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="text-center">
                      <p className="font-medium">Click to upload stall image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
                    </div>
                  </div>
                )}
              </button>
              {validationErrors.imageFile && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.imageFile}</p>
              )}
            </div>

            {/* Hawker Centre */}
            <div>
              <label htmlFor="hawkerCentreId" className="block text-sm font-medium text-gray-700 mb-2">
                Hawker Centre <span className="text-red-500">*</span>
              </label>
              <select
                id="hawkerCentreId"
                value={form.hawkerCentreId}
                onChange={(e) => handleSelectChange('hawkerCentreId', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] ${
                  validationErrors.hawkerCentreId ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Select a hawker centre</option>
                {hawkerCentres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    {centre.name}
                    {centre.address && ` - ${centre.address}`}
                  </option>
                ))}
              </select>
              {validationErrors.hawkerCentreId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.hawkerCentreId}</p>
              )}
            </div>

            {/* Cuisine Type */}
            <div>
              <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine Type <span className="text-red-500">*</span>
              </label>
              <select
                id="cuisineType"
                value={form.cuisineType}
                onChange={(e) => handleSelectChange('cuisineType', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] ${
                  validationErrors.cuisineType ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="">Select cuisine type</option>
                {CUISINE_OPTIONS.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
              {validationErrors.cuisineType && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.cuisineType}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] resize-none"
                placeholder="Tell customers about your stall, specialties, history..."
                disabled={isLoading}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {form.description.length}/500 characters
              </p>
            </div>

            {/* Dietary Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dietary Options
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DIETARY_TAG_OPTIONS.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={form.dietaryTags.includes(tag)}
                      onChange={() => handleTagToggle('dietaryTags', tag)}
                      className="w-4 h-4 text-[#21421B] border-gray-300 rounded focus:ring-[#21421B]"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-[#21421B]">
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stall Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Stall Highlights
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STALL_TAG_OPTIONS.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag)}
                      onChange={() => handleTagToggle('tags', tag)}
                      className="w-4 h-4 text-[#21421B] border-gray-300 rounded focus:ring-[#21421B]"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-[#21421B]">
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="w-full bg-[#21421B] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a3415] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating stall...</span>
                  </>
                ) : (
                  <span>Create Stall</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
