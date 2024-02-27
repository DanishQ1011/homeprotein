import React from 'react'
import Image from 'next/image'
import review1 from '@/assets/reviews/r1.jpg'
import review2 from '@/assets/reviews/r2.jpg'
import review3 from '@/assets/reviews/r3.jpg'
import pfp3 from '@/assets/reviews/pfp3.jpg'
import pfp2 from '@/assets/reviews/pfp2.jpg'
import pfp1 from '@/assets/reviews/pfp1.jpg'


const Review = () => {
  return (
    <section id='reviews' className='max-lg:hidden p-10 flex flex-col gap-8 items-center justify-center mt-10'>
        <div className="flex flex-col gap-4 items-center">
            <h1 className="text-[34px] text-primary2 font-semibold text-center max-sm:w-[20rem]">What Do People Tell About Us</h1>
            <p className="text-[18px] text-center max-sm:w-[22rem]">Join the loads of happy customers who are already subscribed to us!</p>
        </div>
        <div className='flex gap-5'>
            <div className='flex flex-col gap-3'>
                <Image src={review2} alt='review2' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
                <div className='flex flex-col justify-center items-center gap-4'>
                    <a href='https://www.linkedin.com/in/sandeep-yadav-1908v/' target="_blank"><Image src={pfp1} alt='pfp1' className='mt-2 object-contain rounded-full w-[2.5rem]'/></a>
                    <p className='text-[14px]'><span className='text-primary1'>-</span> Sandeep Yadav</p>
                </div>

            </div>
            <div className='flex flex-col'>
                <Image src={review1} alt='review1' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
                <div className='flex flex-col justify-center items-center gap-4'>
                    <a href='https://www.linkedin.com/in/vishalbgodhwani/' target="_blank"><Image src={pfp2} alt='pfp2' className='mt-4 object-contain rounded-full w-[2.5rem]'/></a>
                    <p className='text-[14px]'><span className='text-primary1'>-</span> Vishal Godhwani</p>
                </div>
            </div>
            <div className='flex flex-col gap-3'>
                <Image src={review3} alt='review3' className='object-contain rounded-2xl w-[25rem] shadow-2xl'/>
                <div className='flex flex-col justify-center items-center gap-4'>
                    <a href='https://www.linkedin.com/in/shah-abul-kalam-a-k-90a52324a/' target="_blank"><Image src={pfp3} alt='pfp3' className='object-contain rounded-full w-[2.5rem]'/></a>
                    <p className='text-[14px]'><span className='text-primary1'>-</span> Shah Abul Kalam</p>
                </div>
            </div>
        </div>
    </section>
  )
}

export default Review