/* ***** BEGIN LICENCE BLOCK *****
 * Version: CePL 1.1
 * 
 * The contents of this file are subject to the Celtx Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.celtx.com/CePL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Celtx Script Manager.
 * 
 * The Initial Developer of the Original Code is Chad House and 4067479
 * Canada Inc. t/a CELTX.
 * 
 * Portions created by Chad House are Copyright (C) 2000-2004 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */


function loaded () {
  app.startup();

  var prefsvc = getPrefService();

  var tbmode = prefsvc.getCharPref("celtx.toolbar.show");
  setToolbarMode(tbmode);

  setSmallIcons(true);

  // Select the correct toolbar mode menu item from the prefs
  var tbmenu = document.getElementById('toolbars-menu');
  if (tbmenu) {
    var tbmenuitem = getItemByValue(tbmenu, tbmode);
    if (tbmenuitem)
      tbmenuitem.setAttribute('checked', true);
  }

  startupPing();
  splashInit();
}


function unloaded () {
  app.shutdown();
}


// Check for newer versions, status messages, etc.
function startupPing () {
  var req = new XMLHttpRequest();

  function loaded() {
    if (req.status != 200) return;
    try {
      var doc = document.getElementById('splash-frame').contentDocument;
      var div = doc.getElementById('projects');
      var imp = doc.importNode(req.responseXML.documentElement, true);
      div.parentNode.insertBefore(imp, div);
  
      // KLUDGE: We've got net, so enable the forums display
      var auxDiv = doc.getElementById('aux');
      auxDiv.style.setProperty('display', 'block', '');
    }
    catch (ex) {
      dump("*** startupPing: " + ex + "\n");
    }
  };

  req.onload = loaded;
  req.open('GET', Cx.STARTUP_URL + '/' + Cx.VERSION);
  req.send(null);
}


function splashInit () {

  function splashClick (event) {
    var cmd = event.target.getAttribute('cmd');
    if (! cmd) return;
    if (cmd == 'cmd-open-link') {
      var link = event.target.getAttribute('link');
      if (link) window.open(link);
    }
    else {
      goDoCommand(cmd);
    }
  }

  try {
    var splashDoc = document.getElementById('splash-frame').contentDocument;
    splashDoc.body.addEventListener('click', splashClick, false);

    // Display the version number
    var elem = splashDoc.getElementById('version');
    elem.appendChild(splashDoc.createTextNode(Cx.VERSION));
  } catch (ex) {
    dump("splashInit: " + ex + "\n");
  }
}

