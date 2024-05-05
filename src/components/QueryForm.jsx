"use client";
import { useState } from "react"
import axios from "axios";

export default function QueryForm(){

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState('');
const [message, setMessage] = useState('');

const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
        email,
        name,
        phone,
        message,
    }

    console.log("Data: ", formData)

    //SEND DATA OVER THE SERVER

    try {
        const { data } = await axios({
            url: '/api/submit-form',
            method: 'POST',
            data: formData
        });

        console.log("Response Back: ", data)
    } catch (error) {
        console.log("Error: ", error)
    }
}


    return(
        <>
        <section id="contact">
        <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
          <h2 className="text-2xl text-primary2 font-bold text-center mb-2 max-sm:w-[20rem]">Or drop a message, and we'll reach out to you!</h2>
          <p className="text-md text-center mb-8">Have questions about pricing, plans, or our meals? Fill out the form, and we will get in touch.</p>
            
            <div className="">
                <form action='#' onSubmit={handleSubmit}  className="mt-2">
                    <div className="flex flex-wrap gap-4">
                    
                    <div className="w-1/2 max-lg:w-full mx-auto mb-3">
                        <label htmlFor="name" className="block text-gray-700 font-semibold text-[12px] mb-2">Name *</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={({ target }) => setName(target?.value)} 
                            id="name" 
                            name="name" 
                            className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                            placeholder="Enter your name" 
                        />
                    </div>

                    <div className="w-1/2 max-lg:w-full mx-auto mb-3">
                        <label htmlFor="email" className="block text-gray-700 text-[12px] font-semibold mb-2">Email *</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={({target}) => setEmail(target?.value)} 
                            id="email" 
                            name="email" 
                            className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                            placeholder="Enter your email" 
                        />
                    </div>

                    <div className="w-1/2 max-lg:w-full mx-auto mb-3">
                        <label htmlFor="phone" className="block text-gray-700 text-[12px] font-semibold mb-2">Phone *</label>
                        <input 
                            type="phone"
                            value={phone}
                            onChange={({target}) => setPhone(target?.value)} 
                            id="phone" 
                            name="phone" 
                            className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                            placeholder="Enter your phone" 
                        />
                    </div>

                    <div className="w-1/2 max-lg:w-full mx-auto mb-4">
                        <label htmlFor="message" className="block text-gray-700 text-[12px] font-semibold mb-2">Message</label>
                        <textarea 
                            id="message"
                            value={message}
                            onChange={({target}) => setMessage(target?.value)}  
                            name="message" 
                            className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                            rows="4" 
                            placeholder="Enter your message">
                        </textarea>
                    </div>

                    <button 
                        type="submit"
                        className="w-1/2 max-lg:w-full mx-auto px-4 py-3 bg-black text-white rounded-md focus:outline-none focus:ring focus:ring-white focus:ring-opacity-50">
                            Submit Inquiry
                            
                    </button>

                    </div>

            </form>

            </div>
          
        </div>
      </div>
      </section>
      </>
    )
}