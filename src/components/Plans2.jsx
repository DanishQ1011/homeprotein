"use client";
import checkmark from "@/assets/checkmark.svg";
import useToggle from "@/hooks/useToggle";
import Image from "next/image";
import Switch from "react-switch";
import { formatIndianNumber } from "@/utils/formatting";
import { priceConfig } from "@/utils/priceConfig";
import PlanBenefitsCard from "@/components/PlanBenefitsCard.jsx";
import { useState, useEffect } from "react";

export default function Plan() {

  
  const [isChecked, toggleSwitch] = useToggle(true);
  const selectedPlan = isChecked ? "high" : "balanced";
  const displayConfig = priceConfig[selectedPlan];

  const monthlyPricePerMeal = formatIndianNumber(
    displayConfig?.monthly?.perMealPrice
  );
  const weeklyPricePerMeal = formatIndianNumber(
    displayConfig?.weekly?.perMealPrice
  );

  const monthlyDiscountedLinnerPrice = formatIndianNumber(
    displayConfig?.monthly?.linnerDiscountedPrice
  );
  const weeklyDiscountedLinnerPrice = formatIndianNumber(
    displayConfig?.weekly?.linnerDiscountedPrice
  );

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
    `${weeklyPricePerMeal} per meal`,
    `Both Lunch and Dinner ${weeklyDiscountedLinnerPrice}`,
    `${proteinContent} proten per meal`,
    "Delivery charges included",
  ];

  const monthlyPlanBenefits = [
    "26 Meals",
    `${monthlyPricePerMeal} per meal`,
    `Both Lunch and Dinner ${monthlyDiscountedLinnerPrice}`,
    `${proteinContent} proten per meal`,
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
        <div className="flex flex-row gap-5 items-center text-[15px] max-sm:text-[12px]">
          <span className="text-center">Balanced Meal <br/>(15-20gm protein)</span>
          <Switch onChange={togglePriceConfig} checked={isChecked} />
          <span className="text-center">High Protein Meal <br/> (35gm protein)</span>
        </div>
      </div>

      {/* PLANS */}

      <div className="flex gap-5 max-lg:flex-col max-lg:items-center justify-center">
        <PlanBenefitsCard
          benefits={weeklyPlanBenefits}
          subPrice={config.weekly.totalSubPrice}
          subTitle={"Fueling Your Week with Protein."}
          title={"Weekly Plan"}
          billingFrequency="weekly"
        />
        <PlanBenefitsCard
          benefits={monthlyPlanBenefits}
          subPrice={config.monthly.totalSubPrice}
          subTitle={"Monthly flavors, crafted with care."}
          title={"Monthly Plan"}
          billingFrequency="monthly"
        />

      </div>
    </section>
  );
}
