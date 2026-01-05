"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function TrustSection() {
  const { t } = useI18n();
  
  const trustPoints = [
  {
    icon: (
      <svg color="#FEBE14" height="28" width="28" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.88 21.216l2.078-6.929A1.002 1.002 0 0010 13H7.766l4.8-8h6.63l-4.045 6.47a1.002 1.002 0 00.85 1.53h3.148L8.88 21.216zm14.063-9.547A.999.999 0 0022 11h-4.196l4.044-6.47A1.002 1.002 0 0021 3h-9a1 1 0 00-.858.486l-6 10A1.002 1.002 0 006 15h2.655l-2.613 8.713a.999.999 0 001.582 1.068l15-12a.999.999 0 00.32-1.112z"></path>
      </svg>
    ),
    title: t("home.trust.point1.title"),
    description: t("home.trust.point1.description"),
  },
  {
    icon: (
      <svg color="#2DB783" height="28" width="28" fill="currentColor" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.514 2.126a1 1 0 01.972 0l9 5A1 1 0 0124 8v6.027c-.061 2.289-.486 4.654-1.952 6.777-1.47 2.13-3.9 3.892-7.737 5.147a1 1 0 01-.622 0c-3.837-1.255-6.268-3.018-7.737-5.147-1.466-2.123-1.89-4.488-1.952-6.777A.99.99 0 014 14V8a1 1 0 01.514-.874l9-5zM6 8.588v5.399c.057 2.083.441 4.006 1.597 5.681 1.121 1.623 3.048 3.13 6.403 4.278 3.355-1.148 5.282-2.655 6.402-4.278 1.157-1.675 1.54-3.598 1.598-5.681V8.587l-8-4.444-8 4.444zm12.055 1.58a1 1 0 01.277 1.387l-4 6a1 1 0 01-1.387.277l-3-2a1 1 0 011.11-1.664l2.168 1.445 3.445-5.168a1 1 0 011.387-.277z" fillRule="evenodd"></path>
      </svg>
    ),
    title: t("home.trust.point2.title"),
    description: t("home.trust.point2.description"),
  },
  {
    icon: (
      <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.3813 16.2839C15.3813 17.1305 15.1569 17.9612 14.731 18.6943L14.2592 19.5046L13.7875 18.6943C13.3616 17.9612 13.1372 17.1305 13.1372 16.2839V12.4164C13.6936 11.6492 14.5249 11.3768 15.3813 11.3768V16.2839ZM18.8711 10.5007H9.64502V8.41943H18.8711V10.5007Z" fill="#009FD9"></path>
        <path d="M14.2529 2.97534C14.2547 2.97482 14.257 2.97426 14.2598 2.97339C14.2614 2.97286 14.2634 2.9722 14.2656 2.97144L14.252 2.97534H14.2529ZM14.2529 2.97534C14.2516 2.97574 14.2508 2.97708 14.25 2.97729V2.97632L5.81836 6.04077L5.79004 6.06812C5.78328 6.07782 5.77873 6.08725 5.77637 6.09448C5.77504 6.09857 5.77456 6.10123 5.77441 6.10229V15.8757C5.77441 17.847 6.89299 19.5425 8.53125 21.0964C10.1778 22.6537 12.2459 24.004 14.2441 25.4138L14.2471 25.4158C14.2484 25.4164 14.2513 25.4173 14.2559 25.4187C14.2645 25.4213 14.2763 25.4236 14.29 25.4236C14.3037 25.4236 14.3156 25.4213 14.3242 25.4187C14.3326 25.4162 14.3357 25.4145 14.334 25.4158L14.3369 25.4138C16.3372 24.0043 18.4049 22.6543 20.0488 21.0974V21.0964C21.6885 19.5456 22.8066 17.8479 22.8066 15.8757V6.09155C22.8065 6.09634 22.8073 6.09582 22.8057 6.09058C22.8039 6.08515 22.8002 6.07709 22.7939 6.06812C22.7876 6.05893 22.7799 6.05172 22.7734 6.04663C22.7687 6.04287 22.7656 6.0412 22.7646 6.04077L14.3252 2.97339C14.3224 2.97305 14.3178 2.97262 14.3115 2.97241C14.3052 2.97221 14.2978 2.97206 14.29 2.97241C14.2823 2.97276 14.2746 2.97357 14.2676 2.97437C14.2619 2.97503 14.2565 2.97473 14.2529 2.97534Z" stroke="#009FD9" strokeWidth="1.54839"></path>
      </svg>
    ),
    title: t("home.trust.point3.title"),
    description: (
      <>
        {t("home.trust.point3.description")}{" "}
        <a className="text-gray-600 underline hover:text-gray-900" href="/guarantee">
          {t("home.trust.point3.terms")}
        </a>
      </>
    ),
  },
];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [borderStyle, setBorderStyle] = useState({ top: 0, height: 0 });
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (hoveredIndex !== null && cardRefs.current[hoveredIndex]) {
      const card = cardRefs.current[hoveredIndex];
      if (card) {
        const rect = card.getBoundingClientRect();
        const containerRect = card.parentElement?.getBoundingClientRect();
        if (containerRect) {
          setBorderStyle({
            top: card.offsetTop,
            height: rect.height,
          });
        }
      }
    }
  }, [hoveredIndex]);

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t("home.trust.heading")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 text-center max-w-3xl">
            {t("home.trust.description")}
          </p>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16  max-w-6xl mx-auto">
          <div className="relative">
            {trustPoints.map((point, index) => (
              <div
                key={index}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                role="button"
                tabIndex={0}
                aria-label={`Trust module card ${point.title}`}
                className="flex gap-4 p-6 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-50"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex-shrink-0 hidden md:block">{point.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{point.title}</h3>
                  <p className="text-gray-600">{point.description}</p>
                </div>
              </div>
            ))}

            {/* Animated Border */}
            {hoveredIndex !== null && (
              <div
                className="absolute border-2 border-[hsl(var(--primary))] rounded-lg pointer-events-none transition-all duration-200"
                style={{
                  top: `${borderStyle.top}px`,
                  left: 0,
                  right: 0,
                  height: `${borderStyle.height}px`,
                }}
              />
            )}
          </div>

          {/* Image */}
          <div className="hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=800&fit=crop"
              alt="Professional service"
              className="w-3/4 h-auto rounded-2xl shadow-lg object-cover mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
