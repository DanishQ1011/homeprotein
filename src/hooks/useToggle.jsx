"use client";
import { useState } from 'react';

const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = () => {
    setValue(!value);
    console.log(value)
  };

  return [value, toggle];
};

export default useToggle;