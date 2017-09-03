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

var dialog = {};

var keyupListener = {
  handleEvent: function (event) {
    const nsIDOMKeyEvent = Components.interfaces.nsIDOMKeyEvent;
    event = event.QueryInterface(nsIDOMKeyEvent);
    if (event.keyCode == nsIDOMKeyEvent.DOM_VK_RETURN ||
        event.keyCode == nsIDOMKeyEvent.DOM_VK_ENTER)
      findNext();
    else if (event.keyCode == nsIDOMKeyEvent.DOM_VK_ESCAPE)
      window.close();
  }
};

function loaded () {
  dialog.editor    = window.arguments[0];
  dialog.sb        = document.getElementById('celtx-bundle');
  dialog.notfound  = document.getElementById('not-found-label');

  dialog.opt = {
    caseSensitive:   document.getElementById('case-sensitive-option'),
    searchBackwards: document.getElementById('search-backwards-option')
  };

  dialog.fields = {
    find:    document.getElementById('find-field')
  };

  window.addEventListener('keyup', keyupListener, true);

  try {
    // TODO: editor.finder property?
    dialog.findInst = dialog.editor.webBrowserFind;
    dialog.findSvc  = getFindService();
  }
  catch (ex) {
    dump("findreplace: loaded: " + ex + "\n");
    window.close();
  }

  var fi = dialog.findInst;
  var fs = dialog.findSvc;

  dialog.fields.find.value =
    fi.searchString ? fi.searchString : fs.searchString;

  dialog.opt.caseSensitive.checked =
    fi.matchCase ? fi.matchCase : fs.matchCase;

  dialog.opt.searchBackwards.radioGroup.selectedIndex =
    fi.findBackwards ? 0 : 1;

  dialog.notfound.value = '';

  updateCommands();

  dialog.fields.find.focus();
  dump("loaded\n");
}


function updateCommands () {
  if (dialog.fields.find.value == '')
    disableCommand('cmd-find-next');
  else
    enableCommand('cmd-find-next');
}


function enableCommand (name) {
  var cmd = document.getElementById(name);
  if (cmd) cmd.removeAttribute('disabled');
}


function disableCommand (name) {
  var cmd = document.getElementById(name);
  if (cmd) cmd.setAttribute('disabled', true);
}


function unloaded () {

}


function findFieldInput () {
  updateCommands();
}


function updateFindService () {
  dialog.findSvc.searchString  = dialog.fields.find.value;
  dialog.findSvc.matchCase     = dialog.opt.caseSensitive.checked;
  dialog.findSvc.wrapFind      = true;
  dialog.findSvc.findBackwards = dialog.opt.searchBackwards.selected;
}


function findNext () {
  var cmdNext = document.getElementById("cmd-find-next");
  if (cmdNext.getAttribute("disabled") == "true")
    return;
  dialog.notfound.value = '';
  updateFindService();

  // Update the find instance
  dialog.findInst.searchString  = dialog.fields.find.value;
  dialog.findInst.matchCase     = dialog.opt.caseSensitive.checked;
  dialog.findInst.wrapFind      = true;
  dialog.findInst.findBackwards = dialog.opt.searchBackwards.selected;

  var rv = dialog.findInst.findNext();
  if (! rv) {
    dialog.notfound.value = dialog.sb.getString('NoMatchesFound');
    cmdNext.setAttribute("disabled", "true");
    return false;
  }

  return true;
}


function fuzzyMatchString (str1, str2, caseSensitive) {
  if (! caseSensitive) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
  }

  // Normalize whitespace to a single space
  str1 = str1.replace(/\s+/g, ' ');
  str2 = str2.replace(/\s+/g, ' ');

  return str1 == str2;
}

