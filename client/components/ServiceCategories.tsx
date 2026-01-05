"use client";

import { useState } from "react";
import { useI18n } from "@/lib/contexts/I18nContext";

export default function ServiceCategories() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);

  const categories = [
  {
    name: t("home.categories.cleaners"),
    icon: (
      <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.278.61c-.42 0-.798.255-.956.644L2.909 4.728a1.032 1.032 0 00.956 1.42h.483v8.97c0 1.333 1.147 2.272 2.378 2.272h6.062c1.231 0 2.379-.939 2.379-2.272v-1.302c0-1.927-1.23-3.613-3.041-4.353l-3.02-1.236V6.148h2.975c.57 0 1.031-.462 1.031-1.031V1.642c0-.57-.462-1.032-1.031-1.032H5.278zm1.764 5.538h-.63v8.97c0 .028.01.07.06.117.053.049.14.091.254.091h6.062a.373.373 0 00.254-.09c.051-.048.061-.09.061-.118v-1.302c0-1.012-.65-1.99-1.758-2.443L7.683 9.875a1.032 1.032 0 01-.641-.955V6.148zM5.398 4.085l.574-1.411h5.077v1.41h-5.65z" fillRule="evenodd"></path>
      </svg>
    ),
    services: [
      { name: t("home.categories.houseCleaning"), image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400" },
      { name: t("home.categories.carpetCleaning"), image: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400" },
      { name: t("home.categories.junkRemoval"), image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400" },
      { name: t("home.categories.pressureWashing"), image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400" },
    ],
  },
  {
    name: t("home.categories.handymen"),
    icon: (
      <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.133.636a5.613 5.613 0 00-4.97 4.852 6.793 6.793 0 00-.01 1.396l.032.267L3.77 9.569c-2.174 2.177-2.433 2.446-2.597 2.702-.1.156-.223.38-.27.497-.569 1.363-.305 2.773.695 3.723.83.789 1.991 1.083 3.127.792.304-.078.838-.34 1.11-.542.115-.087 1.291-1.236 2.611-2.554l2.402-2.397.223.032c.332.048 1.141.04 1.502-.014a5.633 5.633 0 004.271-3.141 5.644 5.644 0 00.271-4.182c-.294-.898-.562-1.191-1.095-1.196-.41-.004-.422.005-1.724 1.3l-1.14 1.136-.33-.111-.33-.111-.117-.338-.117-.338 1.155-1.16c1.088-1.091 1.16-1.171 1.223-1.34.085-.23.074-.534-.026-.73-.162-.316-.4-.47-1.08-.696a5.796 5.796 0 00-2.4-.265zm.08 2.598c-1.127 1.13-1.1 1.026-.627 2.445.207.622.338.968.402 1.064.176.26.264.304 1.303.65 1.063.355 1.156.37 1.47.255.159-.058.245-.135.976-.861l.803-.798v.254c0 .298-.063.733-.15 1.049-.09.324-.382.906-.593 1.185-.915 1.21-2.34 1.744-3.857 1.443-.442-.09-.572-.083-.827.032-.069.03-1.084 1.02-2.764 2.694-2 1.992-2.693 2.664-2.808 2.724a1.426 1.426 0 01-1.707-.281c-.416-.435-.486-1.04-.19-1.647l.123-.255 2.59-2.58c2.116-2.11 2.603-2.61 2.666-2.737.113-.231.125-.446.045-.788a4.51 4.51 0 01-.046-1.47c.13-.761.462-1.423.991-1.977a3.662 3.662 0 012.685-1.17l.284-.003-.77.772zM4.589 12.08a1.02 1.02 0 00-.758 1.005c0 .195.014.262.09.422.22.465.693.702 1.168.584a1.02 1.02 0 00.64-.442.993.993 0 000-1.134 1.03 1.03 0 00-.614-.437.838.838 0 00-.526.002z" fillRule="evenodd"></path>
      </svg>
    ),
    services: [
      { name: t("home.categories.generalRepairs"), image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400" },
      { name: t("home.categories.furnitureAssembly"), image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400" },
      { name: t("home.categories.tvMounting"), image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400" },
      { name: t("home.categories.homeMaintenance"), image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400" },
    ],
  },
  {
    name: t("home.categories.landscapers"),
    icon: (
      <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.8.561c-.297.106-.407.221-.886.936-1.555 2.321-2.858 5.23-3.621 8.081a26.838 26.838 0 00-.92 6.274c-.029.91.021 1.115.338 1.394.495.435 1.28.262 1.558-.343.08-.176.082-.195.106-.988.08-2.667.53-5.1 1.416-7.64a25.233 25.233 0 013.063-6.073c.237-.345.27-.43.27-.706a.744.744 0 00-.098-.427 1.01 1.01 0 00-.484-.479c-.187-.092-.528-.105-.742-.029zM3.89 3.282c-.199.084-.37.222-.495.398a.983.983 0 00-.148.636c.014.192.036.245.32.775 1.48 2.761 2.561 6.088 2.911 8.961.087.717.122 1.184.149 1.981.022.665.027.7.105.871.277.604 1.063.777 1.557.342.333-.293.376-.5.326-1.593-.088-1.953-.378-3.714-.936-5.68-.571-2.018-1.456-4.2-2.394-5.908-.355-.647-.547-.8-1.025-.818-.172-.006-.292.005-.37.035zM1.258 6.666c-.43.122-.71.458-.741.89-.023.321.036.466.372.916 1.243 1.665 2.243 3.704 2.693 5.49.174.692.318 1.7.318 2.226.001.525.079.78.31 1.011a.91.91 0 00.648.281c.181.01.261 0 .398-.052.224-.084.449-.289.555-.505.083-.17.084-.176.08-.726-.005-.858-.115-1.672-.359-2.67-.441-1.802-1.291-3.667-2.487-5.46-.796-1.193-.997-1.386-1.485-1.426a1.052 1.052 0 00-.302.025zm14.975.007c-.35.098-.585.354-1.278 1.394-1.818 2.727-2.83 5.62-2.846 8.13-.004.55-.003.556.08.726.106.216.331.421.555.505.126.05.263.069.398.052a.91.91 0 00.648-.28c.231-.233.309-.487.31-1.012 0-.527.144-1.534.318-2.226.454-1.804 1.429-3.79 2.694-5.49.335-.45.394-.596.371-.917a.992.992 0 00-1.25-.882z" fillRule="evenodd"></path>
      </svg>
    ),
    services: [
      { name: t("home.categories.lawnCare"), image: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400" },
      { name: t("home.categories.treeServices"), image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400" },
      { name: t("home.categories.gardenDesign"), image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400" },
      { name: t("home.categories.irrigation"), image: "https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=400" },
    ],
  },
  {
    name: t("home.categories.plumbers"),
    icon: (
      <svg height="18" width="18" fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.429 1.929a1 1 0 10-2 0v2.857H3.857a1 1 0 00-1 1V9A6.145 6.145 0 008 15.062v1.01a1 1 0 102 0v-1.01A6.145 6.145 0 0015.143 9V5.786a1 1 0 00-1-1H12.57V1.929a1 1 0 10-2 0v2.857H7.43V1.929zM9 13.143A4.143 4.143 0 014.857 9V6.786h8.286V9A4.143 4.143 0 019 13.143z" fillRule="evenodd"></path>
      </svg>
    ),
    services: [
      { name: t("home.categories.leakRepair"), image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400" },
      { name: t("home.categories.drainCleaning"), image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400" },
      { name: t("home.categories.waterHeater"), image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400" },
      { name: t("home.categories.pipeInstallation"), image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400" },
    ],
  },
];

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 flex flex-col">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center md:text-left self-center">
          {t("home.categories.heading")} <span className="text-[hsl(var(--primary))]">{t("home.categories.headingHighlight")}</span>
        </h2>

        {/* Category Tabs */}
        <div className="relative border-b border-gray-300 mb-6">
          <div className="flex overflow-x-auto scrollbar-hide" role="tablist">
            {categories.map((category, index) => (
              <button
                key={index}
                role="tab"
                type="button"
                aria-selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                className={`flex-shrink-0 flex flex-col items-center justify-center py-3 px-4 md:px-6 border-b-2 transition-colors ${
                  activeTab === index
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <div className="mb-2">{category.icon}</div>
                <div className={`text-sm whitespace-nowrap ${activeTab === index ? "font-semibold" : ""}`}>
                  {category.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories[activeTab].services.map((service, index) => (
            <a
              key={index}
              href="#"
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] block"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundImage: `url(${service.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="text-white font-bold text-lg">{service.name}</h4>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
