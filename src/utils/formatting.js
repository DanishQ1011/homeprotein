export const formatIndianNumber = (number) => {
    const formattedNumber = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        currencyDisplay: 'symbol',
        maximumFractionDigits: 0
    }).format(number);
    
    return formattedNumber;
}