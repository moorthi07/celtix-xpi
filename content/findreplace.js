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
    find:    document.getElementById('find-field'),
    replace: document.getElementById('replace-field')
  };

  window.addEventListener('keyup', keyupListener, true);

  try {
    // TODO: editor.finder property?
    dialog.findInst = dialog.editor.editorElement.webBrowserFind;
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

  dialog.fields.replace.value = fs.replaceString;

  dialog.opt.caseSensitive.checked =
    fi.matchCase ? fi.matchCase : fs.matchCase;

  dialog.opt.searchBackwards.radioGroup.selectedIndex =
    fi.findBackwards ? 0 : 1;

  dialog.notfound.value = '';

  updateCommands();

  dialog.fields.find.focus();
  var findtabs = document.getElementById("findtabs");
  if (window.arguments[1])
    findtabs.selectedTab = document.getElementById("replacetab");
  else
    findtabs.selectedTab = document.getElementById("findtab");
  dump("loaded\n");
}


function updateCommands () {
  if (dialog.fields.find.value == '') {
    disableCommand('cmd-find-next');
    disableCommand('cmd-replace');
    disableCommand('cmd-replace-and-find');
    disableCommand('cmd-replace-all');
  }
  else {
    enableCommand('cmd-find-next');
    enableCommand('cmd-replace');
    enableCommand('cmd-replace-and-find');
    enableCommand('cmd-replace-all');
  }
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


function replaceFieldInput () {
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


function replace () {
  var sel = dialog.editor.selection;
  if (sel.isCollapsed) return false;

  var findStr  = dialog.fields.find.value;
  var replStr  = dialog.fields.replace.value;
  var caseSens = dialog.opt.caseSensitive.checked;
  if (! fuzzyMatchString(sel.toString(), findStr, caseSens)) return false;

  updateFindService();

  var savedRange = null;
  if (dialog.opt.searchBackwards.selected) {
    savedRange = sel.getRangeAt(0).cloneRange();
    savedRange.collapse(true);
  }

  if (replStr == '') {
    dialog.editor.deleteSelection();
  }
  else {
    dialog.editor.insertText(replStr);
  }

  if (savedRange) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
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


function replaceAndFind () {
  replace();
  findNext();
}


function replaceAll () {
  var findStr  = dialog.fields.find.value;
  var replStr  = dialog.fields.replace.value;
  var wrapping = true;
  var backward = dialog.opt.searchBackwards.selected;
  var caseSens = dialog.opt.caseSensitive.checked;

  updateFindService();

  var ed    = dialog.editor.editor;
  var doc   = ed.document;
  var body  = doc.body;
  var count = doc.body.childNodes.length;

  ed.beginTransaction();

  try {
    var sel = ed.selection;
    if (backward) sel.collapseToEnd();
    else sel.collapseToStart();

    var selRange = sel.getRangeAt(0);
    var origRange = selRange.cloneRange();

    var searchRange = doc.createRange();
    if (wrapping) {
      // Replace on entire document
      searchRange.setStart(body, 0);
      searchRange.setEnd(body, count);
    }
    else if (backward) {
      // Replace backwards
      searchRange.setStart(body, 0);
      searchRange.setEnd(selRange.startContainer, selRange.startOffset);
    }
    else {
      // Replace forwards
      searchRange.setStart(selRange.startContainer, selRange.startOffset);
      searchRange.setEnd(body, count);
    }

    replaceWithinRange(findStr, replStr, searchRange, caseSens);

    // TODO: position sel at start/end

  }
  catch (ex) {
    dump("replaceAll: " + ex + "\n");
  }

  ed.endTransaction();

  
}


function replaceWithinRange (findStr, replStr, range, caseSensitive) {
  var rf = getRangeFind();
  rf.caseSensitive = caseSensitive;

  var startPt = range.cloneRange();
  startPt.setStart(range.startContainer, range.startOffset);
  startPt.setEnd(range.startContainer, range.startOffset);
  // maybe: startPt.collapse(true);

  var endPt = range.cloneRange();
  endPt.setStart(range.endContainer, range.endOffset);
  endPt.setEnd(range.endContainer, range.endOffset);
  // maybe: endPt.collapse(false);
  
  var sel = dialog.editor.editor.selection;
  var found;
  while ((found = rf.Find(findStr, range, startPt, endPt)) != null) {
    // maybe need editor selectRange fn?
    sel.removeAllRanges();
    sel.addRange(found);

    if (replStr == '') {
      dialog.editor.deleteSelection();
    }
    else {
      dialog.editor.insertText(replStr);
      sel = dialog.editor.editor.selection;
      sel.collapseToEnd();
      startPt = sel.getRangeAt(0);
    }
  }
}

function setReplaceVisible(visible) {
  var visibleBC = document.getElementById("replace-visible");
  if (visible)
    visibleBC.setAttribute("collapsed", false);
  else
    visibleBC.setAttribute("collapsed", true);
}

