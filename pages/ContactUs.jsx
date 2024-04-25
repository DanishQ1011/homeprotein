import '../src/app/globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

const ContactUs = () => {
  return (
    <div className="w-full ">
      <Navbar />
        <div className="mx-[18rem] mt-[150px] max-lg:mt-[130px] max-lg:mx-[1.8rem] bg-gray-100 px-10 py-6 pb-10 max-sm:px-7 rounded-lg">

            <h1 className="text-center text-[42px] text-primary1 font-semibold max-sm:text-[30px]">
                Contact Us
            </h1>
            <p className='text-gray-600 text-sm mt-2  text-center'>Last updated on 24-04-2024 13:46:43</p>

            <div className='mt-6'>
                <p> 
                    You may contact us using the information below:
                </p>
                <ol className='mt-2 space-y-2'>
                    <li><span className='font-semibold'>Merchant Legal entity name:</span> NUTRIVORE LABS PRIVATE LIMITED</li>
                    <li><span className='font-semibold'>Registered Address:</span> 235, 2nd Floor, 13th Cross Rd, 2nd Stage, Hoysala Nagar, Indiranagar, Bangalore, Karnataka,<br/> PIN: 560038</li>
                    <li><span className='font-semibold'>Operational Address:</span> 235, 2nd Floor, 13th Cross Rd, 2nd Stage, Hoysala Nagar, Indiranagar, Bangalore, Karnataka,<br/> PIN: 560038</li>
                    <li><span className='font-semibold'>Telephone No:</span> 9108152329</li>
                    <li><span className='font-semibold'>E-Mail ID:</span>  <a href='https://mail.google.com/mail/?view=cm&fs=1&to=theoffice@homeprotein.in' target='_blank' className='text-primary1'> theoffice@homeprotein.in</a></li>
                </ol>
            </div>

        </div>
    <Footer/>
    </div>
  )
}

export default ContactUs