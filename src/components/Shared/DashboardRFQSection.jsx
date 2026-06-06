import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon,
  InboxIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import RFQPanel from "../client/RFQPanel";

/** Normalize paginated or plain list from /rfq/* responses */
export const normalizeRfqList = (res) => res.data?.data?.data ?? res.data?.data ?? [];

/**
 * Same role resolution as RFQManager: admin sees both sent & received tabs.
 */
export const resolveDashboardRfqRole = (isAdmin, isSeller) => {
  if (typeof isAdmin === "function" && isAdmin()) return "admin";
  if (typeof isSeller === "function" && isSeller()) return "seller";
  return "buyer";
};

/**
 * Badge count for a fixed dashboard context (buyer dashboard vs seller dashboard),
 * independent of other roles the user may also have.
 */
export async function fetchRfqDashboardTabBadgeForRole(role) {
  try {
    if (role === "buyer") {
      const res = await api.get("/rfq/sent");
      return normalizeRfqList(res).filter((r) => r.status === "quoted").length;
    }
    if (role === "seller") {
      const res = await api.get("/rfq/received");
      return normalizeRfqList(res).filter((r) => r.status === "open" && !r.my_quote).length;
    }
    const [sent, rec] = await Promise.allSettled([
      api.get("/rfq/sent"),
      api.get("/rfq/received"),
    ]);
    let n = 0;
    if (sent.status === "fulfilled") {
      n += normalizeRfqList(sent.value).filter((r) => r.status === "quoted").length;
    }
    if (rec.status === "fulfilled") {
      n += normalizeRfqList(rec.value).filter((r) => r.status === "open" && !r.my_quote).length;
    }
    return n;
  } catch {
    return 0;
  }
}

/** Infer role from auth (admin sees combined actionable count). */
export async function fetchRfqDashboardTabBadge(isAdmin, isSeller) {
  return fetchRfqDashboardTabBadgeForRole(resolveDashboardRfqRole(isAdmin, isSeller));
}

function RfqHubCompact({ role }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === "seller") {
        const res = await api.get("/rfq/received");
        setReceived(normalizeRfqList(res));
        setSent([]);
        return;
      }
      const [sRes, rRes] = await Promise.all([
        api.get("/rfq/sent"),
        api.get("/rfq/received"),
      ]);
      setSent(normalizeRfqList(sRes));
      setReceived(normalizeRfqList(rRes));
    } catch (e) {
      setError(e.response?.data?.message || t("rfq.errors.load_failed"));
      setSent([]);
      setReceived([]);
    } finally {
      setLoading(false);
    }
  }, [role, t]);

  useEffect(() => {
    load();
  }, [load]);

  const sentQuoted = useMemo(
    () => sent.filter((r) => r.status === "quoted").length,
    [sent]
  );
  const inboxAction = useMemo(
    () => received.filter((r) => r.status === "open" && !r.my_quote).length,
    [received]
  );

  const previewReceived = useMemo(() => received.slice(0, 4), [received]);
  const previewSent = useMemo(() => sent.slice(0, 3), [sent]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t("rfq.dashboard.title", "Request for quote")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {role === "admin"
              ? t("rfq.dashboard.subtitle_admin", "Review buyer RFQs and seller inbox from one place.")
              : t("rfq.dashboard.subtitle_seller", "Quotes buyers sent to your store — respond or open the full RFQ center.")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("rfq.toolbar.refresh", "Refresh")}
          </button>
          <Link
            to="/rfq"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            {t("rfq.dashboard.open_center", "Open RFQ center")}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {role === "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {t("rfq.tabs.sent", "Sent")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{sent.length}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {sentQuoted} {t("rfq.dashboard.awaiting_decision", "awaiting your decision")}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <InboxIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {t("rfq.tabs.received", "Received")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{received.length}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {inboxAction} {t("rfq.dashboard.need_response", "need a response")}
              </p>
            </div>
          </div>
        </div>
      )}

      {role === "seller" && (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <InboxIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {t("rfq.tabs.received", "Inbox")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{received.length}</p>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-300">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{inboxAction}</span>{" "}
            {t("rfq.dashboard.open_requests", "open requests need your quote")}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {previewReceived.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                {t("rfq.dashboard.recent_inbox", "Recent inbox")}
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-slate-700 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                {previewReceived.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/rfq"
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                          {r.product_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {r.rfq_number} · {r.status}
                          {r.buyer?.name ? ` · ${r.buyer.name}` : ""}
                        </p>
                      </div>
                      <ChevronHint />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {role === "admin" && previewSent.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                {t("rfq.dashboard.recent_sent", "Recent sent (as admin)")}
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-slate-700 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                {previewSent.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/rfq"
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                          {r.product_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {r.rfq_number} · {r.status}
                        </p>
                      </div>
                      <ChevronHint />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && role === "seller" && previewReceived.length === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
              {t("rfq.empty.received.sub", "RFQs from buyers will appear here when buyers reach out.")}
            </p>
          )}
          {!loading && role === "admin" && previewReceived.length === 0 && previewSent.length === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-8">
              {t("rfq.dashboard.empty_admin", "No RFQs yet. Open the RFQ center to create or review requests.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronHint() {
  return (
    <span className="text-gray-300 dark:text-slate-600 shrink-0">
      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
    </span>
  );
}

/**
 * Role-based RFQ block for dashboards: full buyer panel, compact hub + link for seller/admin.
 *
 * @param {('buyer'|'seller'|'admin'|undefined)} role — omit to infer from auth (admin &gt; seller &gt; buyer).
 */
const DashboardRFQSection = ({ role: roleProp }) => {
  const { isAdmin, isSeller } = useAuth();
  const effective = roleProp || resolveDashboardRfqRole(isAdmin, isSeller);

  if (effective === "buyer") {
    return <RFQPanel />;
  }

  return <RfqHubCompact role={effective} />;
};

export default DashboardRFQSection;
