import React from "react";

export default function JoinAsPro() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border rounded-lg bg-white p-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Join us as a pro</h2>
            <p className="text-sm text-gray-700 max-w-2xl">
              Mestermind forwards thousands of customer requests each year. If you’re great at what you do and want to grow your business, join us!
            </p>
          </div>
          <div>
            <a href="/pro/signup" className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm hover:opacity-90">
              Join now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}


