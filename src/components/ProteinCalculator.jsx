'use client';

import React, { useState } from 'react';

const ProteinCalculator = () => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activityFactor, setActivityFactor] = useState(1.375); // Default to lightly active
  const [goalFactor, setGoalFactor] = useState(1.0); // Default to maintain muscles
  const [proteinIntake, setProteinIntake] = useState(null);

  const calculateProteinIntake = () => {
    const weightInKg = parseFloat(weight);
    const heightInCm = parseFloat(height);
    const ageInYears = parseFloat(age);

    if (heightInCm > 255 || weightInKg > 200 || ageInYears > 100) {
        alert('Please enter valid numerical values.');
        return;
      };

    if (isNaN(weightInKg) || isNaN(heightInCm) || isNaN(ageInYears)) {
      alert('Please enter valid numerical values for weight, height, and age.');
      return;
    }

    const calculatedProteinIntake =
      (10 * weightInKg) +
      (6.25 * heightInCm) -
      (5 * ageInYears) +
      (activityFactor * goalFactor);

    setProteinIntake(calculatedProteinIntake.toFixed(2));
  };

  return (
    <section className='mt-[5rem] max-lg:mt-[2rem] flex flex-col items-center justify-center'>
      <div className="mt-[2rem] p-[35px] w-[45rem] max-sm:w-[20rem] rounded-3xl border-[2px] border-primary1">
        <div className="flex flex-col ">
        <h1 className="text-primary1 font-semibold text-[34px] leading-10">Protein Intake Calculator</h1>
        <p className="mt-2 text-primary2 max-sm:text-[13px] text-[15px]">Input your details into our calculator for a daily protein target tailored to your unique profile and fitness aspirations.</p>
          {/* Protein Intake Calculator Form */}
          <div className="flex flex-col gap-3 mt-4 max-sm:text-[14px]">
            <div className='flex items-center'>
            <label htmlFor="weight" className='w-[10rem]'>Weight (kg):</label>
            <input 
                type="number"
                style={{ appearance: 'textfield' }}  
                id="weight" 
                value={weight} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your weight"
                required    
                onChange={(e) => setWeight(e.target.value)} 
            />               
            </div>

            <div className='flex items-center'>
            <label htmlFor="height" className='w-[10rem]'>Height (cm):</label>
            <input 
                type="number"
                style={{ appearance: 'textfield' }} 
                id="height" 
                value={height} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your height" 
                required    
                onChange={(e) => setHeight(e.target.value)} 
            />
            </div>

            <div className='flex items-center'>
            <label htmlFor="age" className='w-[10rem]'>Age (years):</label>
            <input 
                type="number"
                style={{ appearance: 'textfield' }}
                id="age" 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your age" 
                required   
                value={age} onChange={(e) => setAge(e.target.value)}     
            />
            </div>

            <div className='flex items-center'>
            <label htmlFor="activityFactor" className='w-[10rem]'>Activity Factor:</label>
            <select 
                id="activityFactor" 
                value={activityFactor} 
                required   
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"    
                onChange={(e) => setActivityFactor(parseFloat(e.target.value))}
            >
              <option value={1.2}>Sedentary (little or no exercise)</option>
              <option value={1.375}>Lightly active (light exercise/sports 1-3 days/week)</option>
              <option value={1.55}>Moderately active (moderate exercise/sports 3-5 days/week)</option>
              <option value={1.725}>Very active (hard exercise/sports 6-7 days a week)</option>
              <option value={1.9}>Extra active (very hard exercise/sports & physical job or 2x training)</option>
            </select>
            </div>

            <div className='flex items-center'>
            <label htmlFor="goalFactor" className='w-[10rem]'>Goal Factor:</label>
            <select 
                id="goalFactor" 
                value={goalFactor} 
                required   
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"        
                onChange={(e) => setGoalFactor(parseFloat(e.target.value))}
            >
              <option value={1.0}>Maintain muscles</option>
              <option value={1.2}>Grow muscles</option>
            </select>
            </div>

            </div>
            
            <button onClick={calculateProteinIntake} className="mt-8 px-4 py-2 bg-primary1 text-white rounded-md">Calculate Protein Intake</button>
          
             {/* Output Field */}
             {proteinIntake !== null && (
              <div className="mt-6 flex flex-col items-center justify-center transition-opacity duration-500">
                <label htmlFor="proteinIntake">Protein Intake (grams per month):</label>
                <input type="text" id="proteinIntake" className='text-[34px] text-center' value={proteinIntake} readOnly />
              </div>
            )}

        </div>
      </div>
    </section>
  );
}

export default ProteinCalculator;
