"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ServiceSearchDropdown } from "@/components/ServiceSearchDropdown";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function Hero() {
  const [projectDescription, setProjectDescription] = useState("");
  const [city, setCity] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const services = [
    t("home.hero.service1"),
    t("home.hero.service2"),
    t("home.hero.service3"),
    t("home.hero.service4"),
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (selectedServiceId) params.append("service_id", selectedServiceId);
    if (projectDescription) params.append("service_name", projectDescription);
    if (city) params.append("city", city);
    
    router.push(`/results?${params.toString()}`);
  };

  return (
      <div className="flex flex-col flex-1 "
        style={{minHeight: "calc(100vh - 64px)"}}
      >
        <div className="w-full items-center pt-38 pb-0">
          <div className="px-4 pt-8 md:p-0 md:px-8 lg:px-0 mx-auto flex flex-col md:items-center md:h-full max-w-4xl">
            {/* Header Container */}
            <div className="mb-12">
              {/* Animated Heading */}
              <h1 className="mb-8 text-center text-5xl md:text-6xl font-bold leading-tight">
                <div className="inline-block overflow-hidden h-16 align-middle">
                  <ul className="animate-scroll">
                    {services.map((service, index) => (
                      <li key={index} className="h-16 leading-16">
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
                <br />
                {t("home.hero.madeEasy")}
              </h1>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:block w-full shrink-0">
              <div className="relative w-full max-w-5xl mx-auto">
                <form onSubmit={handleSearch} className="flex rounded-lg shadow-lg border border-gray-300">
                  {/* Search Input */}
                  <div className="flex flex-1 relative border-r border-gray-300">
                    <input
                      type="text"
                      placeholder={t("home.hero.projectPlaceholder")}
                      value={projectDescription}
                      onChange={(e) => {
                        setProjectDescription(e.target.value)
                        setIsDropdownOpen(true)
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="flex-1 px-4 py-3 rounded-l-lg border-0 outline-none text-base"
                    />
                    <ServiceSearchDropdown
                      searchQuery={projectDescription}
                      isOpen={isDropdownOpen}
                      onClose={() => setIsDropdownOpen(false)}
                      onSelectService={(categorySlug, serviceSlug, serviceName, serviceId) => {
                        setProjectDescription(serviceName)
                        setSelectedServiceId(serviceId)
                        setIsDropdownOpen(false)
                      }}
                    />
                  </div>

                  {/* City Input */}
                  <div className="flex relative items-center w-40">
                  
                    <CityAutocomplete
                      value={city}
                      onChange={setCity}
                      placeholder={t("home.hero.cityPlaceholder")}
                      className="w-32 pl-10 py-3 border-0 outline-none text-base"
                    />
                  </div>

                  {/* Search Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-l-none rounded-r-lg h-auto"
                  >
                    {t("home.hero.search")}
                  </Button>
                </form>
              </div>
            </div>

            {/* Mobile Search Bar */}
            <div className="block md:hidden w-full flex-shrink-0">
              <form onSubmit={handleSearch} className="space-y-3">
                {/* Project Description */}
                <div className="mb-3">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-md"
                  >
                    <span className="text-gray-500">
                      {t("home.hero.projectPlaceholder")}
                    </span>
                  </button>
                </div>

                {/* City Input */}
                <div className="mb-3">
                  <CityAutocomplete
                    value={city}
                    onChange={setCity}
                    placeholder={t("home.hero.cityPlaceholder")}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg outline-none"
                  />
                </div>

                {/* Search Button */}
                <Button type="submit" className="w-full" size="lg">
                  {t("home.hero.search")}
                </Button>
              </form>
            </div>
          </div>
        </div>
        <img
          src="/img/hero-bottom.webp"
          alt=""
          className="h-auto w-[40%] mx-auto mt-auto"
        />
    </div>
  );
}
