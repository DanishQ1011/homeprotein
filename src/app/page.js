import SiteNavbar from "@/components/Navbar";
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

export default function Home() {
  return (
    <>
      <main className="px-9 mx-44">
        <SiteNavbar />
        <Hero />
        <FreeCard />
        <Breakfast />
        <Plans />
        <FreeCard />
        <Linner />
        <Plans2 />
        <FreeCard />
      </main>
      <Fact />
      <section className="px-9 mx-44">
        <About />
      </section>
      <Questions />
      <QueryForm/>
    </>
  );
}