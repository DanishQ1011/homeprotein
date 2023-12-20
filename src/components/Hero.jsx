import Image from "next/image";
import Link from "next/link";
import hero from '@/assets/hero.png'

export default function Hero(){
    return(
        <main className="flex justify-between items-center">
            <div className="flex flex-col gap-8 ">
                <h1 className="text-primary1 font-semibold text-[36px] w-[26rem]">HomeProtein: Mom's Protein Delights.</h1>
                <p className="text-primary2 w-[28rem]">Indulge in protein-packed perfection with HomeProtein - where every bite is a mom-made, wholesome delight.</p>
                <Link href='/' >
                    <button className="px-4 py-3 bg-black text-white rounded-md">
                        Subscribe Now
                    </button>
                </Link>
            </div>
            <div>
                <Image src={hero} alt="heroimage" className="w-[560px]"/>
            </div>
        </main>
    )
}