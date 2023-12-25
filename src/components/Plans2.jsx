import Link from "next/link";
import checkmark from '@/assets/checkmark.svg'
import Image from "next/image";

export default function Plan(){
    return(
        <section className="mt-10">
            <div className="flex flex-col gap-4 items-center">
                <h1 className="text-[34px] text-primary2 font-semibold text-center max-sm:w-[22rem]">Affordable Dinner and Lunch Choices.</h1>
                <p className="text-[18px] text-center max-sm:w-[25rem]">Savor a satisfying midday break without breaking the bank, thanks to our wallet-friendly Lunch Meal options.</p>
            </div>

            <div className="mt-10 flex gap-5 max-lg:flex-col max-lg:items-center justify-center">
                <div className="p-[50px] w-[30rem] h-[31rem] max-sm:w-[20rem] max-sm:h-[36rem] rounded-md shadow-2xl max-lg:shadow-lg">
                    <div className="flex flex-col gap-3 items-center">
                        <h1 className="text-primary2 text-[24px] font-semibold">Weekly Plan</h1>
                        <p className="text-primary2">Monthly flavors, crafted with care.</p>
                        <h1 className="mt-4 text-[32px] font-semibold text-primary2">₹1,694<span className="text-[16px] font-normal">/ week</span> </h1>
                    </div>
                    <div className="mt-5">
                    <ul className="list-none text-sm text-primary2 leading-[2]">
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">7 meals</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">₹242 per meal </span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Both Lunch and Dinner at ₹3,300</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">40gm+ protein per meal</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Super protein at extra ₹90 per meal (+30g protien)</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Delivery charges included</span></li>
                    </ul>
                    </div>
                    <div className="flex justify-center">
                        <a href='https://show.forms.app/devnm21/subscription-trial'>
                            <button className="mt-7 w-[25rem] max-sm:w-[16rem] py-4 border-black font-semibold shadow-xl hover:shadow-none text-black border-[1.5px] rounded-md">
                                Subscribe Now
                            </button>
                        </a>
                    </div>
                </div>
                <div>
                <div className="p-[50px] w-[30rem] h-[31rem] max-sm:w-[20rem] max-sm:h-[36rem] rounded-md shadow-2xl max-lg:shadow-lg">
                    <div className="flex flex-col gap-3 items-center">
                        <h1 className="text-primary2 text-[24px] font-semibold">Monthly Plan</h1>
                        <p className="text-primary2">Fueling Your Week with Protein.</p>
                        <h1 className="mt-4 text-[32px] font-semibold text-primary2">₹6,000<span className="text-[16px] font-normal">/ month</span> </h1>
                    </div>
                    <div className="mt-5">
                    <ul className="list-none text-sm text-primary2 leading-[2]">
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">30 meals</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">₹200 per meal </span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Both Lunch and Dinner at ₹12,000</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">40gm+ protein per meal</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Super protein at extra ₹60 per meal (+30g protien)</span></li>
                            <li className="flex items-center"><Image src={checkmark} alt="check" className="stroke-orange-300"/><span className="ml-2">Delivery charges included</span></li>
                    </ul>
                    </div>
                    <div className="flex justify-center">
                        <a href='https://show.forms.app/devnm21/subscription-trial'>
                            <button className="mt-7 w-[25rem] max-sm:w-[16rem] py-4 bg-black font-semibold text-white border-[1.5px] rounded-lg">
                                Subscribe Now
                            </button>
                        </a>
                    </div>
                </div>
                </div>
            </div>
        </section>
    )
}