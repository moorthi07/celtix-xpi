var win = {};

function Loaded() {
  var versionlabel = document.getElementById("versionlabel");
  var strings = document.getElementById("celtx-strings");
  win.creditbox = document.getElementById("creditbox");

  versionlabel.value = strings.getString("celtxVersion") + " " + Cx.VERSION;
  window.setInterval(RollCredits, 50);
}

function RollCredits() {
  var cw = win.creditbox.contentWindow;
  if (cw.scrollY < cw.scrollMaxY)
    cw.scrollBy(0, 1);
  else
    cw.scrollTo(0, 0);
}

