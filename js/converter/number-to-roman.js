const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};

const changeInNumber = (number) => {
  document.getElementById("roman-number").value = romanize(number);
}

const changeInRoman = (roman) => {
  document.getElementById("decimal-number").value = romanToInteger(roman);
}

const romanize = (number) => {
  let roman = '';
  for (let i in lookup ) {
    while ( number >= lookup[i] ) {
      roman += i;
      number -= lookup[i];
    }
  }
  return roman;
}

const romanToInteger = (roman) => {
  const array = roman.split('');
  let total = 0, current, currentValue, next, nextValue;
  for(let i=0; i<array.length; i++){
    current = array[i];
    currentValue = lookup[current];
    next = array[i+1];
    nextValue = lookup[next];

    if(currentValue < nextValue) {
      total -= currentValue;
    }else {
      total += currentValue;
    }
  }
  return total;
}