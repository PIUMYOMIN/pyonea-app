import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import MyStore from "./MyStore";
import StoreProfileEditor from "./StoreProfileEditor";

/**
 * Single seller area: store overview (My Store) and full editor (former Store Profile),
 * toggled with ?tab=my-store and optional &view=edit.
 */
const SellerMyStoreSection = ({ storeData, stats, refreshData }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isEdit = searchParams.get("view") === "edit";

  const goOverview = () => {
    const next = new URLSearchParams(location.search);
    next.set("tab", "my-store");
    next.delete("view");
    next.delete("setup");
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
  };

  if (isEdit) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goOverview}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to store overview
        </button>
        <StoreProfileEditor storeData={storeData} refreshData={refreshData} />
      </div>
    );
  }

  return <MyStore storeData={storeData} stats={stats} refreshData={refreshData} />;
};

export default SellerMyStoreSection;
