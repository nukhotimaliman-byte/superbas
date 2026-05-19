import { HeroSection } from "@/components/landing/Hero";
import { AboutSection } from "@/components/landing/About";
import { JobCardsSection } from "@/components/landing/JobCards";
import { BentoSection } from "@/components/landing/Bento";
import { TimelineSection } from "@/components/landing/Timeline";
import { FAQSection } from "@/components/landing/FAQ";
import { TestimonialsSection } from "@/components/landing/Testimonials";
import { CareSection } from "@/components/landing/Care";
import { CTASection } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <JobCardsSection />
        <BentoSection />
        <TimelineSection />
        <FAQSection />
        <TestimonialsSection />
        <CareSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
