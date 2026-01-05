"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Phone } from "lucide-react";
import { ServiceSearchDropdown } from "./ServiceSearchDropdown";
import { CityAutocomplete } from "./CityAutocomplete";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function ProHero() {
  const router = useRouter();
  const { t } = useI18n();
  const [service, setService] = useState("");
  const [location, setLocation] = useState("New York, New York");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedServiceSlug, setSelectedServiceSlug] = useState("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");

  const handleSignUp = () => {
    if (!service || !location) {
      alert(t("pro.hero.alertSelectBoth"));
      return;
    }
    
    const params = new URLSearchParams({
      service: selectedServiceSlug,
      category: selectedCategorySlug,
      serviceName: service,
      location: location,
    });
    
    router.push(`/become-a-pro/onboarding/1?${params.toString()}`);
  };

  const handleSelectService = (categorySlug: string, serviceSlug: string, serviceName: string) => {
    setService(serviceName);
    setSelectedServiceSlug(serviceSlug);
    setSelectedCategorySlug(categorySlug);
    setShowServiceDropdown(false);
  };

  return (
    <div className="flex w-full bg-gray-50 relative pt-0 md:pt-12">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 mt-0 ml-auto mr-auto relative w-full justify-center max-w-5xl">
        {/* Left Column - Form */}
        <div className="col-span-12 md:col-span-6 order-2 md:order-1 relative px-4 md:px-6">
          {/* Desktop Title */}
          <h1 className="hidden md:block text-5xl lg:text-5xl font-bold mb-4">
            {t("pro.hero.title")}
            <br />
            <div className={"mt-2"}>{t("pro.hero.location")}</div>
          </h1>

          {/* Desktop Subtitle */}
          <p className="hidden md:block mb-6 pr-12 text-gray-700">
            {t("pro.hero.subtitle")} <span className="font-bold">{t("pro.hero.subtitleHighlight")}</span> {t("pro.hero.subtitleEnd")}
          </p>

          {/* Search Form */}
          <div className="relative md:shadow-xl bg-white px-6 py-8 pb-0 md:py-6 mb-6 md:mb-0">
            <div className="mx-auto max-w-3xl">
              <div>
                <p className="text-base md:font-semibold text-gray-900 mb-4">
                  {t("pro.hero.serviceQuestion")}
                </p>

                {/* Service Input */}
                <div className="relative my-4">
                  <label htmlFor="new-pro-lp-cs" className="sr-only">
                    {t("pro.hero.serviceLabel")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
                      <Search
                        className="h-5 w-5"
                        style={{ color: "hsl(var(--primary))" }}
                      />
                    </div>
                    <input
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                      style={
                        {
                          "--tw-ring-color": "hsl(var(--primary))",
                        } as React.CSSProperties
                      }
                      placeholder={t("pro.hero.servicePlaceholder")}
                      type="text"
                      id="new-pro-lp-cs"
                      autoComplete="off"
                      value={service}
                      onChange={(e) => {
                        setService(e.target.value);
                        setShowServiceDropdown(true);
                      }}
                      onFocus={() => setShowServiceDropdown(true)}
                    />
                  </div>
                  <ServiceSearchDropdown
                    searchQuery={service}
                    isOpen={showServiceDropdown}
                    onClose={() => setShowServiceDropdown(false)}
                    onSelectService={handleSelectService}
                  />
                </div>

                {/* Location Input */}
                <div className="relative my-4">
                  <label htmlFor="search-location-input" className="sr-only">
                    {t("pro.hero.locationLabel")}
                  </label>
                  <CityAutocomplete
                    value={location}
                    onChange={setLocation}
                    placeholder={t("pro.hero.locationPlaceholder")}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center relative md:static my-6"></div>

                {/* Sign Up Button */}
                <div className="my-4">
                  {/* Desktop Button */}
                  <div className="hidden md:block">
                    <button
                      className="w-full font-semibold py-3 px-6 rounded-lg transition-colors"
                      style={{
                        backgroundColor: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                      type="button"
                      onClick={handleSignUp}
                    >
                      {t("pro.hero.signUpFree")}
                    </button>
                  </div>
                  {/* Mobile Button */}
                  <div className="md:hidden">
                    <button
                      className="w-full font-semibold py-3 px-6 rounded-lg transition-colors"
                      style={{
                        backgroundColor: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                      data-testid="get-started-button-mobile"
                      type="button"
                      onClick={handleSignUp}
                    >
                      {t("pro.hero.next")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-6 text-center md:text-left mb-8 md:mb-0">
            <p className="hidden md:block text-gray-900 mb-4 font-bold">{t("pro.hero.or")}</p>
            <div className="shadow-xl md:shadow-none rounded-full md:rounded-none mx-6 mb-6 px-8 py-2 md:px-0 md:py-0 inline-flex items-center text-center">
              <Phone className="inline md:hidden text-gray-900 h-5 w-5" />
              <span className="inline ml-2 md:ml-0 md:pr-12 pr-0">
                {t("pro.hero.contactUs")}{" "}
                <div className="inline mt-4 md:mt-0">
                  <a
                    className="font-semibold"
                    style={{ color: "hsl(var(--primary))" }}
                    href="tel:+18556639023"
                    target="_self"
                  >
                    +1 (855) 663-9023
                  </a>
                </div>
                <div className="hidden md:inline">
                  {" "}
                  {t("common.or")}{" "}
                  <div className="inline mt-4 md:mt-0">
                    <a
                      className="font-semibold"
                      style={{ color: "hsl(var(--primary))" }}
                      href="/sales/"
                      target="_self"
                    >
                      {t("pro.hero.letUsCall")}
                    </a>
                  </div>
                </div>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Image */}
        <div className="col-span-12 md:col-span-6 order-1 md:order-2">
          {/* Desktop Image */}
          <div className="hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop&q=80"
              alt="Professional service provider"
              className="w-full h-[520px] object-cover object-center"
              loading="eager"
            />
          </div>

          {/* Mobile Image with Overlay Title */}
          <div className="md:hidden relative">
            <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-black/50 to-transparent z-10">
              <h1 className="text-4xl font-bold text-white md:hidden">
                {t("pro.hero.title")}
                <br />
                {t("pro.hero.location")}
              </h1>
            </div>
            <img
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=300&fit=crop&q=80"
              alt="Professional service provider"
              className="w-full h-[242px] object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
