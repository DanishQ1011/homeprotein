import React from 'react'
import Accordion from './Accordion'
import AccordionGroup from './AccordionGroup'
import faqData from '@/constants/faqData.json'

const FAQ = () => {
  return (
    <section id='section'>
      <div className="flex flex-col items-center justify-center px-10 py-2 mb-[4rem]">
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
          <h2 className="text-2xl text-primary2 font-bold text-center mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-md text-center mb-4 max-sm:w-[18rem]">
            Got a question? We've got answers. If you have some other questions, contact us using email.
          </p>
        </div>
        <div className='px-4 py-2 w-1/2 max-sm:w-full bg-gray-100 rounded-lg text-primary2'>
          {faqData.sections.map(section => (
            <AccordionGroup
              key={section.title}
              title={<h1>{section.title}</h1>}
              answer={section.questions.map(question => (
                <Accordion
                  key={question.title}
                  title={<h1 className='text-left'>{question.title}</h1>}
                  answer={<p className='mt-3'>{question.answer}</p>}
                />
              ))}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ