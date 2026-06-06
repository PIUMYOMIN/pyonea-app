import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import ProductCard from "./ProductCard";

/**
 * Desktop-only horizontal carousel for "More from this seller".
 * WCAG 2.1 AA compliant:
 *  - Arrow button keyboard navigation (← →)
 *  - Tab through individual cards
 *  - aria-roledescription="slide" with position announcement
 *  - Instant loop-back (no reverse-scroll animation)
 *  - Visible scrollbar restored for pointer users
 */
const MoreFromSellerDesktopCarousel = ({ moreFromSeller = [] }) => {
  const rowRef        = useRef(null);
  const cardRefs      = useRef([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [canPrev, setCanPrev]       = useState(false);
  const [canNext, setCanNext]       = useState(false);

  const safeCards = useMemo(
    () => (Array.isArray(moreFromSeller) ? moreFromSeller : []),
    [moreFromSeller]
  );
  const total = safeCards.length;

  /* ── scroll-position helpers ─────────────────────────────────────── */
  const updateButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < max - 2);
  }, []);

  const scrollToCard = useCallback((idx) => {
    const card = cardRefs.current[idx];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, []);

  const scrollByPage = useCallback((dir) => {
    const el = rowRef.current;
    if (!el) return;

    const cardW      = el.clientWidth >= 640 ? 220 : 180;
    const perPage    = Math.max(1, Math.floor(el.clientWidth / cardW));
    const maxScroll  = el.scrollWidth - el.clientWidth;

    if (dir === 1 && el.scrollLeft >= maxScroll - 2) {
      el.scrollTo({ left: 0, behavior: "instant" });
    } else if (dir === -1 && el.scrollLeft <= 2) {
      el.scrollTo({ left: maxScroll, behavior: "instant" });
    } else {
      el.scrollBy({ left: dir * cardW * perPage, behavior: "smooth" });
    }
  }, []);

  /* ── keyboard handler on the carousel region ─────────────────────── */
  const handleKeyDown = useCallback((e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();

    setFocusedIdx((prev) => {
      let next = prev;
      if (e.key === "ArrowRight") next = (prev + 1) % total;
      if (e.key === "ArrowLeft")  next = (prev - 1 + total) % total;
      if (e.key === "Home")       next = 0;
      if (e.key === "End")        next = total - 1;

      cardRefs.current[next]?.focus();
      scrollToCard(next);
      return next;
    });
  }, [total, scrollToCard]);

  /* ── scroll / resize listeners ───────────────────────────────────── */
  useEffect(() => {
    updateButtons();
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [total, updateButtons]);

  if (!total) return null;

  return (
    <section
      aria-label="More from this seller"
      aria-roledescription="carousel"
      className="relative"
      onKeyDown={handleKeyDown}
    >
      {/* ── Prev button ────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Previous products"
        onClick={() => scrollByPage(-1)}
        className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10
                   h-10 w-10 rounded-full border border-gray-200 dark:border-slate-700
                   bg-white/90 dark:bg-slate-800/90 shadow-sm transition
                   text-gray-700 dark:text-slate-200
                   hover:bg-gray-50 dark:hover:bg-slate-700
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {/* ── Next button ────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Next products"
        onClick={() => scrollByPage(1)}
        className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-10
                   h-10 w-10 rounded-full border border-gray-200 dark:border-slate-700
                   bg-white/90 dark:bg-slate-800/90 shadow-sm transition
                   text-gray-700 dark:text-slate-200
                   hover:bg-gray-50 dark:hover:bg-slate-700
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>

      {/* ── Slide track ────────────────────────────────────────────── */}
      <div
        ref={rowRef}
        role="list"
        aria-label="Seller products"
        className="flex gap-4 overflow-x-auto scroll-smooth px-0 md:px-2 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {safeCards.map((p, idx) => (
          <div
            key={p.slug_en || p.id}
            ref={(el) => (cardRefs.current[idx] = el)}
            role="listitem"
            aria-roledescription="slide"
            aria-label={`${(p.name_en || p.name_mm || "Product")}, ${idx + 1} of ${total}`}
            tabIndex={focusedIdx === idx ? 0 : -1}
            onFocus={() => setFocusedIdx(idx)}
            className="w-[180px] sm:w-[220px] flex-shrink-0 rounded-lg
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            style={{ scrollSnapAlign: "start" }}
          >
            <ProductCard product={p} imagePriority={idx < 3} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MoreFromSellerDesktopCarousel;