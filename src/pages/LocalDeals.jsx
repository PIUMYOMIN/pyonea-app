import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon, MapPinIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';
import useSEO from '../hooks/useSEO';

const PER_PAGE = 12;

const formatMmk = (n) => {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (Number.isNaN(num)) return null;
  return new Intl.NumberFormat('en-MM').format(num) + ' MMK';
};

const LocalDeals = () => {
  const { t, i18n } = useTranslation();
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deals, setDeals] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [copied, setCopied] = useState(false);

  const regions = useMemo(
    () => [
      { id: 'all', labelKey: 'localDeals.regions.all' },
      { id: 'yangon', labelKey: 'localDeals.regions.yangon' },
      { id: 'mandalay', labelKey: 'localDeals.regions.mandalay' },
      { id: 'naypyidaw', labelKey: 'localDeals.regions.naypyidaw' },
      { id: 'ayeyarwady', labelKey: 'localDeals.regions.ayeyarwady' },
      { id: 'shan', labelKey: 'localDeals.regions.shan' },
      { id: 'other', labelKey: 'localDeals.regions.other' },
    ],
    []
  );

  const ogImage =
    typeof window !== 'undefined' ? `${window.location.origin}/og-image.png` : '/og-image.png';

  const SeoComponent = useSEO({
    title: t('seo.local_deals.title'),
    description: t('seo.local_deals.description'),
    image: ogImage,
    url: '/local-deals',
  });

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const fetchDeals = useCallback(
    async (pageNum, append) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          per_page: String(PER_PAGE),
          page: String(pageNum),
          region: activeRegion,
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        const res = await api.get(`/local-deals?${params.toString()}`);
        if (!res.data?.success) {
          throw new Error(res.data?.message || 'Request failed');
        }
        const rows = Array.isArray(res.data.data) ? res.data.data : [];
        const m = res.data.meta || {};
        setMeta({
          last_page: m.last_page ?? 1,
          total: m.total ?? rows.length,
        });
        setDeals((prev) => (append ? [...prev, ...rows] : rows));
      } catch (e) {
        setError(t('localDeals.load_error'));
        if (!append) setDeals([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeRegion, debouncedSearch, t]
  );

  useEffect(() => {
    setPage(1);
  }, [activeRegion, debouncedSearch]);

  useEffect(() => {
    fetchDeals(1, false);
  }, [activeRegion, debouncedSearch, fetchDeals]);

  const loadMore = () => {
    if (loading || loadingMore || page >= meta.last_page) return;
    const next = page + 1;
    setPage(next);
    fetchDeals(next, true);
  };

  const discountLabel = (deal) => {
    if (deal.type === 'percentage') return `${deal.value}% ${t('localDeals.off')}`;
    return `${formatMmk(deal.value) || deal.value} ${t('localDeals.off')}`;
  };

  const regionBadgeLabel = (deal) => {
    if (deal.region_key) return t(`localDeals.regions.${deal.region_key}`);
    const st = deal.seller?.state;
    return st || t('localDeals.regions.other');
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const openDeal = (deal) => {
    setSelectedDeal(deal);
    setCopied(false);
  };

  const expiryLabel = (iso) => {
    if (!iso) return t('localDeals.no_expiry');
    try {
      return new Date(iso).toLocaleDateString(i18n.language === 'my' ? 'my' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-slate-100">
          {t('localDeals.title')}
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">{t('localDeals.subtitle')}</p>

        {error && (
          <div
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <label htmlFor="local-deals-search" className="sr-only">
                {t('localDeals.search_label')}
              </label>
              <input
                id="local-deals-search"
                type="search"
                placeholder={t('localDeals.search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 lg:flex-wrap lg:justify-end">
              {regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setActiveRegion(region.id)}
                  className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeRegion === region.id
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {t(region.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="h-24 bg-gray-200 dark:bg-slate-600" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-full" />
                    <div className="h-10 bg-gray-200 dark:bg-slate-600 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-slate-400">{t('localDeals.empty')}</p>
              <p className="text-sm text-gray-500 dark:text-slate-500 mt-2 max-w-md mx-auto">
                {t('localDeals.empty_hint')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                {t('localDeals.showing_count', { count: deals.length, total: meta.total })}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => (
                  <article
                    key={deal.id}
                    className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-slate-800/80"
                  >
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
                      <div className="flex justify-between items-start gap-2">
                        <h2 className="text-lg font-bold leading-snug">{deal.name}</h2>
                        <span className="flex-shrink-0 bg-white/95 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          {discountLabel(deal)}
                        </span>
                      </div>
                      <p className="text-green-100 text-sm mt-1">{deal.seller?.store_name}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-400 mb-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-700 px-2.5 py-0.5 text-gray-800 dark:text-slate-200">
                          <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
                          {regionBadgeLabel(deal)}
                        </span>
                        <span>
                          {t('localDeals.expires')}: {expiryLabel(deal.expires_at)}
                        </span>
                      </div>
                      {deal.min_order_amount != null && Number(deal.min_order_amount) > 0 && (
                        <p className="text-xs text-gray-500 dark:text-slate-500 mb-3">
                          {t('localDeals.min_order', { amount: formatMmk(deal.min_order_amount) })}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => openDeal(deal)}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        {t('localDeals.view_deal')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {page < meta.last_page && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-lg border border-green-600 text-green-700 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    {loadingMore ? t('localDeals.loading') : t('localDeals.load_more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-slate-100">
            {t('localDeals.about_title')}
          </h2>
          <p className="text-gray-700 dark:text-slate-300 mb-3">{t('localDeals.about_p1')}</p>
          <p className="text-gray-700 dark:text-slate-300">{t('localDeals.about_p2')}</p>
        </div>
      </div>

      {selectedDeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-modal-title"
          onClick={() => setSelectedDeal(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 id="deal-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100 pr-2">
                {selectedDeal.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label={t('localDeals.close')}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  {t('localDeals.coupon_code')}
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 rounded-lg bg-gray-100 dark:bg-slate-700 px-3 py-2 text-sm font-mono text-gray-900 dark:text-slate-100 break-all">
                    {selectedDeal.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCode(selectedDeal.code)}
                    className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    {copied ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('localDeals.copied')}</p>}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {t('localDeals.modal_hint')}
              </p>
              {selectedDeal.seller?.store_slug && (
                <Link
                  to={`/sellers/${selectedDeal.seller.store_slug}`}
                  onClick={() => setSelectedDeal(null)}
                  className="block w-full text-center py-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  {t('localDeals.visit_store')}
                </Link>
              )}
              <Link
                to="/products"
                onClick={() => setSelectedDeal(null)}
                className="block w-full text-center py-2.5 rounded-lg border border-green-600 text-green-700 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-slate-700/50"
              >
                {t('localDeals.browse_products')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LocalDeals;
