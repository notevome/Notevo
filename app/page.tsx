import HeroSection from "@/components/landingPage-components/HeroSection";
import HowToStartSection from "@/components/landingPage-components/HowToStartSection";
import FeaturesSection from "@/components/landingPage-components/FeaturesSection";
import SignUpToday from "@/components/landingPage-components/SignUpToday";
import Testimonials from "@/components/landingPage-components/Testimonials";
import Navbar from "@/components/landingPage-components/Navbar";
import { redirect } from "next/navigation";
import Footer from "@/components/landingPage-components/Footer";
import MoreAboutMe from "@/components/landingPage-components/MoreAboutMe";
import PricingSection from "@/components/landingPage-components/pricingSection";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

export default async function HomePage() {
  if (await isAuthenticatedNextjs()) {
    redirect("/home");
  }

  return (
    // Force light mode for the entire landing page regardless of user theme
    <div className="force-light">
      <div className="relative flex flex-col min-h-screen bg-background text-foreground">
        <div className=" fixed bottom-0 left-0 h-16 Desktop:h-[4.2rem] bg-transparent frosted-area w-full z-[9000000]" />
        <Navbar />
        <div className="flex-grow flex-1">
          <HeroSection />
          <HowToStartSection />
          <FeaturesSection />
          <MoreAboutMe />
          {/* <Testimonials /> */}
          {/* <PricingSection /> */}
          <SignUpToday />
        </div>
        <Footer />
      </div>
    </div>
  );
}
