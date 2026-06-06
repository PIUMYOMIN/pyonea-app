// Optional wrapper — kept in sync with App onboarding routes + StepGuard step order.
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { resolveSellerOnboardingStep } from "../utils/sellerOnboarding";

// 3-step flow: only 1 actual onboarding page between Register and Dashboard
const STEP_ORDER = [
  "store-basic",
];

const SellerOnboardingRoute = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      if (!user.roles?.includes("seller")) {
        navigate("/");
        return;
      }

      try {
        const response = await api.get("/seller/onboarding/status");
        const status = response.data.data;

        if (status.onboarding_complete && !status.needs_onboarding) {
          navigate("/seller/dashboard", { replace: true });
          return;
        }

        const resolvedStep = await resolveSellerOnboardingStep(status);
        const currentStep = location.pathname.split("/").pop() || "";
        const expectedIndex = STEP_ORDER.indexOf(resolvedStep);
        const currentIndex = STEP_ORDER.indexOf(currentStep);

        if (currentIndex > expectedIndex && currentIndex >= 0) {
          navigate(`/seller/onboarding/${resolvedStep}`, { replace: true });
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("Seller onboarding status check failed:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, navigate, location]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Checking seller status...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default SellerOnboardingRoute;
