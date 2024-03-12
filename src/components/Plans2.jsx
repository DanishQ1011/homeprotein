"use client";
import checkmark from "@/assets/checkmark.svg";
import useToggle from "@/hooks/useToggle";
import Image from "next/image";
import Switch from "react-switch";
import { formatIndianNumber } from "@/utils/formatting";
import { priceConfig } from "@/utils/priceConfig";
import PlanBenefitsCard from "@/components/PlanBenefitsCard.jsx";
import CountUp, { useCountUp } from 'react-countup'
import { useState, useEffect } from "react";

export default function Plan() {

  
  const [isChecked, toggleSwitch] = useToggle(true);
  const selectedPlan = isChecked ? "high" : "balanced";
  const displayConfig = priceConfig[selectedPlan];

  const proteinContent = selectedPlan === "high" ? "35gm+" : "15-20gm";

  const [isHigh, setIsHigh] = useState(true)
  const [config, setConfig] = useState(priceConfig.high)

   useEffect (()=>{
    setConfig(isHigh ? priceConfig.high : priceConfig.balanced)
   }, [isHigh])

  const togglePriceConfig = () => {
    setIsHigh(!isHigh)
    toggleSwitch();
  }
  
  const weeklyPlanBenefits = [
    "7 Meals",
    { end: config.weekly.perMealPrice, preserveValue: true,  duration: 2, prefix: "₹", suffix:" per meal" },
    { end: config.weekly.linnerDiscountedPrice, preserveValue: true, duration: 2, prefix: "Both Lunch and Dinner ₹" },
    `${proteinContent} protein per meal`,
    "Delivery charges included",
  ];

  const monthlyPlanBenefits = [
    "30 Meals",
    { end: config.monthly.perMealPrice, preserveValue: true, duration: 2, prefix: "₹", suffix:" per meal" },
    { end: config.monthly.linnerDiscountedPrice, preserveValue: true, duration: 2, prefix: "Both Lunch and Dinner ₹" },
    `${proteinContent} protein per meal`,
    "Delivery charges included",
  ];

  // console.log(monthylSubPrice)
  // console.log(weeklySubPrice)

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-[34px] text-primary2 font-semibold text-center max-sm:w-[22rem]">
          Affordable Dinner and Lunch Choices.
        </h1>
        <p className="text-[18px] text-center max-sm:w-[25rem]">
          Savor a satisfying midday break without breaking the bank, thanks to
          our wallet-friendly Lunch Meal options.
        </p>
      </div>

      {/* SWITCH */}

      <div className="w-full flex flex-col items-center py-10">
        <div className="flex flex-row gap-5 items-center">
          <span>Balanced Meal (15-20gm protein)</span>
          <Switch onChange={togglePriceConfig} checked={isChecked} />
          <span>High Protein Meal (35gm protein)</span>
        </div>
      </div>

      {/* PLANS */}

      <div className="mt-10 flex gap-5 max-lg:flex-col max-lg:items-center justify-center">
        <PlanBenefitsCard
          benefits={weeklyPlanBenefits}
          subPrice={config.weekly.totalSubPrice}
          subTitle={"Fueling Your Week with Protein."}
          title={"Weekly Plan"}
        />
        <PlanBenefitsCard
          benefits={monthlyPlanBenefits}
          subPrice={config.monthly.totalSubPrice}
          subTitle={"Monthly flavors, crafted with care."}
          title={"Monthly Plan"}
        />

      </div>
    </section>
  );
}
