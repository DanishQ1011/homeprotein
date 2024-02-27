'use client';

import React, { useState } from 'react';

const ProteinCalculator = () => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activityFactor, setActivityFactor] = useState(1.375); // Default to lightly active
  const [goalFactor, setGoalFactor] = useState(1.0); // Default to maintain muscles

  const calculateProteinIntake = () => {
    const weightInKg = parseFloat(weight);
    const heightInCm = parseFloat(height);
    const ageInYears = parseFloat(age);

    if (isNaN(weightInKg) || isNaN(heightInCm) || isNaN(ageInYears)) {
      alert('Please enter valid numerical values for weight, height, and age.');
      return;
    }

    const proteinIntake =
      (10 * weightInKg) +
      (6.25 * heightInCm) -
      (5 * ageInYears) +
      (activityFactor * goalFactor);

    alert(`Your daily protein intake should be approximately ${proteinIntake.toFixed(2)} grams.`);
  };

  return (
    <section className='mt-[6rem]'>
      <div className="mt-[2rem] p-[45px] max-sm:h-[36rem] rounded-3xl border-[2px] border-primary1">
        <div className="flex flex-col ">
        <h1 className="text-primary1 font-semibold text-[34px] ">Protein Intake Calculator</h1>
        <p className="text-primary2 text-[18px] ">Input your details into our calculator for a daily protein target tailored to your unique profile and fitness aspirations.</p>
          {/* Protein Intake Calculator Form */}
          <div className="flex flex-col gap-3 mt-4">
            <label htmlFor="weight">Weight (kg):</label>
            <input 
                type="number" 
                id="weight" 
                value={weight} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your weight" 
                onChange={(e) => setWeight(e.target.value)} 
            />

            <label htmlFor="height">Height (cm):</label>
            <input 
                type="number" 
                id="height" 
                value={height} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your height"     
                onChange={(e) => setHeight(e.target.value)} 
            />

            <label htmlFor="age">Age (years):</label>
            <input 
                type="number" 
                id="age" 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full" 
                placeholder="Enter your age" 
                value={age} onChange={(e) => setAge(e.target.value)}     
            />

            <label htmlFor="activityFactor">Activity Factor:</label>
            <select 
                id="activityFactor" 
                value={activityFactor} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"    
                onChange={(e) => setActivityFactor(parseFloat(e.target.value))}
            >
              <option value={1.2}>Sedentary</option>
              <option value={1.375}>Lightly active</option>
              <option value={1.55}>Moderately active</option>
              <option value={1.725}>Very active</option>
              <option value={1.9}>Extra active</option>
            </select>

            <label htmlFor="goalFactor">Goal Factor:</label>
            <select 
                id="goalFactor" 
                value={goalFactor} 
                className="px-3 py-2 border border-gray-300 hover:border-black rounded-md shadow-sm focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-full"        
                onChange={(e) => setGoalFactor(parseFloat(e.target.value))}
            >
              <option value={1.0}>Maintain muscles</option>
              <option value={1.2}>Grow muscles</option>
            </select>

            <button onClick={calculateProteinIntake} className="mt-3 px-4 py-2 bg-primary1 text-white rounded-md">Calculate Protein Intake</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProteinCalculator;
