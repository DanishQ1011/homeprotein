import Image from "next/image";
import logoWhite from '@/assets/logowhite.png';

export default function Footer(){
    return(
        <footer className="flex flex-col p-3 mt-12 relative bg-primary1 h-[32vh] max-sm:h-[42vh] max-lg:h-[30vh] w-full">
          <div className="flex max-sm:flex-col max-sm:items-center justify-between px-4 max-sm:px-0 ">
            <a href="/" target="_blank" className="mt-4">
              <Image src={logoWhite} alt="logo" className="w-[10rem] " />
            </a>
            <div className="flex items-center px-5 text-[14px] max-lg:text-[12px] max-sm:mt-4">
                <ul className="list-none flex gap-6 max-sm:gap-6 text-gray-700 ">
                  <a href="/TermsAndConditions" target="_blank" rel="noopener noreferrer">
                    <li className="hover:underline">Terms & Conditions</li>
                  </a>
                  <a href="/PrivacyPolicy" target="_blank" rel="noopener noreferrer">
                    <li className="hover:underline">Privacy Policy</li>
                  </a>
                  <a href="/CancellationAndRefundPolicy" target="_blank" rel="noopener noreferrer">
                    <li className="hover:underline">Cancellation & Refund Policy</li>
                  </a>
                  <a href="/ContactUs" target="_blank" rel="noopener noreferrer">
                    <li className="hover:underline">Contact Us</li>
                  </a>
                </ul>
            </div>
          </div>

          <div>
            <div className="leading-relaxed ml-[1.5rem] max-sm:ml-0 max-sm:px-6 text-primary2 text-[14px]">
              <p className="mt-5 max-sm:mt-[2rem]">#235, 2nd Floor, 13 Cross Rd, 2nd Stage, Hoysala Nagar, <br className="max-sm:hidden"/> Indiranagar,  Bangalore, Karnataka, <br className="md:hidden"/> PIN: 560038 </p>
            </div>
            <p className="absolute bottom-3 left-[49%] transform -translate-x-1/2 max-lg:bottom-[2rem] text-[11px]">© 2024 HomeProtein. All rights reserved.</p>
            {/* <p className="text-[10px] absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-1 max-lg:bottom-[0.8rem]">Website Made by <a href="https://iamshah.xyz" target="_blank">Shah</a></p> */}
          </div>
        </footer>
    )
}