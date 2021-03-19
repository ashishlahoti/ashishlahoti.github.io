const lookup = {320000:22, 280000:20, 240000:19.5, 200000:19, 160000:18, 120000:15, 80000:11.5, 40000:7, 30000:3.5, 20000:2};

const calculateIncomeTax = () => {
  const inputSalary = document.getElementById("salary").value ?? 0;
  const inputBonus = document.getElementById("bonus").value ?? 0;
  const taxSaving = document.getElementById("tax-saving").value ?? 0;
  const salaryPeriod = document.getElementById("salary-period").value ?? 0;
  const bonusPeriod = document.getElementById("bonus-period").value ?? 0;
  const taxSavingPeriod = document.getElementById("tax-saving-period").value ?? 0;
  const taxRelief = document.getElementById("tax-relief").value ?? 0;
  let totalSalary = Number(inputSalary*(salaryPeriod == 'monthly' ? 12 : 1)) + Number(inputBonus*(bonusPeriod == 'monthly' ? 12 : 1)) - Number(taxSaving*(taxSavingPeriod == 'monthly' ? 12 : 1)) - taxRelief; 
  console.log("salary", inputSalary, salaryPeriod, "bonus", inputBonus, bonusPeriod, "saving", taxSaving, taxSavingPeriod, "total", totalSalary);
  let incomeTax = 0;
  if(totalSalary <= 0){
    totalSalary = 0;
  }else{
    let salary = totalSalary;
    Object.keys(lookup).map(key => Number(key)).sort((a, b) => b-a).forEach(slab => {
      if(salary > slab){
        let taxableIncome = Number(salary-slab);
        let slabTax = Number(lookup[slab]);
        incomeTax += taxableIncome*slabTax/100;
        console.log(taxableIncome, slabTax, incomeTax);
        salary = slab;
      }
    });
  }
  document.getElementById("taxable-income").value = totalSalary;
  document.getElementById("income-tax").value = incomeTax;
}

const calculateTaxRelief = () => {
  const inputAge = document.getElementById("age").value ?? 0;
  let taxRelief = 0;
  if(inputAge >= 1 && inputAge < 55){
    taxRelief = 1000;
  }else if(inputAge >= 55 && inputAge <=59){
    taxRelief = 6000;
  }else if(inputAge >= 60){
    taxRelief = 8000;
  }
  console.log(taxRelief);
  document.getElementById("tax-relief").value = taxRelief;
  calculateIncomeTax();
}