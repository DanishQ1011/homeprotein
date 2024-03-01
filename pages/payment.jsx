import PaymentOption from "@/components/PaymentOption";
import React from 'react'
import '../src/app/globals.css'

const payment = () => {
  return (
    <div className="w-full h-screen ">
      <div className="p-4">
        <PaymentOption/>
      </div>
    </div>
  )
}

export default payment