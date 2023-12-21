import Image from "next/image";
import Link from "next/link";
import logo from '@/assets/logo.png'

export default function Navbar(){
    return(
        <nav className="py-4 bg-white mx-52 fixed top-0 left-0 right-0 z-50 ">
            <div className="flex  justify-between items-center">
                <div>
                    <Link href='#/home'>
                        <Image src={logo} alt="logo" className="w-[7rem]"/>
                    </Link>
                </div>
                <div className="flex gap-10 items-center">
                    <ol className="list-none flex gap-8">
                        <Link href='#/plans'><li>Plans</li></Link>
                        <Link href='#/about'><li>About</li></Link>
                        <Link href='#/contact'><li>Contact</li></Link>
                    </ol>

                    <button className="px-3 py-2 bg-black text-white rounded-md">
                        Get Free Trial
                    </button>
                </div>
            </div>
        </nav>
    )
}