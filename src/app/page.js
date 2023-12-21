import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import FreeCard from "@/components/FreeCard"
import Breakfast from "@/components/Breakfast"
import Plans from "@/components/Plans"

export default function Home() {
  return (
    <main className="px-9 mx-44">
      <Navbar/>
      <Hero/>
      <FreeCard/>
      <Breakfast/>
      <Plans/>
    </main>
  )
}
