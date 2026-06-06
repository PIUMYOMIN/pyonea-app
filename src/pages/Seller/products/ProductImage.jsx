// src/components/ProductImageUpload.jsx
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PhotoIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

const ProductImage = ({ images = [], onImagesChange, onAnglesChange }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadedImages, setUploadedImages] = useState(images);
  const [angles, setAngles] = useState(Array(images.length).fill('front'));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      angle: 'front'
    }));

    const updatedImages = [...uploadedImages, ...newImages];
    setUploadedImages(updatedImages);
    
    const newAngles = [...angles, ...newImages.map(() => 'front')];
    setAngles(newAngles);
    
    onImagesChange(updatedImages);
    onAnglesChange(newAngles);
  };

  const removeImage = (index) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index);
    const updatedAngles = angles.filter((_, i) => i !== index);
    
    setUploadedImages(updatedImages);
    setAngles(updatedAngles);
    
    onImagesChange(updatedImages);
    onAnglesChange(updatedAngles);
  };

  const updateAngle = (index, newAngle) => {
    const updatedAngles = [...angles];
    updatedAngles[index] = newAngle;
    setAngles(updatedAngles);
    onAnglesChange(updatedAngles);
  };

  const setPrimaryImage = (index) => {
    const updatedImages = [...uploadedImages];
    // Move the selected image to the first position
    const [primaryImage] = updatedImages.splice(index, 1);
    updatedImages.unshift(primaryImage);
    
    const updatedAngles = [...angles];
    const [primaryAngle] = updatedAngles.splice(index, 1);
    updatedAngles.unshift(primaryAngle);
    
    setUploadedImages(updatedImages);
    setAngles(updatedAngles);
    
    onImagesChange(updatedImages);
    onAnglesChange(updatedAngles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {t('productForm.images')}
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PhotoIcon className="h-5 w-5 mr-2" />
          {t('productForm.addImages')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {uploadedImages.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={image.preview || image.url}
              alt={`Product view ${index + 1}`}
              className="h-32 w-full object-cover rounded-lg"
            />
            
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setPrimaryImage(index)}
                className="p-1 bg-white rounded-full text-green-600 hover:bg-green-50"
                title="Set as primary"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </button>
              
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="p-1 bg-white rounded-full text-red-600 hover:bg-red-50"
                title="Remove image"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            {index === 0 && (
              <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                Primary
              </span>
            )}
            
            <select
              value={angles[index] || 'front'}
              onChange={(e) => updateAngle(index, e.target.value)}
              className="mt-2 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="front">Front View</option>
              <option value="back">Back View</option>
              <option value="left">Left Side</option>
              <option value="right">Right Side</option>
              <option value="top">Top View</option>
              <option value="bottom">Bottom View</option>
              <option value="other">Other</option>
            </select>
          </div>
        ))}
      </div>

      {uploadedImages.length === 0 && (
        <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                <span>{t('productForm.uploadImages')}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 2MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImage;