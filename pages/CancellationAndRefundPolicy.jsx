import '../src/app/globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const CancellationAndRefundPolicy = () => {
  return (
    <div className="w-full h-screen ">
      <Navbar />
        <div className="mx-[13rem] mt-[170px] max-lg:mt-[130px] max-lg:mx-[1.8rem] bg-gray-100 px-10 py-6 pb-10 max-sm:px-7 rounded-lg ">

            <h1 className="text-center text-[42px] text-primary1 font-semibold max-sm:text-[30px]">
                Cancellation & Refund Policy
            </h1>
            <p className='text-gray-600 text-sm mt-2  text-center'>Last updated on 24-04-2024 13:49:07</p>

            <div className='mt-6'>
                <p className='mt-4'>
                    <span className="font-semibold">NUTRIVORE LABS PRIVATE LIMITED </span> believes in helping its customers as far as possible, and has
                    therefore a liberal cancellation policy. <br/> Under this policy:
                </p>

            <ul className="list-disc mt-2 ml-6 space-y-1 max-sm:ml-4">
                <li>
                    Cancellations will be considered only if the request is made immediately after placing the order.
                    However, the cancellation request may not be entertained if the orders have been communicated to the
                    vendors/merchants and they have initiated the process of shipping them.
                </li>
                <li>
                    NUTRIVORE LABS PRIVATE LIMITED does not accept cancellation requests for perishable items
                    like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the
                    quality of product delivered is not good.
                </li>
                <li>
                    In case of receipt of damaged or defective items please report the same to our Customer Service team.
                    The request will, however, be entertained once the merchant has checked and determined the same at his
                    own end. This should be reported within 7 Days days of receipt of the products. In case you feel that the
                    product received is not as shown on the site or as per your expectations, you must bring it to the notice of
                    our customer service within 7 Days days of receiving the product. The Customer Service Team after
                    looking into your complaint will take an appropriate decision.
                </li>
                <li>
                    In case of complaints regarding products that come with a warranty from manufacturers, please refer
                    the issue to them. In case of any Refunds approved by the NUTRIVORE LABS PRIVATE LIMITED, it'll 
                    take 1-2 Days days for the refund to be processed to the end customer.
                </li>
            </ul>

            </div>

        </div>
      <Footer/>
    </div>
  )
}

export default CancellationAndRefundPolicy