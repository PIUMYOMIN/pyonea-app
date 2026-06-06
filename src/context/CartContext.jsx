// src/context/CartContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    shipping_fee: 0,
    tax_rate: 0.05,
    tax: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart from server
  const fetchCartItems = useCallback(async () => {
    if (!user || (user.type && user.type !== 'buyer')) {
      resetCart();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/buyer/cart');
      const cartData = response.data.data || {};
      setCartItems(cartData.cart_items || []);
      setSubtotal(cartData.subtotal || 0);
      setTotalItems(cartData.total_items || 0);
      setCartSummary(cartData.summary || {
        subtotal: 0, shipping_fee: 5000, tax_rate: 0.05, tax: 0, total: 0,
      });
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      setError(err.response?.data?.message || 'Failed to fetch cart');
      resetCart();
    } finally {
      setLoading(false);
    }
  }, [user]);

  const resetCart = () => {
    setCartItems([]);
    setSubtotal(0);
    setTotalItems(0);
    setCartSummary({ subtotal: 0, shipping_fee: 0, tax_rate: 0.05, tax: 0, total: 0 });
  };

  /**
   * Add a product to cart.
   *
   * @param {number}  productId       — required
   * @param {number}  quantity        — defaults to 1
   * @param {number|null} variantId   — required when the product has variants
   * @param {object}  selectedOptions — snapshot e.g. { "Color": "Red", "Size": "M" }
   */
  const addToCart = useCallback(async (productId, quantity = 1, variantId = null, selectedOptions = null) => {
    if (!user) throw new Error('Please login');

    setLoading(true);
    setError(null);

    try {
      const payload = { product_id: productId, quantity };

      if (variantId) payload.variant_id = variantId;
      if (selectedOptions && Object.keys(selectedOptions).length > 0) {
        payload.selected_options = selectedOptions;
      }

      const response = await api.post('/buyer/cart', payload);

      // Refresh cart to get accurate data
      await fetchCartItems();

      return {
        success: true,
        message: response.data.message || 'Added to cart',
      };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add to cart';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCartItems]);

  // Update quantity
  const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
    if (!user) throw new Error('Please login');

    const currentItem = cartItems.find(item => item.id === cartItemId);
    if (!currentItem) return;

    const oldCartItems = [...cartItems];
    const oldTotalItems = totalItems;
    const oldSubtotal = subtotal;

    // Optimistic update: use the item's current selling_price for the subtotal.
    // Note: crossing a tier boundary changes selling_price server-side, so we
    // always re-fetch after the PUT succeeds to keep the UI in sync.
    const updatedItems = cartItems.map(item =>
      item.id === cartItemId
        ? { ...item, quantity: newQuantity, subtotal: (item.selling_price ?? item.price) * newQuantity }
        : item
    );

    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const newTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

    setCartItems(updatedItems);
    setSubtotal(newSubtotal);
    setTotalItems(newTotalItems);
    setCartSummary(prev => {
      const rate     = prev.tax_rate ?? 0.05;
      const shipping = prev.shipping_fee ?? 8000;
      const tax      = Math.round(newSubtotal * rate * 100) / 100;
      return { ...prev, subtotal: newSubtotal, tax, total: Math.round((newSubtotal + shipping + tax) * 100) / 100 };
    });

    try {
      const response = await api.put(`/buyer/cart/${cartItemId}`, { quantity: newQuantity });
      // Always re-fetch: the server may have applied a different tier price after
      // the quantity change, which would make the optimistic subtotal stale.
      await fetchCartItems();
      return response.data;
    } catch (err) {
      setCartItems(oldCartItems);
      setSubtotal(oldSubtotal);
      setTotalItems(oldTotalItems);
      await fetchCartItems();

      const msg = err.response?.data?.message || 'Failed to update quantity';
      setError(msg);
      throw new Error(msg);
    }
  }, [user, cartItems, totalItems, subtotal, fetchCartItems]);

  // Remove from cart
  const removeFromCart = useCallback(async (cartItemId) => {
    if (!user) throw new Error('Please login');

    const currentItem = cartItems.find(item => item.id === cartItemId);
    if (!currentItem) return;

    const oldCartItems = [...cartItems];
    const oldTotalItems = totalItems;
    const oldSubtotal = subtotal;

    const updatedItems = cartItems.filter(item => item.id !== cartItemId);
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const newTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

    setCartItems(updatedItems);
    setSubtotal(newSubtotal);
    setTotalItems(newTotalItems);
    setCartSummary(prev => {
      const rate     = prev.tax_rate ?? 0.05;
      const shipping = prev.shipping_fee ?? 8000;
      const tax      = Math.round(newSubtotal * rate * 100) / 100;
      return { ...prev, subtotal: newSubtotal, tax, total: Math.round((newSubtotal + shipping + tax) * 100) / 100 };
    });

    try {
      const response = await api.delete(`/buyer/cart/${cartItemId}`);
      return response.data;
    } catch (err) {
      setCartItems(oldCartItems);
      setSubtotal(oldSubtotal);
      setTotalItems(oldTotalItems);
      await fetchCartItems();

      const msg = err.response?.data?.message || 'Failed to remove item';
      setError(msg);
      throw new Error(msg);
    }
  }, [user, cartItems, totalItems, subtotal, fetchCartItems]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!user) throw new Error('Please login');

    const oldCartItems = [...cartItems];
    const oldTotalItems = totalItems;
    const oldSubtotal = subtotal;
    const oldCartSummary = { ...cartSummary };

    setCartItems([]);
    setTotalItems(0);
    setSubtotal(0);
    setCartSummary({ subtotal: 0, shipping_fee: 0, tax_rate: 0.05, tax: 0, total: 0 });

    try {
      const response = await api.post('/buyer/cart/clear');
      return response.data;
    } catch (err) {
      setCartItems(oldCartItems);
      setTotalItems(oldTotalItems);
      setSubtotal(oldSubtotal);
      setCartSummary(oldCartSummary);
      await fetchCartItems();

      const msg = err.response?.data?.message || 'Failed to clear cart';
      setError(msg);
      throw new Error(msg);
    }
  }, [user, cartItems, totalItems, subtotal, cartSummary, fetchCartItems]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  const value = useMemo(() => ({
    cartItems,
    cartSummary,
    subtotal,
    totalItems,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refetchCart: fetchCartItems,
  }), [
    cartItems, cartSummary, subtotal, totalItems, loading, error,
    addToCart, updateQuantity, removeFromCart, clearCart, fetchCartItems,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};