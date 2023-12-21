import Link from "next/link";
import checkmark from '@/assets/checkmark.svg'
import Image from "next/image";

export default function Plan(){
    return(
        <section>
            <div className="flex flex-col gap-4 items-center">
                <h1 className="text-[34px] text-primary2 font-semibold">Protein-Packed Mornings, Wallet-Friendly Choices.</h1>
                <p className="text-[18px]">Energize your day affordably with our budget-friendly Breakfast Meal options.</p>
            </div>

            <div className="mt-10 flex gap-5 justify-center">
                <div className="p-[50px] w-[30rem] h-[25rem] rounded-md shadow-2xl">
                    <div className="flex flex-col gap-3 items-center">
                        <h1 className="text-primary2 text-[24px] font-semibold">Weekly Plan</h1>
                        <p className="text-primary2">Fueling Your Week with Protein.</p>
                        <h1 className="text-[28px] font-semibold text-primary2">1400 <span className="text-[16px] font-normal">/ week</span> </h1>
                    </div>
                    <div className="mt-5">
                    <ul className="list-none">
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">7 meals</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">220 per meal</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Weekends included</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Delivery charges included</span></li>
                    </ul>
                    </div>
                    <div className="flex justify-center">
                        <Link href='#/'>
                            <button className="mt-7 w-[25rem] py-4 border-black font-semibold shadow-xl hover:shadow-none text-black border-[1.5px] rounded-md">
                                Subscribe Now
                            </button>
                        </Link>
                    </div>
                </div>
                <div>
                <div className="p-[50px] w-[30rem] h-[25rem] rounded-md shadow-2xl">
                    <div className="flex flex-col gap-3 items-center">
                        <h1 className="text-primary2 text-[24px] font-semibold">Monthly Plan</h1>
                        <p className="text-primary2">Fueling Your Week with Protein.</p>
                        <h1 className="text-[28px] font-semibold text-primary2">1400 <span className="text-[16px] font-normal">/ week</span> </h1>
                    </div>
                    <div className="mt-5">
                    <ul className="list-none">
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">7 meals</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">220 per meal</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Weekends included</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Delivery charges included</span></li>
                    </ul>
                    </div>
                    <div className="flex justify-center">
                        <Link href='#/'>
                            <button className="mt-7 w-[25rem] py-4 bg-black font-semibold text-white border-[1.5px] rounded-lg">
                                Subscribe Now
                            </button>
                        </Link>
                    </div>
                </div>
                </div>
            </div>
        </section>
    )
}