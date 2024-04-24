'use client';

import Image from "next/image";
import Link from "next/link";
import logo from '@/assets/logo.png'
import menu from "@/assets/menu.svg"
import close from "@/assets/close.svg"
import { useState } from "react";

export default function Navbar(){

    const [isMenuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
      setMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setMenuOpen(false);
      };

    return(
        <>
        <nav className="py-2 px-[13rem] max-sm:px-[3rem] max-lg:px-[2rem] bg-white fixed top-0 left-0 right-0 z-50 ">
            <div className="container mx-auto flex justify-between items-center  ">
                <div>
                    <a href='/'>
                        <Image src={logo} alt="logo" className=" w-[7rem]"/>
                    </a>
                </div>
                <div className="flex gap-5 items-center max-sm:hidden ">
                    <ol className="list-none flex gap-8 mr-4">
                        <Link href='/#plans'><li>Plans</li></Link>
                        <Link href='/#reviews'><li>Reviews</li></Link>
                        <Link href='/#about'><li>About</li></Link>
                        <Link href='/#contact'><li>Contact</li></Link>
                    </ol>

                    <a href="https://show.forms.app/devnm21/subscription-trial" target="_blank" rel="noopener noreferrer">
                        <button className="px-3 py-2 bg-black text-white rounded-md">
                            Try Now!
                        </button>
                    </a>
                    <a href="https://homeprotein.in/MomOnboard" target="_blank" rel="noopener noreferrer">
                        <button className="px-3 py-2 bg-black text-white rounded-md">
                            Join Us!
                        </button>
                    </a>
                </div>
                <div className="md:hidden">
                    <Image src={menu} alt="menu" onClick={toggleMenu} />
                </div>
            </div>
        </nav>

        {isMenuOpen && (
            <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50">
            <div className="container mx-auto h-full flex items-center justify-end">
                <div className="bg-white w-3/4 h-full px-8 transform translate-x-0 transition-transform duration-3000 ease-in-out">
                <div className="flex items-center justify-between border-b-2">
                    <div>
                        <a href='/'>
                            <Image src={logo} alt="logo" className="w-[7rem]"/>
                        </a>
                    </div>

                    <button onClick={closeMenu} className="mt-2 px-3 py-2">
                        <Image src={close} alt="close"/>
                    </button>
                </div>                

                <ol className="list-none flex flex-col gap-4 mt-8">
                    <Link href='/#plans'><li>Plans</li></Link>
                    <Link href='/#reviews'><li>Reviews</li></Link>
                    <Link href='/#about'><li>About</li></Link>
                    <Link href='/#contact'><li>Contact</li></Link>
                </ol>
                <a href="https://show.forms.app/devnm21/subscription-trial" target="_blank" rel="noopener noreferrer">
                    <button className="mt-6 px-3 py-2 w-full bg-black text-white rounded-md">
                        Try Now!
                    </button>
                </a>
                <a href="https://show.forms.app/devnm21/subscription-trial" target="_blank" rel="noopener noreferrer">
                    <button className="mt-6 px-3 py-2 w-full bg-black text-white rounded-md">
                        Try Now!
                    </button>
                </a>
                </div>
            </div>
            </div>
        )}

        </>
    )
}