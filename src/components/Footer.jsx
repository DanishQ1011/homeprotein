import Image from "next/image";
import Link from "next/link";
import logo from '@/assets/logo.png'

export default function Footer(){
    return(
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
    )
}