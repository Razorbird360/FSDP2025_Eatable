import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../auth/useAuth';

interface StallSetupFormState {
  name: string;
  location: string;
  description: string;
  cuisineType: string;
  hawkerCentreId: string;
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

export default function StallSetupPage() {
  const navigate = useNavigate();
  const { session, refreshProfile } = useAuth();

  const [form, setForm] = useState<StallSetupFormState>({
    name: '',
    location: '',
    description: '',
    cuisineType: '',
    hawkerCentreId: '',
    dietaryTags: [],
    imageFile: null,
    imagePreview: null,
  });

  const [hawkerCentres, setHawkerCentres] = useState<HawkerCentre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCentres, setIsLoadingCentres] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isHawkerDropdownOpen, setIsHawkerDropdownOpen] = useState(false);
  const [isCuisineDropdownOpen, setIsCuisineDropdownOpen] = useState(false);;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

  // Check if hawker already has a stall and fetch hawker centres
  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoadingCentres(true);

        // Check if hawker already owns a stall
        const stallRes = await api.get('/hawker/my-stall');
        if (stallRes.data) {
          // Hawker already has a stall, redirect to dashboard
          navigate('/hawker/dashboard', { replace: true });
          return;
        }

        // Fetch hawker centres
        const centresRes = await api.get('/hawker-centres/all');
        setHawkerCentres(centresRes.data || []);
      } catch (err) {
        console.error('Failed to initialize page:', err);
        setError('Failed to load page data. Please refresh.');
      } finally {
        setIsLoadingCentres(false);
      }
    };

    initializePage();
  }, [navigate]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
      }
    };
  }, []);

  // Close hawker dropdown on outside click
  useEffect(() => {
    if (!isHawkerDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.hawker-dropdown')) {
        setIsHawkerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHawkerDropdownOpen]);

  // Close cuisine dropdown on outside click
  useEffect(() => {
    if (!isCuisineDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cuisine-dropdown')) {
        setIsCuisineDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCuisineDropdownOpen]);

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

  // Handle location input - format as ##-##
  const handleLocationChange = (e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');

    // Limit to 4 digits
    const limited = digits.slice(0, 4);

    // Format as ##-## if we have enough digits
    let formatted = limited;
    if (limited.length > 2) {
      formatted = limited.slice(0, 2) + '-' + limited.slice(2);
    }

    setForm((prev) => ({ ...prev, location: formatted }));
    if (validationErrors.location) {
      setValidationErrors((prev) => {
        const { location, ...rest } = prev;
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

  // Handle dietary tag toggles
  const handleDietaryTagToggle = (tag: string) => {
    setForm((prev) => {
      const currentTags = prev.dietaryTags;
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      return { ...prev, dietaryTags: newTags };
    });
  };

  // Handle image upload
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        imageFile: 'Image must be less than 2MB',
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

    // Location
    if (!form.location.trim()) {
      errors.location = 'Location is required';
    } else if (!/^\d{2}-\d{2}$/.test(form.location)) {
      errors.location = 'Location must be in format ##-##';
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
    let uploadedImageUrl: string | null = null;

    try {
      // Step 1: Upload stall image
      const formData = new FormData();
      formData.append('image', form.imageFile!);

      const uploadRes = await api.post('/media/upload/stall-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      uploadedImageUrl = uploadRes.data.imageUrl;

      // Step 2: Create stall
      const stallPayload = {
        name: form.name.trim(),
        location: `Stall ${form.location}`,
        description: form.description.trim() || null,
        cuisineType: form.cuisineType,
        hawkerCentreId: form.hawkerCentreId,
        image_url: uploadedImageUrl,
        dietaryTags: form.dietaryTags,
      };

      await api.post('/stalls', stallPayload);
      await refreshProfile(session, { force: true, useStoredSession: false });

      // Redirect to dashboard
      navigate('/hawker/dashboard');
    } catch (err: any) {
      console.error('[handleSubmit]', err);

      // If image was uploaded but stall creation failed, try to delete the orphaned image
      if (uploadedImageUrl) {
        try {
          await api.delete(`/media/stall-image`, {
            data: { imageUrl: uploadedImageUrl }
          });
        } catch (deleteErr) {
          console.error('[handleSubmit] Failed to cleanup orphaned image:', deleteErr);
        }
      }

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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#FCF7F0' }}>
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

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Stall Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-700 font-medium pointer-events-none">
                  Stall&nbsp;
                </span>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleLocationChange}
                  className={`w-full pl-[72px] pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] ${
                    validationErrors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="01-10"
                  disabled={isLoading}
                  maxLength={5}
                />
              </div>
              {validationErrors.location && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.location}</p>
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
                accept="image/jpeg,image/png"
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
                      <p className="text-xs text-gray-400 mt-1">PNG or JPG up to 2MB</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hawker Centre <span className="text-red-500">*</span>
              </label>
              <div className="relative hawker-dropdown">
                <button
                  type="button"
                  onClick={() => setIsHawkerDropdownOpen(!isHawkerDropdownOpen)}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] bg-white text-left flex items-center justify-between disabled:opacity-50 ${
                    validationErrors.hawkerCentreId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <span className={form.hawkerCentreId ? 'text-gray-900' : 'text-gray-400'}>
                    {form.hawkerCentreId
                      ? hawkerCentres.find(c => c.id === form.hawkerCentreId)?.name
                      : 'Select a hawker centre'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isHawkerDropdownOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isHawkerDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto">
                    {hawkerCentres.map((centre) => (
                      <button
                        key={centre.id}
                        type="button"
                        onClick={() => {
                          handleSelectChange('hawkerCentreId', centre.id);
                          setIsHawkerDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          form.hawkerCentreId === centre.id
                            ? 'text-[#21421B] font-semibold bg-gray-50'
                            : 'text-gray-700'
                        }`}
                      >
                        {centre.name}
                        {centre.address && ` - ${centre.address}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {validationErrors.hawkerCentreId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.hawkerCentreId}</p>
              )}
            </div>

            {/* Cuisine Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine Type <span className="text-red-500">*</span>
              </label>
              <div className="relative cuisine-dropdown">
                <button
                  type="button"
                  onClick={() => setIsCuisineDropdownOpen(!isCuisineDropdownOpen)}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#21421B] bg-white text-left flex items-center justify-between disabled:opacity-50 ${
                    validationErrors.cuisineType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <span className={form.cuisineType ? 'text-gray-900' : 'text-gray-400'}>
                    {form.cuisineType || 'Select cuisine type'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isCuisineDropdownOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isCuisineDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto">
                    {CUISINE_OPTIONS.map((cuisine) => (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => {
                          handleSelectChange('cuisineType', cuisine);
                          setIsCuisineDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          form.cuisineType === cuisine
                            ? 'text-[#21421B] font-semibold bg-gray-50'
                            : 'text-gray-700'
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                      onChange={() => handleDietaryTagToggle(tag)}
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
