import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProductImageBrandPlaceholder } from "@/components/ui/product-image-brand-placeholder";
import { getThumbUrl } from "@/utils/image-thumbs";

function ChevronLeftIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function XMarkIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function useTouchSwipe({ onSwipedLeft, onSwipedRight }) {
  const touchStartRef = useRef(null);

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (event) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (deltaX < 0) {
        onSwipedLeft?.();
      } else {
        onSwipedRight?.();
      }
    },
  };
}

const normalizeImages = (images = []) =>
  (Array.isArray(images) ? images : [])
    .map((img) => (typeof img === "string" ? img : img?.url || img?.path || img))
    .filter(Boolean);

const clampIndex = (idx, len) => {
  if (len <= 0) return 0;
  const m = idx % len;
  return m < 0 ? m + len : m;
};

const ProductImageGallery = ({
  images,
  getImageUrl,
  alt = "Product image",
  initialIndex = 0,
  onIndexChange,
  priority = true,
  autoplay = false,
  autoplayDelayMs = 2500,
  className = "",
}) => {
  const normalized = useMemo(() => normalizeImages(images), [images]);
  const total = normalized.length;

  const [active, setActive] = useState(() => clampIndex(initialIndex, total));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pauseAutoplay, setPauseAutoplay] = useState(false);
  const [mainLoaded, setMainLoaded] = useState(false);
  const [mainFailed, setMainFailed] = useState(false);
  const mainImgRef = useRef(null);
  const thumbRowRef = useRef(null);

  useEffect(() => {
    setActive(clampIndex(initialIndex, total));
  }, [initialIndex, total]);

  useEffect(() => {
    if (!total) return;
    onIndexChange?.(active);
  }, [active, total, onIndexChange]);

  const go = useCallback(
    (nextIdx) => {
      if (!total) return;
      const idx = clampIndex(nextIdx, total);
      setActive(idx);

      // Keep active thumb visible
      const row = thumbRowRef.current;
      const el = row?.querySelector?.(`[data-thumb-idx="${idx}"]`);
      if (row && el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    },
    [total]
  );

  const next = useCallback(() => go(active + 1), [go, active]);
  const prev = useCallback(() => go(active - 1), [go, active]);

  const swipeHandlers = useTouchSwipe({
    onSwipedLeft: () => next(),
    onSwipedRight: () => prev(),
  });

  // Lightbox keyboard controls
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, next, prev]);

  const activeSrc = total ? getImageUrl(normalized[active]) : null;
  const mainSrc = activeSrc ? getThumbUrl(activeSrc, 800) : null;
  const lightboxSrc = activeSrc;

  useEffect(() => {
    setMainLoaded(false);
    setMainFailed(false);
  }, [mainSrc]);

  useEffect(() => {
    const img = mainImgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setMainLoaded(true);
      setMainFailed(false);
      return;
    }

    const id = window.requestAnimationFrame(() => {
      if (img.complete && img.naturalWidth > 0) {
        setMainLoaded(true);
        setMainFailed(false);
      }
    });

    return () => window.cancelAnimationFrame(id);
  }, [mainSrc]);

  // Autoplay (carousel): advances every `autoplayDelayMs`, pauses on hover/touch and in lightbox
  useEffect(() => {
    if (!autoplay) return;
    if (total <= 1) return;
    if (lightboxOpen) return;
    if (pauseAutoplay) return;

    const delay = Math.max(800, Number(autoplayDelayMs) || 2500);
    const id = window.setInterval(() => {
      setActive((prev) => {
        const nextIdx = clampIndex(prev + 1, total);
        return nextIdx;
      });
    }, delay);

    return () => window.clearInterval(id);
  }, [autoplay, autoplayDelayMs, total, lightboxOpen, pauseAutoplay]);

  return (
    <div className={className}>
      <style>{`
        @keyframes pdFadeSlideIn {
          from { transform: translateX(10px); }
          to   { transform: translateX(0); }
        }
      `}</style>
      {/* Main image */}
      <div
        onMouseEnter={() => setPauseAutoplay(true)}
        onMouseLeave={() => setPauseAutoplay(false)}
        onTouchStart={(event) => {
          swipeHandlers.onTouchStart(event);
          setPauseAutoplay(true);
        }}
        onTouchEnd={(event) => {
          swipeHandlers.onTouchEnd(event);
          setPauseAutoplay(false);
        }}
        className="relative bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden
                   aspect-square sm:aspect-[4/3] lg:aspect-[5/4]
                   select-none"
      >
        {(!activeSrc || !mainLoaded || mainFailed) ? (
          <ProductImageBrandPlaceholder size="lg" />
        ) : null}

        {activeSrc ? (
          <img
            ref={mainImgRef}
            key={activeSrc}
            src={mainSrc}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-contain bg-gray-50 dark:bg-slate-800 transition-opacity duration-300 ease-out ${
              mainLoaded && !mainFailed ? "opacity-100" : "opacity-0"
            }`}
            style={{ animation: "pdFadeSlideIn 450ms ease-out" }}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            onLoad={() => {
              setMainLoaded(true);
              setMainFailed(false);
            }}
            onError={() => {
              setMainLoaded(false);
              setMainFailed(true);
            }}
            onClick={() => setLightboxOpen(true)}
          />
        ) : null}

        {/* Desktop arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2
                         h-10 w-10 items-center justify-center rounded-full
                         bg-black/35 hover:bg-black/55 text-white
                         backdrop-blur-sm transition-colors"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2
                         h-10 w-10 items-center justify-center rounded-full
                         bg-black/35 hover:bg-black/55 text-white
                         backdrop-blur-sm transition-colors"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Mobile hint + counter */}
        {total > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-[11px] font-medium text-white
                             bg-black/45 backdrop-blur-sm">
              {active + 1}/{total}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div
          ref={thumbRowRef}
          className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          {normalized.map((img, idx) => {
            const src = getImageUrl(img);
            const thumbSrc = getThumbUrl(src, 160);
            const selected = idx === active;
            return (
              <button
                key={`${img}-${idx}`}
                type="button"
                data-thumb-idx={idx}
                onClick={() => go(idx)}
                className={`relative flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16 lg:h-18 lg:w-18 rounded-lg overflow-hidden
                            border-2 transition-colors ${
                              selected
                                ? "border-green-500"
                                : "border-transparent hover:border-gray-300 dark:hover:border-slate-600"
                            }`}
                aria-label={`View image ${idx + 1}`}
              >
                <img
                  src={thumbSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover bg-gray-100 dark:bg-slate-700"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && total > 0 && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0 z-0 cursor-zoom-out"
            onClick={() => setLightboxOpen(false)}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]
                       z-30 flex h-11 w-11 items-center justify-center rounded-full
                       border border-white/20 bg-black/45 text-white shadow-lg
                       backdrop-blur-md transition-colors hover:bg-black/65
                       focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 rounded-full bg-black/45 px-2 py-1 text-xs text-white backdrop-blur-md">
            {active + 1} / {total}
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <img
              key={`lb-${activeSrc}`}
              src={lightboxSrc}
              alt={alt}
              className="max-h-[88vh] max-w-[95vw] object-contain"
              style={{ animation: "pdFadeSlideIn 450ms ease-out" }}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 sm:left-6 top-1/2 z-30 -translate-y-1/2
                           h-11 w-11 sm:h-12 sm:w-12 rounded-full
                           bg-white/10 hover:bg-white/20 text-white
                           flex items-center justify-center transition-colors"
              >
                <ChevronLeftIcon className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 sm:right-6 top-1/2 z-30 -translate-y-1/2
                           h-11 w-11 sm:h-12 sm:w-12 rounded-full
                           bg-white/10 hover:bg-white/20 text-white
                           flex items-center justify-center transition-colors"
              >
                <ChevronRightIcon className="h-7 w-7" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
