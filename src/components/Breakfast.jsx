import menu1 from '@/assets/bfmenu/menu1.png'
import menu2 from '@/assets/bfmenu/menu2.png'
import menu3 from '@/assets/bfmenu/menu3.png'
import menu4 from '@/assets/bfmenu/menu4.png'
import menu5 from '@/assets/bfmenu/menu5.png'

import Image from 'next/image'

const menus = [menu1, menu2, menu3, menu4, menu5];

export default function Breakfast(){

    const concatenatedMenus = [...menus, ...menus];

    return(
        <section>
            <div className="flex flex-col justify-center items-center mt-[5rem] gap-3">
                <h1 className="text-primary1 font-semibold max-sm:text-center max-sm:text-[32px] text-[34px]">Breakfast Options</h1>
                <p className="text-primary2 text-[20px] max-sm:text-center">Revitalize your mornings with our scrumptious Breakfast Meal!</p>
            </div>
            <div className='flex logos max-sm:p-8'>
                <div className='logos-slide flex transition-transfrom ease-in-out '>
                    {concatenatedMenus.map((menu, index) => (
                        <Image 
                            key={index} 
                            src={menu} 
                            alt={`menu${index + 1}`} 
                            className='rounded-2xl w-[370px] object-contain'
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}