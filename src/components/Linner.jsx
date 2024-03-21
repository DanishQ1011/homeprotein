import menu1 from '@/assets/linnermenu/menu1.png'
import menu2 from '@/assets/linnermenu/menu2.png'
import menu3 from '@/assets/linnermenu/menu3.png'
import menu4 from '@/assets/linnermenu/menu4.png'
import menu5 from '@/assets/linnermenu/menu5.png'
import menu6 from '@/assets/linnermenu/menu6.png'
import menu7 from '@/assets/linnermenu/menu7.png'
import menu8 from '@/assets/linnermenu/menu8.png'


import Image from 'next/image'

const menus = [menu1, menu2, menu3, menu4, menu5, menu6, menu7, menu8];

export default function Breakfast(){
    return(
        <section>
            <div className="flex flex-col justify-center items-center mt-[5rem] gap-3">
                <h1 className="text-primary1 font-semibold text-[34px] max-sm:text-[32px] text-center">Lunch & Dinner Options</h1>
                <p className="text-primary2 text-[20px] text-center">Deliciously curated, our Lunch & Dinner meal is a flavor-packed delight for your midday break!</p>
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