import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  CameraIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import api from "../../utils/api";
import { IMAGE_BASE_URL } from "../../config";

const StoreUpdateForm = ({ storeData, onCancel, onSuccess }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [businessTypes, setBusinessTypes] = useState([]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = String(imagePath).replace(/^public\//, "").replace(/^\//, "");
    const base = (IMAGE_BASE_URL || "").replace(/\/$/, "");
    return base ? `${base}/${cleanPath}` : null;
  };

  const [formFields, setFormFields] = useState({
    store_name: "",
    description: "",
    business_type: "",
    business_registration_number: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "Myanmar",
    postal_code: "",
    social_facebook: "",
    social_instagram: "",
    social_twitter: "",
    account_number: ""
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  // Fetch business types
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        const response = await api.get("/business-types");
        setBusinessTypes(response.data.data);
      } catch (error) {
        setBusinessTypes([
          { value: "individual", label: "Individual/Sole Proprietorship" },
          { value: "company", label: "Private Limited Company" },
          { value: "retail", label: "Retail Business" },
          { value: "wholesale", label: "Wholesale Business" },
          { value: "service", label: "Service Business" },
        ]);
      }
    };

    fetchBusinessTypes();
  }, []);

  // Initialize form data when storeData is available
  useEffect(() => {
    if (storeData) {
      setFormFields({
        store_name: storeData.store_name || "",
        description: storeData.description || "",
        business_type: storeData.business_type || "",
        business_registration_number: storeData.business_registration_number || "",
        tax_id: storeData.tax_id || "",
        contact_email: storeData.contact_email || "",
        contact_phone: storeData.contact_phone || "",
        website: storeData.website || "",
        address: storeData.address || "",
        city: storeData.city || "",
        state: storeData.state || "",
        country: storeData.country || "Myanmar",
        postal_code: storeData.postal_code || "",
        social_facebook: storeData.social_facebook || "",
        social_instagram: storeData.social_instagram || "",
        social_twitter: storeData.social_twitter || "",
        account_number: storeData.account_number || ""
      });

      if (storeData.store_logo) {
        setLogoPreview(getImageUrl(storeData.store_logo));
      }
      if (storeData.store_banner) {
        setBannerPreview(getImageUrl(storeData.store_banner));
      }
    }
  }, [storeData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();


      // Append ALL form fields, including empty ones (let backend handle validation)
      Object.keys(formFields).forEach(key => {
        const value = formFields[key];
        // Send all fields, even empty ones - backend will handle null conversion
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // Append files if they exist
      if (logoFile) {
        formData.append('store_logo', logoFile);
      }

      if (bannerFile) {
        formData.append('store_banner', bannerFile);
      }

      // Log all FormData entries for debugging
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
        } else {
        }
      }

      const response = await api.put("/dashboard/seller/my-store", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });


      if (response.data.success) {
        setMessage({
          type: "success",
          text: "Store profile updated successfully!"
        });
        
        // Clear file states
        setLogoFile(null);
        setBannerFile(null);
        
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      }
    } catch (error) {
      console.error("=== API ERROR ===");
      console.error("Failed to update store:", error);
      console.error("Error details:", error.response?.data);
      
      let errorMessage = "Failed to update store profile";
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setMessage({
        type: "error",
        text: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setLogoFile(null);
    setBannerFile(null);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Store Profile</h2>
        <p className="mt-1 text-sm text-gray-500">
          Update your store information and media
        </p>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 ${
          message.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.type === "success" ? (
            <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <XMarkIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            onClick={() => setMessage({ type: "", text: "" })}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Media Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Media</h3>
          
          {/* Logo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Store Logo
            </label>
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Store logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CameraIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block">
                  <span className="sr-only">Choose logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 400x400px, Max 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Store Banner
            </label>
            <div className="space-y-3">
              <div className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Store banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CameraIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <label className="block">
                  <span className="sr-only">Choose banner</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 1200x300px, Max 5MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Store Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                name="store_name"
                value={formFields.store_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Enter your store name"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Description
              </label>
              <textarea
                name="description"
                value={formFields.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Describe your store and what you offer..."
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type *
              </label>
              <select
                name="business_type"
                value={formFields.business_type}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                name="contact_email"
                value={formFields.contact_email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="contact@yourstore.com"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="contact_phone"
                value={formFields.contact_phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="+95 123 456 789"
              />
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Registration Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Registration Number
              </label>
              <input
                type="text"
                name="business_registration_number"
                value={formFields.business_registration_number}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Registration number"
              />
            </div>

            {/* Tax ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                name="tax_id"
                value={formFields.tax_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Tax identification number"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formFields.website}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="https://yourstore.com"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                name="account_number"
                value={formFields.account_number}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Bank account number"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                name="address"
                value={formFields.address}
                onChange={handleInputChange}
                required
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Full street address"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formFields.city}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="City"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Region *
              </label>
              <input
                type="text"
                name="state"
                value={formFields.state}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="State or region"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country *
              </label>
              <input
                type="text"
                name="country"
                value={formFields.country}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Country"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                value={formFields.postal_code}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="Postal code"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Facebook */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook
              </label>
              <input
                type="url"
                name="social_facebook"
                value={formFields.social_facebook}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="url"
                name="social_instagram"
                value={formFields.social_instagram}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter
              </label>
              <input
                type="url"
                name="social_twitter"
                value={formFields.social_twitter}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                placeholder="https://twitter.com/yourprofile"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreUpdateForm;