const changeInPixel = (pixel) => {
  const defaultFontSize = document.getElementById("defaultFontSize").value;
  document.getElementById("rem").value = Number(pixel/defaultFontSize).round(4) + "rem"
}

const changeInDefaultFontSize = (defaultFontSize) => {
  const pixel = document.getElementById("pixel").value;
  document.getElementById("rem").value = Number(pixel/defaultFontSize).round(4) + "rem"
}

Number.prototype.round = function(places) {
  return +(Math.round(this + "e+" + places)  + "e-" + places);
}

const copyRemToClipboard = () => {
  const remValue = document.getElementById("rem").value;
  copyToClipboard(remValue);
  if(remValue){
    alertNotification("Copied to clipboard: " + remValue);
  }else{
    alertNotification("Nothing to copy");
  }
}

