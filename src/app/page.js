import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FreeCard from "@/components/FreeCard";
import Breakfast from "@/components/Breakfast";
import Plans from "@/components/Plans";
import Linner from "@/components/Linner";
import Plans2 from "@/components/Plans2";
import Fact from "@/components/Fact";
import About from "@/components/About";
import Questions from "@/components/Questions"
import QueryForm from "@/components/QueryForm";
import Footer from "@/components/Footer";
import Review from "@/components/Review";
import Slider from '@/components/Slider';
import ProteinCalculator from "@/components/ProteinCalculator";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <>
      <main className="mx-44 max-lg:mx-auto px-4">
      <Navbar />
        <Hero />
        <FreeCard />
        <Breakfast />
        <Plans />
        <FreeCard />
        <Linner />
        <Plans2 />
        <ProteinCalculator/>
      </main>
      <Fact />
      <Review/>
        <div className="lg:hidden">
          <Slider/>
        </div>
      <section className="px-9 mx-44 max-lg:mx-auto">
        <About />
      </section>
      <Questions />
      <QueryForm/>
      <FAQ/>
      <Footer/>
    </>
  );
}