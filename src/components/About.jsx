import Image from "next/image";
import about from '@/assets/about.png'
import Link from "next/link";
import arrowright from '@/assets/arrowright.svg'

export default function About(){
    return(
        <section id="about" className="mt-14">
            <div className="flex max-sm:flex-col items-center gap-10">
                <div>
                    <Image src={about} alt="aboutmom" className="w-[560px]"/>
                </div>
                <div className="max-sm:text-center">
                    <h1 className="text-primary2 font-semibold text-[32px] ">About</h1>
                    <p className="mt-2 mb-2 w-[31rem] max-sm:w-[22rem] text-[16px] font-light text-wrap">
                        At HomeProtein, we blend the heartiness of home-cooked meals with the protein punch you crave. 
                        Catering to everyone, not just gym-goers, we offer a delightful fusion of family warmth and nutritional goodness in every bite. 
                        Join us on a journey where home meets protein for a flavorful and fulfilling experience.
                    </p>
                    <div className="flex gap-2 max-sm:justify-center">
                        <Link href='#/' className=" text-primary1 hover:underline">
                            LEARN MORE
                        </Link>
                        <Image src={arrowright} alt="arrowright"/>
                    </div>
                </div>
            </div>
        </section>
    )
}