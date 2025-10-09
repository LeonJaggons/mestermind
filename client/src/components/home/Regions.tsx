import React from "react";

const REGIONS = [
  "Budapest",
  "Pest",
  "Fejér",
  "Bács-Kiskun",
  "Baranya",
  "Békés",
  "Borsod-Abaúj-Zemplén",
  "Csongrád",
  "Győr-Moson-Sopron",
  "Hajdú-Bihar",
  "Heves",
  "Jász-Nagykun-Szolnok",
  "Komárom-Esztergom",
  "Nógrád",
  "Somogy",
  "Szabolcs-Szatmár-Bereg",
  "Vas",
  "Veszprém",
  "Zala",
];

export default function Regions() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Services near me</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <a key={r} href={`/search?region=${encodeURIComponent(r)}`} className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
              {r}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}


