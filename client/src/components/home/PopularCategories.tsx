import React from "react";

const CATEGORIES = [
  "Window Cleaning",
  "Airbnb Cleaning",
  "Tiling",
  "Furniture Removal",
  "Furniture Assembly",
  "Furniture Delivery",
  "Post-Construction Cleaning",
  "Post-Renovation Cleaning",
  "Painting",
  "Bathroom Renovation",
  "Transport",
  "Office Cleaning",
  "Sofa Delivery",
  "Moving",
  "Apartment Clearance",
  "House Cleaning",
  "Home Renovation",
  "Laminate Flooring Installation",
  "Stairwell Cleaning",
  "Junk Removal",
  "Interior Painting",
  "Cleaning",
  "Man with a Van",
  "Electrician",
];

export default function PopularCategories() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Popular services</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a key={c} href={`/search?category=${encodeURIComponent(c)}`} className="px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50">
              {c}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}


