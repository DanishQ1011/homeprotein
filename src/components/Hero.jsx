import Image from "next/image";
import hero from '@/assets/hero.png'

export default function Hero(){
    return(
        <main className="flex max-sm:flex-col justify-between items-center mt-[8rem]">
            <div className="flex flex-col gap-8 max-sm:w-[20rem]  max-sm:gap-6 ">
                <h1 className="text-primary1 font-semibold text-[36px] max-sm:w-[20rem] max-sm:text-[28px] w-[26rem]">HomeProtein: Mom's Protein Delights.</h1>
                <p className="text-primary2 w-[28rem] max-sm:w-[18rem]">Indulge in protein-packed perfection with HomeProtein - where every bite is a mom-made, wholesome delight.</p>
                <a href="https://show.forms.app/devnm21/subscription-trial" target="_blank" rel="noopener noreferrer" >
                    <button className="px-4 py-3 bg-black text-white rounded-md">
                        Subscribe Now
                    </button>
                </a>
            </div>
            <div className=" max-sm:mt-10">
                <Image src={hero} alt="heroimage" className="w-[560px]"/>
            </div>
        </main>
    )
}