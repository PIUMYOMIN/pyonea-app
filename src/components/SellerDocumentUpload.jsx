// src/components/SellerDocumentUpload.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';

const SellerDocumentUpload = ({ sellerId, onUploadComplete }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDocumentStatus();
  }, [sellerId]);

  const fetchDocumentStatus = async () => {
    try {
      const response = await api.get('/seller/documents/status');
      setDocuments(response.data.data.documents || []);
      setUploadStatus(response.data.data.upload_status || {});
    } catch (error) {
      console.error('Failed to fetch document status:', error);
    }
  };

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [documentType]: true }));
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('document_name', file.name);

    try {
      const response = await api.post('/seller/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `${documentType.replace('_', ' ')} uploaded successfully`
        });
        fetchDocumentStatus();
        if (onUploadComplete) onUploadComplete();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to upload document'
      });
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleSubmitForVerification = async () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/seller/documents/submit-verification');
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Documents submitted for verification successfully!'
        });
        fetchDocumentStatus();
      }
    } catch (error) {
      console.error('Submission failed:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit for verification'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDocumentIcon = (documentType) => {
    switch (documentType) {
      case 'identity_front':
      case 'identity_back':
        return '🆔';
      case 'business_registration':
        return '🏢';
      case 'tax_registration':
        return '💼';
      default:
        return '📄';
    }
  };

  const renderUploadProgress = () => {
    if (!uploadStatus.percentage) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">Document Upload Progress</h3>
          <span className="text-sm font-medium text-green-600">
            {uploadStatus.uploaded} of {uploadStatus.required} documents uploaded
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadStatus.percentage}%` }}
          ></div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {uploadStatus.complete 
            ? 'All required documents uploaded. Ready to submit for verification.' 
            : 'Please upload all required documents to proceed.'}
        </p>
      </div>
    );
  };

  const renderDocumentCard = (doc) => {
    return (
      <div
        key={doc.type}
        className={`p-4 rounded-xl border ${
          doc.uploaded
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{getDocumentIcon(doc.type)}</div>
            <div>
              <h4 className="font-medium text-gray-900">{doc.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>Max: {doc.max_size_mb}MB</span>
                <span>Formats: {doc.accept}</span>
                {doc.required && (
                  <span className="text-red-600 font-medium">Required</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            {doc.uploaded ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Uploaded</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-600">
                <ExclamationCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Pending</span>
              </div>
            )}

            {!doc.uploaded && (
              <label className="cursor-pointer">
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  <DocumentArrowUpIcon className="h-4 w-4" />
                  <span className="text-sm">Upload</span>
                </div>
                <input
                  type="file"
                  accept={doc.accept}
                  onChange={(e) => handleFileUpload(e.target.files[0], doc.type)}
                  className="hidden"
                  disabled={uploading[doc.type]}
                />
              </label>
            )}

            {doc.uploaded && doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                <span>View</span>
              </a>
            )}
          </div>
        </div>

        {uploading[doc.type] && (
          <div className="mt-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
              <span>Uploading...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdditionalDocuments = () => {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Documents (Optional)</h3>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
              input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                  await handleFileUpload(file, 'additional');
                }
              };
              input.click();
            }}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            <span>Add More</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          You can upload additional documents like bank statements, utility bills, or other supporting documents.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {renderUploadProgress()}

      <div className="space-y-4">
        {documents.map(renderDocumentCard)}
      </div>

      {renderAdditionalDocuments()}

      <div className="pt-6 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <ClockIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Verification Process</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• Upload all required documents</li>
                <li>• Submit for verification</li>
                <li>• Our team will review within 2-3 business days</li>
                <li>• You'll receive an email notification once verified</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitForVerification}
            disabled={!uploadStatus.complete || submitting}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium ${
              uploadStatus.complete && !submitting
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <DocumentCheckIcon className="h-5 w-5" />
                <span>Submit for Verification</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerDocumentUpload;