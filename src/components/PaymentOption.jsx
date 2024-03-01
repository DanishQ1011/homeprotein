import React from "react";
import Accordion from "./Accordion";
import Image from "next/image";
import qrcode from '@/assets/qrcode.png'
import paymentimg from '@/assets/paymentimg.png'
import upi from '@/assets/upi.png'
import cards from '@/assets/cards.png'
import logo from '@/assets/logo.png'
import Link from "next/link";

const PaymentOption = () => {
  return (
    <>
    <main className="mx-44">
      <h1 className="p-8 text-center text-[36px] text-primary1 font-semibold">Payment for free trial</h1>
      <div className="flex gap-10 ">
      <div className="mt-8">
      <Image src={paymentimg} alt="paymentimg" width={400} />
    </div>
    <div className="flex flex-col">
    <div className="p-5 mt-6 bg-gray-200 rounded-lg text-[20px] font-semibold">
      <Accordion
        title={
          <>
          <div className="flex items-center ">
            <h1>Pay using Debit / Credit Card</h1>
            <Image src={cards} alt="cardslogo" width={160}/>
          </div>
        </>
        }
        answer={
          <>
            <a href="https://buy.stripe.com/test_4gwaHE2X7fFTdVK4gg">
              <button className="px-4 py-3 bg-black text-white rounded-md">
                Click here to Pay ₹49 
              </button>
            </a>
          </>
        }
      />
    </div>
    <div className="mt-4 p-5 bg-gray-200 rounded-lg text-[20px] font-semibold">
      <Accordion
        title={
          <>
            <div className="flex items-center gap-4">
              <h1>Pay using UPI</h1>
              <Image src={upi} alt="upilogo" width={60}/>
            </div>
          </>
        }

        answer={            
        <>
        <section className="flex flex-col">
          <div className="flex items-center justify-evenly gap-4">
            <div>
              Step 1. Pay using the UPI ID - {" "}
              <span className="font-bold">home.protein@axl</span>
            </div>
              <p >OR</p>
            <div className="flex flex-col gap-2 items-center">
              <p>Scan this UPI QR Code</p>
              <Image src={qrcode} alt="qrcode" width={200}/>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-8">
            <div className="flex flex-col">
              Step 2. Send the Payment confirmation to our {" "}
              <span className="font-bold">WhatsApp - +91 9880010215</span>
              <p >Or</p>
              <span className="font-bold">Email - theoffice@homeprotein.in</span>
            </div>

          </div>
        </section>
        </>
        }
      />
    </div>
    </div>
    </div>
    <footer className="flex p-10">
      <div>
        <a href="/" target="_blank">
        <Image src={logo} alt="logo" className="w-[10rem]"/>
        </a>
      </div>
      <div className="flex max-sm:flex-col justify-between items-center py-4 mx-auto">
                <div>
                    <ul className="list-none flex gap-10 text-gray-700">
                        <Link href='#/'><li className="hover:underline">Help</li></Link>
                        <a href="/policies" target="_blank" rel="noopener noreferrer">
                            <li className="hover:underline">Policy</li>
                        </a>
                        <Link href='#/'><li className="hover:underline">Terms</li></Link>
                        <Link href='#/'><li className="hover:underline">Contact</li></Link>
                    </ul>
                </div>
            </div>
            <div className="mt-5 py-5 font-light leading-relaxed mb-5 text-right">
                <p>Home Protein, #73,7th Cross Rd, 3rd Block, Koramangala 3 Block,</p>
                <p>Bengaluru, Karnataka 560034</p>
                <p>© 2023 HomeProtein. All rights reserved.</p>
            </div>
    </footer>
    </main>

    </>
  );
};

export default PaymentOption;