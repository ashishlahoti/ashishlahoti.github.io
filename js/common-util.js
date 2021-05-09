// Copies a string to the clipboard.
const copyToClipboard = (text) => {
  if (window.clipboardData && window.clipboardData.setData) {
    // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
    return window.clipboardData.setData("Text", text);
  }
  else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
    var textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand("copy");  // Security exception may be thrown by some browsers.
    }
    catch (ex) {
      console.warn("Copy to clipboard failed.", ex);
      return false;
    }
    finally {
      document.body.removeChild(textarea);
    }
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(function() {
      console.log('Async: Copying to clipboard was successful!');
      return true;
    }, function(err) {
      console.error('Async: Could not copy text: ', err);
      return false;
    });
  }
  return false;
}

const alertNotification = (msg, duration=3000) => {
  var el = document.createElement("div");
  el.setAttribute("class", "alert-notification");
  el.style.animation = "fade "+duration+"ms ease";
  el.innerHTML = msg; 
  setTimeout(function(){
    el.parentNode.removeChild(el);
  }, duration);
  document.body.appendChild(el);
}