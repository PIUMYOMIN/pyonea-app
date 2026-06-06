import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RootRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(
    () => {
      if (user) {
        // Redirect based on user role
        switch (user.role) {
          case "admin":
            navigate("/admin");
            break;
          case "buyer":
            navigate("/products");
            break;
          case "seller":
            navigate("/seller");
            break;
          default:
            navigate("/");
        }
      } else {
        // If not authenticated, stay on home page
        navigate("/");
      }
    },
    [user, navigate]
  );

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500" />
    </div>
  );
};

export default RootRedirect;
