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