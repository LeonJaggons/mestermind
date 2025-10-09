import React from "react";

const STEPS = [
  {
    step: "1.",
    title: "Tell us what you need",
    desc:
      "Answer a few questions about your needs and share your contact. You can hide your details if you prefer.",
  },
  {
    step: "2.",
    title: "Compare quotes",
    desc:
      "Available pros who are interested will send personalized quotes.",
  },
  {
    step: "3.",
    title: "Hire and review",
    desc:
      "Check past reviews and agree on the price. Always choose the best value.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-2">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {STEPS.map((s) => (
            <div key={s.step} className="border rounded-lg p-6 bg-white">
              <div className="text-2xl font-bold mb-2">{s.step}</div>
              <div className="text-lg font-semibold mb-1">{s.title}</div>
              <div className="text-sm text-gray-700">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


