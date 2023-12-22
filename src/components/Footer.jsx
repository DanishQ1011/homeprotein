import Image from "next/image";
import Link from "next/link";
import logo from '@/assets/logo.png'

export default function Footer(){
    return(
        <footer>
            <div className="flex justify-between items-center py-4 mx-auto border-b-2">
                <div>
                    <Image src={logo} alt="logo" className="w-[7rem]"/>
                </div>
                <div>
                    <ul className="list-none flex gap-10 text-gray-700 ">
                        <Link href='#/'><li className="hover:underline">Help</li></Link>
                        <a href="/policies" target="_blank" rel="noopener noreferrer">
                            <li className="hover:underline">Policy</li>
                        </a>
                        <Link href='#/'><li className="hover:underline">Terms</li></Link>
                        <Link href='#/'><li className="hover:underline">Contact</li></Link>
                    </ul>
                </div>
            </div>
            <div className="mt-5 py-5 font-light leading-relaxed mb-5">
                <p>Home Protein, #73,7th Cross Rd, 3rd Block, Koramangala 3 Block,</p>
                <p>Bengaluru, Karnataka 560034</p>
                <p>© 2023 HomeProtein. All rights reserved.</p>
            </div>
        </footer>
    )
}