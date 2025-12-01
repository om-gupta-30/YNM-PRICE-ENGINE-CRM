// Convert number to words (Indian numbering system)
export function numberToWords(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result.trim();
  }

  if (num === 0) return 'Zero';

  // Handle decimal part
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';

  // Crores
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    result += convertHundreds(crores) + 'Crore ';
  }

  // Lakhs
  if (integerPart >= 100000) {
    const lakhs = Math.floor((integerPart % 10000000) / 100000);
    if (lakhs > 0) {
      result += convertHundreds(lakhs) + 'Lakh ';
    }
  }

  // Thousands
  if (integerPart >= 1000) {
    const thousands = Math.floor((integerPart % 100000) / 1000);
    if (thousands > 0) {
      result += convertHundreds(thousands) + 'Thousand ';
    }
  }

  // Hundreds, Tens, Ones
  const remainder = integerPart % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }

  result = result.trim();

  // Add decimal part
  if (decimalPart > 0) {
    result += ` and ${convertHundreds(decimalPart)}Paise`;
  }

  // Add "Rupees" or "Rupee"
  if (integerPart === 1 && decimalPart === 0) {
    result = 'One Rupee Only';
  } else if (decimalPart === 0) {
    result += ' Rupees Only';
  } else {
    result = result.replace(' and ', ' Rupees and ');
    result += ' Only';
  }

  return result;
}

