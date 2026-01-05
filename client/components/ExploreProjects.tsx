"use client";

import { useState } from "react";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function ExploreProjects() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);

  const categories = [
  {
    name: t("home.projects.category1"),
    hero: {
      title: t("home.projects.category1.hero"),
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop",
    },
    projects: [
      {
        name: t("home.categories.houseCleaning"),
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.interiorPainting"),
        image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.handyman"),
        image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop",
        href: "#",
      },
    ],
  },
  {
    name: t("home.projects.category2"),
    hero: {
      title: t("home.projects.category2.hero"),
      image: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1200&h=400&fit=crop",
    },
    projects: [
      {
        name: t("home.projects.kitchenRemodeling"),
        image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.bathroomRemodeling"),
        image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.flooring"),
        image: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=400&h=300&fit=crop",
        href: "#",
      },
    ],
  },
  {
    name: t("home.projects.category3"),
    hero: {
      title: t("home.projects.category3.hero"),
      image: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&h=400&fit=crop",
    },
    projects: [
      {
        name: t("home.categories.lawnCare"),
        image: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.categories.treeServices"),
        image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.categories.pressureWashing"),
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
        href: "#",
      },
    ],
  },
  {
    name: t("home.projects.category4"),
    hero: {
      title: t("home.projects.category4.hero"),
      image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200&h=400&fit=crop",
    },
    projects: [
      {
        name: t("home.projects.plumbing"),
        image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.electrical"),
        image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop",
        href: "#",
      },
      {
        name: t("home.projects.hvac"),
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop",
        href: "#",
      },
    ],
  },
];

  return (
    <div className="bg-white py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center md:text-left">
          {t("home.projects.heading")}
        </h2>

        {/* Tabs */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-6 whitespace-nowrap">
            {categories.map((category, index) => (
              <button
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab(index)}
                className={`cursor-pointer pb-2 border-b-4 transition-colors ${
                  activeTab === index
                    ? "border-[hsl(var(--primary))] text-black font-semibold"
                    : "border-transparent text-gray-600 hover:text-[hsl(var(--primary))]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Card */}
        <a
          href="#"
          className="block w-full mb-6 relative overflow-hidden rounded-2xl"
        >
          <div className="relative h-64 md:h-80">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${categories[activeTab].hero.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 max-w-3xl">
                {categories[activeTab].hero.title}
              </h3>
              <div className="flex items-center text-white font-semibold">
                <p className="text-base md:text-lg">
                  {t("home.projects.seeAll")} {categories[activeTab].name.toLowerCase()} {t("home.projects.projects")}
                </p>
                <svg
                  className="ml-2"
                  height="14"
                  width="14"
                  fill="currentColor"
                  viewBox="0 0 14 14"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.822 2.628l5.345 4.705-5.378 4.74a.866.866 0 01-.622.26.845.845 0 01-.857-.834c0-.208.079-.398.208-.544l3.006-2.789H2.026a.846.846 0 01-.859-.833c0-.46.384-.834.858-.834h7.5L6.567 3.762a.844.844 0 01-.258-.596c0-.46.384-.833.857-.833.263 0 .46.126.655.295z"></path>
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories[activeTab].projects.map((project, index) => (
            <a
              key={index}
              href={project.href}
              className={`block relative overflow-hidden rounded-2xl group ${
                index === 2 ? "hidden md:block" : ""
              }`}
            >
              <div className="relative aspect-[4/3]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundImage: `url(${project.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-lg">{project.name}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
