import React from "react";

export default function DownloadAppCTA() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border rounded-lg p-6 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Download now for a smooth experience</h3>
            <p className="text-sm text-gray-700 max-w-2xl">
              Download the free Mestermind app, view quotes, and chat easily with pros.
            </p>
          </div>
          <div className="flex gap-2">
            <a className="px-4 py-2 text-sm rounded-md bg-black text-white" href="#">App Store</a>
            <a className="px-4 py-2 text-sm rounded-md bg-black text-white" href="#">Google Play</a>
          </div>
        </div>
      </div>
    </section>
  );
}


