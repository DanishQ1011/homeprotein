import React from "react";
import Accordion from "./Accordion";
import Image from "next/image";
import qrcode from '@/assets/qrcode.png'

const PaymentOption = () => {
  return (
    <main className="mx-44">
      <h1 className="p-8 text-center text-[34px]">Payment for free trial</h1>
    <div className="p-5 mt-6 bg-gray-200 rounded-lg text-[22px] ">
      <Accordion
        title="Pay using Debit / Credit Card"
        answer="I like to use iOS products"
      />
    </div>
    <div className="mt-4 p-5 bg-gray-200 rounded-lg text-[22px]">
      <Accordion
        title="Pay using UPI"
        answer={            
        <>
          <div className="flex flex-col gap-4">
          <div>
          Step 1. Pay using the UPI ID - {" "}
          <span className="font-bold">home.protein@axl</span>
          </div>
          <p className="ml-[8rem]">OR</p>
          <div>
            <Image src={qrcode} alt="qrcode" width={200}/>
          </div>
          </div>
        </>
        }
      />
    </div>
    </main>
  );
};

export default PaymentOption;