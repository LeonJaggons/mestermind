import Hero from "@/components/Hero";
import PopularServicesGrid from "@/components/home/PopularServicesGrid";
import ValueProps from "@/components/home/ValueProps";
import HowItWorks from "@/components/home/HowItWorks";
import JoinAsPro from "@/components/home/JoinAsPro";
import PopularCategories from "@/components/home/PopularCategories";
import Regions from "@/components/home/Regions";
import DownloadAppCTA from "@/components/home/DownloadAppCTA";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <PopularServicesGrid />
      <ValueProps />
      <HowItWorks />
      <JoinAsPro />
      {/* <PopularCategories /> */}
      {/* <Regions /> */}
      {/* <DownloadAppCTA /> */}
    </div>
  );
}
