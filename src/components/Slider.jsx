'use client';

import React from "react";
import "react-responsive-carousel/lib/styles/carousel.min.css"; // requires a loader
import { Carousel } from 'react-responsive-carousel';
import review2 from '@/assets/reviews/r2.jpg'
import review1 from '@/assets/reviews/r1.jpg'
import review3 from '@/assets/reviews/r3.jpg'
import pfp3 from '@/assets/reviews/pfp3.jpg'
import pfp2 from '@/assets/reviews/pfp2.jpg'
import pfp1 from '@/assets/reviews/pfp1.jpg'
import Image from "next/image";

export default function Slider() {
  return (
    <section id='reviews' className='p-10 flex flex-col gap-8 items-center justify-center mt-10'>
    <div className="flex flex-col gap-4 items-center">
        <h1 className="text-[34px] text-primary2 font-semibold text-center max-sm:w-[18rem]">What Do People Tell About Us</h1>
        <p className="text-[18px] text-center max-sm:w-[20rem]">Join the loads of happy customers who are already subscribed to us!</p>
    </div>
        <Carousel 
            showThumbs={false} 
            infiniteLoop={true} 
            stopOnHover={true} 
            showArrows={false} 
            autoPlay={true} 
            interval={8000} 
            transitionTime={500}
            emulateTouch={true} 
            className="mx-[2px]"
        >
            <div>
                <Image src={review1} alt='review1' className='object-contain rounded-2xl w-[25rem] '/>
                <div className='flex flex-col justify-center items-center gap-4'>
                    <a href='https://www.linkedin.com/in/vishalbgodhwani/' target="_blank"><Image src={pfp2} alt='pfp2'  width={40} className='mt-4 object-contain rounded-full w-[2.5rem]'/></a>
                    <p className='text-[14px]'><span className='text-primary1'>-</span> Vishal Godhwani</p>
                </div>
            </div>
            <div>
                <Image src={review2} alt='review2' className='object-contain rounded-2xl w-[25rem]'/>
                <div className='flex flex-col justify-center items-center gap-4 mt-4'>
                    <a href='https://www.linkedin.com/in/sandeep-yadav-1908v/' target="_blank"><Image src={pfp1} alt='pfp1' width={40} className=' object-contain rounded-full w-[2.5rem]'/></a>
                    <p className='text-[14px]'><span className='text-primary1'>-</span> Sandeep Yadav</p>
                </div>
            </div>
            <div className='flex flex-col gap-3'>
                <Image src={review3} alt='review3' className='object-contain rounded-2xl w-[25rem]'/> 
                <div className='flex flex-col justify-center items-center gap-4'>
                    <a href='https://www.linkedin.com/in/shah-abul-kalam-a-k-90a52324a/' target="_blank"><Image src={pfp3} alt='pfp3' width={40} className='object-contain rounded-full'/></a>
                    <p className='text-[14px]'>- Shah Abul Kalam</p>
                </div>   
            </div>
        </Carousel>
    </section>
  );
}