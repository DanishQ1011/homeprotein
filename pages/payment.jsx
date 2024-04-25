import '../src/app/globals.css';
import Image from "next/image";
import Accordion from "@/components/Accordion";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import qrcode from '@/assets/qrcode.png';
import paymentimg from '@/assets/paymentimg.png';
import upi from '@/assets/upi.png';
import cards from '@/assets/cards.png';
import email from '@/assets/email.png';
import whatsapp from '@/assets/whatsapp.png';

const Payment = () => {
  return (
    <main className="w-full h-screen">
      <Navbar />
      <div className="mx-44 mt-[150px] max-lg:mt-[130px] max-lg:mx-[1.8rem]">
        <h1 className="text-center text-[36px] text-primary1 font-semibold max-sm:text-[30px]">Payment for Trial Meals</h1>
        <div className="flex gap-10 max-sm:flex-col-reverse">
          <div className="mt-8">
            <Image src={paymentimg} alt="paymentimg" width={400} className="rounded-lg" />
          </div>
          <div className="flex flex-col">
            <div className="p-5 mt-6 bg-gray-200 rounded-lg text-[20px] font-semibold">
              <Accordion
                title={
                  <div className="flex items-center">
                    <h1>Pay using Debit / Credit Card</h1>
                    <Image src={cards} alt="cardslogo" width={160} />
                  </div>
                }
                answer={
                  <a href="https://buy.stripe.com/28o03S4Hn7n23Qc5ks">
                    <button className="mt-4 px-4 py-3 bg-black text-white rounded-md">
                      Click here to Pay ₹89
                    </button>
                  </a>
                }
              />
            </div>
            <div className="mt-4 p-5 bg-gray-200 rounded-lg text-[20px] font-semibold">
              <Accordion
                title={
                  <div className="flex items-center gap-4">
                    <h1>Pay using UPI</h1>
                    <Image src={upi} alt="upilogo" width={60} />
                  </div>
                }
                answer={
                  <section className="flex flex-col mt-3">
                    <div className="flex max-sm:flex-col items-center justify-evenly gap-4">
                      <div>
                        Step 1. Pay using the UPI ID - <span className="font-bold">home.protein@axl</span>
                      </div>
                      <p>OR</p>
                      <div className="flex flex-col gap-2 items-center">
                        <p className="text-[16px]">Scan this UPI QR Code</p>
                        <Image src={qrcode} alt="qrcode" width={200} className="rounded-lg border-2 border-primary1" />
                      </div>
                    </div>
                    <div className="mt-8 flex items-center gap-8">
                      <div className="flex flex-col">
                        Step 2. Send the Payment confirmation to our{" "}
                        <span className="font-bold mt-4 flex gap-3">
                          <Image src={whatsapp} alt="whatsapp" width={28} />
                          WhatsApp - +91 9880010215
                        </span>
                        <p className="ml-[8rem]">Or</p>
                        <span className="font-bold flex gap-2">
                          <Image src={email} alt="email" width={28} className="w-[23px]" />
                          Email - theoffice@homeprotein.in
                        </span>
                      </div>
                    </div>
                  </section>
                }
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default Payment;
