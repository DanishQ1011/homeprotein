import menu1 from '@/assets/bfmenu/menu1.png'
import menu2 from '@/assets/bfmenu/menu2.png'
import menu3 from '@/assets/bfmenu/menu3.png'
import menu4 from '@/assets/bfmenu/menu4.png'
import menu5 from '@/assets/bfmenu/menu5.png'

import Image from 'next/image'

const menus = [menu1, menu2, menu3, menu4, menu5];

export default function Breakfast(){
    return(
        <section>
            <div className="flex flex-col justify-center items-center mt-[5rem] gap-3">
                <h1 className="text-primary1 font-semibold text-[34px]">Breakfast Options</h1>
                <p className="text-primary2 text-[20px]">Revitalize your mornings with our scrumptious Breakfast Meal!</p>
            </div>
            <div className='flex logos'>
                <div className='logos-slide flex transition-transfrom duration-1000 ease-in-out '>
                    {menus.map((menu, index) => (
                        <Image key={index} src={menu} alt={`menu${index + 1}`} className='rounded-2xl w-[370px] object-contain'/>
                    ))}
                    {menus.map((menu, index) => (
                        <Image key={index} src={menu} alt={`menu${index + 1}`} className='rounded-2xl w-[370px] object-contain'/>
                    ))}
                </div>
            </div>
        </section>
    )
}