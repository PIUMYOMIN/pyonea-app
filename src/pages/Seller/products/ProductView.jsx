import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [stats, setStats] = useState({
    views: 0,
    orders: 0,
    revenue: 0,
    rating: 0
  });

  useEffect(() => {
    fetchProduct();
    fetchProductStats();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const baseEndpoint = user?.roles?.includes('admin') ? '/admin' : '/seller';
      const response = await api.get(`${baseEndpoint}/products/${id}`);
      setProduct(response.data.data.product);
    } catch (err) {
      setError(t('seller.products.fetch_error'));
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductStats = async () => {
    try {
      // In a real app, you'd fetch these from an API endpoint
      // For now, we'll use mock data
      setStats({
        views: 1245,
        orders: 67,
        revenue: 1256000,
        rating: 4.2
      });
    } catch (err) {
      console.error('Error fetching product stats:', err);
    }
  };

  const handleStatusToggle = async () => {
    try {
      const baseEndpoint = user?.roles?.includes('admin') ? '/admin' : '/seller';
      await api.put(`${baseEndpoint}/products/${id}`, {
        is_active: !product.is_active
      });
      setProduct(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      setError(t('seller.products.update_error'));
      console.error('Error updating product status:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('seller.products.delete_confirm'))) {
      try {
        const baseEndpoint = user?.roles?.includes('admin') ? '/admin' : '/seller';
        await api.delete(`${baseEndpoint}/products/${id}`);
        navigate('/seller-dashboard?tab=products');
      } catch (err) {
        setError(t('seller.products.delete_error'));
        console.error('Error deleting product:', err);
      }
    }
  };

  const handleEdit = () => {
    navigate(`/seller/products/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('seller.products.not_found')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/seller-dashboard?tab=products')}
          className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
        <div className="ml-auto flex space-x-2">
          <button
            onClick={handleStatusToggle}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              product.is_active
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {product.is_active ? t('seller.products.deactivate') : t('seller.products.activate')}
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 flex items-center"
          >
            <PencilIcon className="h-4 w-4 mr-1" />
            {t('common.edit')}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 flex items-center"
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              product.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {product.is_active ? t('seller.products.active') : t('seller.products.inactive')}
          </span>
          <div className="text-sm text-gray-500">
            {t('seller.products.last_updated')}: {new Date(product.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-blue-100 mr-3">
              <EyeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('seller.products.views')}</p>
              <p className="text-xl font-semibold">{stats.views.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-green-100 mr-3">
              <ShoppingCartIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('seller.products.orders')}</p>
              <p className="text-xl font-semibold">{stats.orders.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-purple-100 mr-3">
              <ChartBarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('seller.products.revenue')}</p>
              <p className="text-xl font-semibold">{stats.revenue.toLocaleString()} MMK</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-yellow-100 mr-3">
              <StarIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('seller.products.rating')}</p>
              <p className="text-xl font-semibold">{stats.rating}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'details'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('seller.products.details')}
            </button>
            <button
              onClick={() => setActiveTab('specifications')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'specifications'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('seller.products.specifications')}
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'performance'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('seller.products.performance')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {t('seller.products.basic_info')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.name_en')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.name}</p>
                  </div>
                  {product.name_mm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('seller.products.name_mm')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">{product.name_mm}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.description')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.category')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.category?.name}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {t('seller.products.pricing_inventory')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.price')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.price} MMK</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.quantity')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.quantity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.min_order')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.min_order || 1}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {t('seller.products.lead_time')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{product.lead_time || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {t('seller.products.specifications')}
              </h3>
              {product.specifications && Object.keys(product.specifications).length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <span className="text-gray-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">{t('seller.products.no_specifications')}</p>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {t('seller.products.performance')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">
                    {t('seller.products.sales_data')}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.total_orders')}</span>
                      <span className="font-medium">{stats.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.total_revenue')}</span>
                      <span className="font-medium">{stats.revenue.toLocaleString()} MMK</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.avg_order_value')}</span>
                      <span className="font-medium">
                        {stats.orders > 0 ? (stats.revenue / stats.orders).toLocaleString() : 0} MMK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">
                    {t('seller.products.engagement')}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.views')}</span>
                      <span className="font-medium">{stats.views.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.conversion_rate')}</span>
                      <span className="font-medium">
                        {stats.views > 0 ? ((stats.orders / stats.views) * 100).toFixed(2) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('seller.products.rating')}</span>
                      <span className="font-medium">{stats.rating}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          {t('seller.products.quick_actions')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/products/${id}`)}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
            {t('seller.products.view_public_page')}
          </button>
          <button
            onClick={handleStatusToggle}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {product.is_active ? (
              <>
                <span className="h-5 w-5 text-yellow-600 mr-2">⏸️</span>
                {t('seller.products.pause_listing')}
              </>
            ) : (
              <>
                <span className="h-5 w-5 text-green-600 mr-2">▶️</span>
                {t('seller.products.activate_listing')}
              </>
            )}
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center justify-center p-4 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <PencilIcon className="h-5 w-5 text-indigo-600 mr-2" />
            {t('seller.products.edit_details')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductView;