import Image from "next/image";
import logo from '@/assets/logo.png'
import Link from "next/link";
import Navbar from "./Navbar";
import step1 from "@/assets/momOnboarding/step1.png";
import step2 from "@/assets/momOnboarding/step2.png";
import step3 from "@/assets/momOnboarding/step3.png";
import step4 from "@/assets/momOnboarding/step4.png";
import step5 from "@/assets/momOnboarding/step5.png";

const HiringMoms = () => {
  return (
    <>
      <Navbar />
      <main className="mx-44 mt-[110px] max-lg:mx-auto">
        <h1 className="text-center text-[36px] text-primary1 font-semibold max-sm:text-[30px]">Mom Onboard Process</h1>
        <div className="flex flex-row-reverse gap-10 max-sm:flex-col-reverse mt-3">
          <div className="flex flex-col w-full">
            
            <div className="p-5 mt-6 max-sm:flex-col max-sm:items-center bg-gray-100 rounded-lg flex gap-[2rem] border-primary1 border-[2px] text-[20px] font-semibold">
              <div className="relative">
              <h2 className="font-semibold text-[28px]">Step 1. Initial Application and Phone Interview</h2>
              <ul className="mt-3 text-[18px] list-disc ml-4">
                <li>Fill out our initial form providing basic information in the link given below</li>
                <li>You will then receive a phone interview session, which can be either a video call or voice call.</li>
                <li>Based on our requirements we will confirm availability and assess basic qualifications.</li>
              </ul>
              <a href="https://forms.gle/ELdCY76sxt916Q1K9" target="_blank" className="max-sm:flex justify-center mr-4">
                  <button className="mt-6 mb-2 px-3 py-2 w-1/4 max:sm-ml-4 bg-black text-white rounded-md max-lg:w-3/4">
                    Fill Form
                  </button>
              </a>
              </div>
              <Image src={step1} alt="Step1Image" width={300} height={250} className="rounded-xl transform scale-x-[-1]" />
            </div>

            <div className="p-5 mt-6 max-sm:flex-col max-sm:items-center bg-gray-100 rounded-lg flex gap-[2rem] border-primary1 border-[2px] text-[20px] font-semibold">
              <div>
                <h2 className="font-semibold text-[28px]">Step 2. Home Visit/Inspection</h2>
                <p className="text-[18px] mt-3">We will schedule a home visit to conduct an inspection focused on following hygiene and beneficial practices</p>
                <ul className="mt-2 text-[18px] list-disc ml-4">
                  <li>Waste Disposal: Dispose of waste in covered bins with proper trash bags for sanitation.</li>
                  <li>Appliance Maintenance: Maintain kitchen appliances in good working order to ensure safe and efficient food preparation.</li>
                  <li>Water Quality: Candidates must use safe and clean water for cooking to ensure food hygiene.</li>
                </ul>
              </div>
              <Image src={step2} alt="Step2Image" width={300} height={250} className="rounded-xl transform scale-x-[-1]" />
            </div>

            <div className="p-5 mt-6 max-sm:flex-col max-sm:items-center bg-gray-100 rounded-lg flex gap-[2rem] border-primary1 border-[2px] text-[20px] font-semibold">
              <div className="relative">
              <h2 className="font-semibold text-[28px]">Step 3. Taste Testing</h2>
              <p className="text-[18px] mt-3">Taste testing is conducted to assess cooking skills and preferences.</p>
              <ul className="mt-3 text-[18px] list-disc ml-4">
                <li>Choose Fresh Ingredients: Highlight your knack for selecting the freshest ingredients, essential for delicious Indian cuisine.</li>
                <li>Ensure Quality and Consistency: Present your dishes for final evaluation, ensuring they consistently meet our standards for taste and presentation..</li>
              </ul>
              <p className="absolute text-[15px] bottom-0 max-lg:static max-lg:mt-6">(Note: This step can consist initial & final taste testing depending on the cook and may take longer to process)</p>
              </div>
              <Image src={step3} alt="Step3Image" width={300} height={250} className="rounded-xl object-cover" />
            </div>

            <div className="p-5 mt-6 max-sm:flex-col max-sm:items-center bg-gray-100 rounded-lg flex gap-[2rem] border-primary1 border-[2px] text-[20px] font-semibold">
              <div>
              <h2 className="font-semibold text-[28px]">Step 4. Recipes Training</h2>
              <p className="text-[18px] mt-3">Training is divided into two modules:</p>
              <ul className="mt-3 text-[18px] list-disc ml-4">
                <li><span className="font-bold">Cooking Techniques:</span> Learn essential skills and methods for preparing delicious meals while maintaining hygiene standards. Covering cooking processes and techniques.</li>
                <li><span className="font-bold">Sanitization and Safety Measures:</span>  Ensure a clean and safe kitchen with daily sanitization routines. Learn health and safety protocols like wearing hair nets and gloves for a hygienic environment.</li>
              </ul>
                <p className="text-[18px] mt-3">These modules are pre-recorded and updated monthly to address any challenges and ensure continuous improvement. Online sessions are also available for additional support and guidance.</p>
              </div>
              <Image src={step4} alt="Step4Image" width={300} className="rounded-xl object-cover transform scale-x-[-1]" />
            </div>

            <div className="p-5 mt-6 max-sm:flex-col max-sm:items-center bg-gray-100 rounded-lg flex gap-[2rem] border-primary1 border-[2px] text-[20px] font-semibold">
              <div>
              <h2 className="font-semibold text-[28px]">Step 5. Licensing and Onboarding</h2>
              <p className="text-[18px] mt-3">
                  Once you've finished training and shown off your cooking skills, you're officially part of the HomeProtein team! Here's what happens next:</p>
              <ul className="mt-3 text-[18px] list-disc ml-4">
                <li>Documentation Submission: Provide two identity proofs for verification. This ensures all cooks are properly registered.</li>
                <li>FSSAI Registration: After verification, we'll guide you through obtaining your FSSAI license, ensuring food safety standards.</li>
                <li>Receiving Your HomeProtein Kit: Once registered, you'll receive a HomeProtein kit with essentials like hair nets and gloves for a clean cooking space.</li>
              </ul>
              <p className="text-[18px] mt-3">Congratulations!🥳 You're now a licensed chef partnered with HomeProtein! We appreciate your commitment to maintaining quality and safety standards.❤️</p>
              </div>
              <Image  src={step5} alt="Step5Image" width={300} height={250} className="rounded-xl" />
            </div>
            
          </div>
        </div>

        <footer className="flex flex-col mt-4 p-3">
          <div className="flex max-sm:flex-col max-sm:items-center justify-between">
            <a href="/" target="_blank">
              <Image src={logo} alt="logo" className="w-[8rem] " />
            </a>
            <div className="flex items-center p-5">
              <div>
                <ul className="list-none flex gap-10 text-gray-700">
                  <Link href='#/'><li className="hover:underline">Help</li></Link>
                  <a href="/policies" target="_blank" rel="noopener noreferrer">
                    <li className="hover:underline">Policy</li>
                  </a>
                  <Link href='#/'><li className="hover:underline">Terms</li></Link>
                  <Link href='#/'><li className="hover:underline">Contact</li></Link>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div className="font-light py-8 leading-relaxed border-t-2">
              <p>Home Protein, #73,7th Cross Rd, 3rd Block, Koramangala 3 Block,</p>
              <p>Bengaluru, Karnataka 560034</p>
              <p>© 2024 HomeProtein. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

export default HiringMoms;