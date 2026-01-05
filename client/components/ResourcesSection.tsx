"use client";

import { useI18n } from "@/lib/contexts/I18nContext";

export default function ResourcesSection() {
  const { t } = useI18n();

  const resources = [
  {
    title: t("home.resources.costGuides.title"),
    description: t("home.resources.costGuides.description"),
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
    href: "/prices",
  },
  {
    title: t("home.resources.maintenanceTips.title"),
    description: t("home.resources.maintenanceTips.description"),
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop",
    href: "/maintenance",
  },
  {
    title: t("home.resources.projectGuides.title"),
    description: t("home.resources.projectGuides.description"),
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop",
    href: "/guides",
  },
];
  return (
    <div className="bg-gray-100 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col justify-center items-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            {t("home.resources.heading")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 text-center max-w-2xl">
            {t("home.resources.description1")}
            <br />
            {t("home.resources.description2")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((resource, index) => (
            <a
              key={index}
              href={resource.href}
              className="block relative overflow-hidden rounded-2xl group"
            >
              <div className="relative aspect-[3/4]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundImage: `url(${resource.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-white text-base max-w-md">
                    {resource.description}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
