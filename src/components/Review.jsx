import React from 'react'
import Image from 'next/image'
import review1 from '@/assets/reviews/r1.jpg'
import review2 from '@/assets/reviews/r2.jpg'
import review3 from '@/assets/reviews/r3.jpg'


const Review = () => {
  return (
    <section className='p-10 flex flex-col gap-8 items-center justify-center mt-10'>
        <div className="flex flex-col gap-4 items-center">
            <h1 className="text-[34px] text-primary2 font-semibold text-center max-sm:w-[22rem]">What Do People Tell About Us</h1>
            <p className="text-[18px] text-center max-sm:w-[25rem]">Join the loads of happy customers who are already subscribed to us!</p>
        </div>
        <div className='flex gap-5'>
            <div>
                <Image src={review2} alt='review2' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
            </div>
            <div>
                <Image src={review1} alt='review1' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
            </div>
            <div>
                <Image src={review3} alt='review3' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
            </div>
        </div>
    </section>
  )
}

export default Review