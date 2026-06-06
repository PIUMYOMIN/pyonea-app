import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import SellersManagement from "./SellersManagement";
import SellerVerificationManagement from "./SellerVerificationManagement";
import VerifiedSellerList from "./VerifiedSellerList";

const SECTIONS = [
  {
    id: "directory",
    label: "All sellers",
    shortLabel: "Directory",
    description: "Search, filter, and update store status for every seller account.",
    Icon: BuildingStorefrontIcon,
  },
  {
    id: "verification",
    label: "Verification queue",
    shortLabel: "Verification",
    description: "Review KYC documents, NRC, and approve or reject pending sellers.",
    Icon: ShieldCheckIcon,
  },
  {
    id: "verified",
    label: "Verified directory",
    shortLabel: "Verified",
    description: "Export and manage sellers who already passed verification.",
    Icon: CheckBadgeIcon,
  },
];

const isValidSection = (s) => SECTIONS.some((x) => x.id === s);

/**
 * Single admin area for seller directory, verification workflow, and verified-seller exports.
 * Only the active sub-panel is mounted so background polling runs for one view at a time.
 */
const AdminSellerCenter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState("directory");

  const syncFromUrl = useCallback(() => {
    const sp = new URLSearchParams(location.search);
    const s = sp.get("section");
    if (s && isValidSection(s)) setSection(s);
  }, [location.search]);

  useEffect(() => {
    syncFromUrl();
  }, [syncFromUrl]);

  const selectSection = (id) => {
    setSection(id);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", "sellers");
    sp.set("section", id);
    navigate({ pathname: location.pathname, search: sp.toString() }, { replace: true });
  };

  const meta = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sellers</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          Directory, document verification, and verified-seller reporting in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 p-1 rounded-2xl bg-gray-100/80 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700/80">
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${active
                  ? "bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm ring-1 ring-gray-200/90 dark:ring-slate-600"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
            >
              <s.Icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-500 -mt-2">{meta.description}</p>

      <div className="min-h-[320px]">
        {section === "directory" && <SellersManagement />}
        {section === "verification" && <SellerVerificationManagement />}
        {section === "verified" && <VerifiedSellerList />}
      </div>
    </div>
  );
};

export default AdminSellerCenter;
