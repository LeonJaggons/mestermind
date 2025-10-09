import React from "react";
import { LuClock, LuDiamond, LuLightbulb, LuPalette } from "react-icons/lu";

const PROPS = [
  {
    icon: <LuDiamond />,
    title: "Get quality service",
    desc:
      "Check past customer reviews to ensure the pro’s work quality and decide with confidence.",
  },
  {
    icon: <LuClock />,
    title: "Save your time",
    desc:
      "Skip asking friends and family. Get tailored quotes online and spend more time with loved ones.",
  },
  {
    icon: <LuPalette />,
    title: "Wide range of services",
    desc:
      "We ensure pros deliver top quality and make a broad variety of services available to you.",
  },
  {
    icon: <LuLightbulb />,
    title: "Simple to use",
    desc:
      "Take a minute to answer a few questions about the job so everything goes smoothly.",
  },
];

export default function ValueProps() {
  return (
    <section className="py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {PROPS.map((p) => (
            <div key={p.title} className="rounded-lg bg-white h-full">
              <div className={"flex flex-col items-center sm:items-start text-center sm:text-left gap-2 mb-2"}>
                <div className="text-2xl md:text-3xl h-14 w-14 md:h-16 md:w-16 mb-2 flex items-center justify-center bg-green-100 rounded-full">
                  <div className="text-green-700">
                    {p.icon}
                  </div>
                </div>
                <div className="text-base md:text-lg font-semibold text-center sm:text-left">{p.title}</div>
              </div>
              <div className="text-sm md:text-base leading-relaxed text-gray-700 text-center sm:text-left">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


