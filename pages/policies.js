import Navbar from '@/components/Navbar'
import '../src/app/globals.css'
import Footer from '@/components/Footer'

export default function policies() {
  return (
    <>
    <main className="mt-10 px-9 py-9 mx-44 max-sm:mx-auto max-lg:mx-auto">
    {/* <Navbar/> */}
    <section className='mt-40 py-10 mb-5 border-b-2'>
        <div>
            <h1 className='text-center mt-[20rem] mb-4 text-primary2 text-[32px] font-bold'>Conditions and Policies</h1>
            
            <div className='flex flex-col gap-5'>

            <div>
                <p className='font-semibold'>Pausing subscription:</p>
                <ul><li className='list-disc ml-8'>You cannot pause the subscription, however you can request a refund or cancel meals for any particular number of days.</li></ul>
            </div>

            <div>
                <p className='font-semibold'>Pausing subscription:</p>
                <ul><li className='list-disc ml-8'>You can request a refund anytime before the subscription ends and 100% of the amount remaining for rest of the subscription days will be refunded (minimal charges may apply, which will be conveyed during the cancellation).</li></ul>
            </div>

            <div>
                <p className='font-semibold'>Merch:</p>
                <ul>
                    <li className='list-disc ml-8'>For first meal subscriptions, the merchandise kit will be delivered within 2-4 weeks in case of no cancellation of the meal plan and at least 15 meals delivered.</li>
                    <li className='list-disc ml-8'>Free Merchandise delivery is subject to availibility.</li>
                </ul>
            </div>
            </div>
        </div>
    </section>
    <Footer/>
    </main>
    </>
  )
}
