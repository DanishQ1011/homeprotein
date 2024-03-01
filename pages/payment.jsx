import PaymentOption from "@/components/PaymentOption";
import React from 'react'
import '../src/app/globals.css'

const payment = () => {
  return (
    <div className="w-full h-screen bg-gradient-to-r from-indigo-500 to-blue-600">
      <div className="p-4">
        <PaymentOption/>
      </div>
    </div>
  )
}

export default payment