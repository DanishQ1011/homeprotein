import checkmark from "../assets/checkmark.svg";
import Image from "next/image";
import CountUp from 'react-countup';


const PlanBenefitsCard = ({ title, subTitle, benefits, subPrice, billingFrequency }) => {
  const showNote = billingFrequency === 'monthly'
  return (
    <div className="p-[50px] w-[30rem] h-[33rem] max-sm:w-[20rem] max-sm:h-[36rem] rounded-md shadow-2xl max-lg:shadow-lg">
      <div className="flex flex-col gap-3 items-center">
        <h1 className="text-primary2 text-[24px] font-semibold">{title}</h1>
        <p className="text-primary2">{subTitle}</p>
        <h1 className="mt-4 text-[32px] font-semibold text-primary2">
        <CountUp
          preserveValue={true}
          end={subPrice}
          duration={0.5}
          prefix="₹"
        />
          <span className="text-[16px] font-normal">/ month</span>{" "}
        </h1>
      </div>
      <div className="mt-5">
        <ul className="list-none text-sm text-primary2 leading-[2]">
          {benefits.map((benefit) => (
            <li className="flex items-center">
              <Image
                src={checkmark}
                alt="check"
                className="stroke-orange-300"
              />
              <span className="ml-2">
                {benefit}
              </span>
              <br/>
            </li>
          ))}
        </ul>
        {showNote && (
          <span className="text-[12px] leading-snug line-clamp-2 mt-2">
            (Note: Meals are not provided on Sundays, therefore the total amount is calculated for 26 days only.)
          </span>
          )}
      </div>
      <div className="flex justify-center">
        <a href="https://show.forms.app/devnm21/subscription-trial">
          <button className="mt-7 w-[25rem] max-sm:w-[16rem] py-4 bg-black font-semibold text-white border-[1.5px] rounded-lg">
            Subscribe Now
          </button>
        </a>
      </div>
    </div>
  );
};

export default PlanBenefitsCard;
