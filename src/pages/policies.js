import Navbar from '@/components/Navbar'
import '../app/globals.css'
import Footer from '@/components/Footer'

export const metadata = {
    title: 'Create Next App',
    description: 'Generated by create next app',
  }

export default function policies() {
  return (
    <>
    <main className="px-9 mx-44 ">
    <Navbar/>
    <section className='mt-[10rem] py-10 mb-5 border-b-2'>
        <div>
            <h1 className='text-center mb-4 text-primary2 text-[32px] font-bold'>Conditions and Policies</h1>
            
            <div className='flex flex-col gap-5'>

            <div>
                <p className='font-semibold'>Pausing subscription:</p>
                <ul><li className='list-disc ml-8'>You cannot pause the subscription, however you can request a refund or cancel meals for any particular number of days.</li></ul>
            </div>

            <div>
                <p className='font-semibold'>Merch</p>
                <ul><li className='list-disc ml-8'>You can request a refund anytime before the subscription ends and 100% of the amount remaining for rest of the subscription days will be refunded (minimal charges may apply, which will be conveyed during the cancellation).</li></ul>
            </div>

            <div>
                <p className='font-semibold'>Pausing subscription:</p>
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
