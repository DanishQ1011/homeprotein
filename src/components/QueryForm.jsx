import Image from "next/image";
import about from '@/assets/about.png'

export default function QueryForm(){
    return(
        <>
        <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
          <h2 className="text-2xl text-primary2 font-bold text-center mb-2">Or drop a message, and we'll reach out to you!</h2>
          <p className="text-md text-center mb-8">Have questions about pricing, plans, or our meals? Fill out the form, and we will get in touch.</p>
            <div className="">
                <form action="#" className="mt-2">
                    <div className="flex flex-wrap gap-4">
                    <div className="w-1/2 mx-auto mb-3">
                        <label htmlFor="name" className="block text-gray-700 font-semibold text-[12px] mb-2">Name *</label>
                        <input type="text" id="name" name="name" className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" placeholder="Enter your name" />
                    </div>

                    <div className="w-1/2 mx-auto mb-3">
                        <label htmlFor="email" className="block text-gray-700 text-[12px] font-semibold mb-2">Email *</label>
                        <input type="email" id="email" name="email" className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" placeholder="Enter your email" />
                    </div>

                    <div className="w-1/2 mx-auto mb-3">
                        <label htmlFor="phone" className="block text-gray-700 text-[12px] font-semibold mb-2">Phone *</label>
                        <input type="phone" id="phone" name="phone" className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" placeholder="Enter your phone" />
                    </div>

                    <div className="w-1/2 mx-auto mb-4">
                        <label htmlFor="message" className="block text-gray-700 text-[12px] font-semibold mb-2">Message</label>
                        <textarea id="message" name="message" className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" rows="4" placeholder="Enter your message"></textarea>
                    </div>

                    <button type="submit" className="w-1/2 mx-auto px-4 py-3 bg-black text-white rounded-md focus:outline-none focus:ring focus:ring-white focus:ring-opacity-50">Submit Inquiry</button>

                    </div>

            </form>
            {/* <div>
                <Image src={about} alt="contactimage" className="w-[400px]"/>
            </div> */}
            </div>
          
        </div>
      </div>
      </>
    )
}