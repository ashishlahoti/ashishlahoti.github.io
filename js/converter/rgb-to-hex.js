
const changeInValueR = (valueR) => {
  const valueG = document.getElementById("valueG").value;
  const valueB = document.getElementById("valueB").value;
  _convertRgbToHex(valueR, valueG, valueB);
}

const changeInValueG = (valueG) => {
  const valueR = document.getElementById("valueR").value;
  const valueB = document.getElementById("valueB").value;
  _convertRgbToHex(valueR, valueG, valueB);
}

const changeInValueB = (valueB) => {
  const valueR = document.getElementById("valueR").value;
  const valueG = document.getElementById("valueG").value;
  _convertRgbToHex(valueR, valueG, valueB);
}

const changeInHex = (hex) => _convertHexToRgb(hex);

const _convertRgbToHex = (R, G, B) => {
  const hex = '#' + _rgbToHex(R) + _rgbToHex(G) + _rgbToHex(B);
  const hexElement = document.getElementById("hex");
  const colorDisplayElement = document.getElementById("colorDisplay");
  hexElement.value = hex;
  colorDisplayElement.style.backgroundColor = hex;
}

const _convertHexToRgb = (hex) => {
  if(hex){
    hex = hex.replace('#', '');
    const R = parseInt(hex.substring(0,2), 16) || 0;
    const G = parseInt(hex.substring(2,4), 16) || 0;
    const B = parseInt(hex.substring(4,6), 16) || 0;
    document.getElementById("valueR").value = R;
    document.getElementById("valueG").value = G;
    document.getElementById("valueB").value = B;
    document.getElementById("colorDisplay").style.backgroundColor = `rgb(${R}, ${G}, ${B})`;
  }
}

const _rgbToHex = (rgb) => { 
  var hex = Number(rgb).toString(16);
  if (hex.length < 2) {
       hex = "0" + hex;
  }
  return hex;
};

const copyHexToClipboard = () => {
  const hexValue = document.getElementById("hex").value;
  copyToClipboard(hexValue);
  if(hexValue){
    alertNotification("Copied to clipboard: " + hexValue);
  }else{
    alertNotification("Nothing to copy");
  }
}
