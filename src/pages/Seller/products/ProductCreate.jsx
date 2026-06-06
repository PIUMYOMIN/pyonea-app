// pages/seller/ProductCreate.jsx
import React from "react";
import ProductForm from "./ProductForm";
import { useNavigate } from "react-router-dom";

const SellerProductCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/seller/dashboard");
  };

  const handleCancel = () => {
    navigate("/seller/dashboard");
  };

  return <ProductForm onSuccess={handleSuccess} onCancel={handleCancel} />;
};

export default SellerProductCreate;