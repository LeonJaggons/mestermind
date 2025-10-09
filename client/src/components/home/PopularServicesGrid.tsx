import React from "react";

type ServiceItem = {
  title: string;
  subtitle?: string;
  prosCount: string;
  rating: string;
};

const POPULAR_SERVICES: ServiceItem[] = [
  { title: "Upholstery Cleaning", prosCount: "222 pros", rating: "4.9 (332 verified reviews)" },
  { title: "Sofa Removal", prosCount: "176 pros", rating: "4.9 (936 verified reviews)" },
  { title: "Moving", prosCount: "265 pros", rating: "5.0 (742 verified reviews)" },
  { title: "Home Renovation", prosCount: "389 pros", rating: "5.0 (178 verified reviews)" },
  { title: "House Cleaning", prosCount: "1,933 pros", rating: "4.9 (251 verified reviews)" },
  { title: "Wedding Photographer", prosCount: "161 pros", rating: "4.5 (48 verified reviews)" },
  { title: "Office Cleaning", prosCount: "651 pros", rating: "4.9 (301 verified reviews)" },
  { title: "Exterior Painting", prosCount: "335 pros", rating: "5.0 (178 verified reviews)" },
  { title: "Post-Construction Cleaning", prosCount: "530 pros", rating: "4.9 (301 verified reviews)" },
  { title: "Wardrobe Delivery", prosCount: "197 pros", rating: "4.9 (925 verified reviews)" },
  { title: "Post-Renovation Cleaning", prosCount: "631 pros", rating: "4.9 (263 verified reviews)" },
  { title: "Gardener", prosCount: "179 pros", rating: "4.9 (1,021 verified reviews)" },
];

export default function PopularServicesGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Popular this week</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {POPULAR_SERVICES.map((service) => (
          <div key={service.title} className="border rounded-lg p-4 flex flex-col gap-1 hover:shadow">
            <div className="text-sm font-bold text-[#20853b]">{service.title}</div>
            <div className="text-xs text-gray-600">{service.prosCount}</div>
            <div className="text-xs text-gray-700">{service.rating}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


