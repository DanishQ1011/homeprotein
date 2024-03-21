import React from 'react'
import Accordion from './Accordion'

const FAQ = () => {
  return (
    <section id='section' className='border-b-2'>
        <div className="flex flex-col items-center justify-center px-10 py-2 mb-[4rem]">
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
                <h2 className="text-2xl text-primary2 font-bold text-center mb-3">
                    Frequently Asked Questions
                </h2>
                <p className="text-md text-center mb-4 max-sm:w-[18rem]">
                    Got a question? We've got answers. If you have some other questions, contact us using email.
                </p>
            </div>
            <div className='px-4 py-2 w-1/2 max-sm:w-full bg-gray-100 rounded-lg  '>
            <Accordion
                title={
                    <h1>Question 1</h1>
                }
                answer={
                    <p className='mt-3'>Answer</p>
                }
            />
            <Accordion
                title={
                    <h1>Question 2</h1>
                }
                answer={
                    <p className='mt-3'>Answer</p>
                }
            />
            <Accordion
                title={
                    <h1>Question 3</h1>
                }
                answer={
                    <p className='mt-3'>Answer</p>
                }
            />
            <Accordion
                title={
                    <h1>Question 4</h1>
                }
                answer={
                    <p className='mt-3'>Answer</p>
                }
            />
            <Accordion
                title={
                    <h1>Question 5</h1>
                }
                answer={
                    <p className='mt-3'>Answer</p>
                }
            />
            
            </div>
        </div>
    </section>
  )
}

export default FAQ