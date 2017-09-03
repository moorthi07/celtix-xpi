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

// Utility functions for common GUI tasks

// Get/set the window title

function getWindowTitle () {
  return document.documentElement.getAttribute("title");
}

function setWindowTitle (title) {
  document.documentElement.setAttribute("title", title);
  document.title = title;
  return title;
}

// Confirmation Dialogs

const kConfirmYes     = 0;
const kConfirmNo      = 1;
const kConfirmCancel  = 2;

function confirmOKCancel (title, msg) {
  const IPS = Components.interfaces.nsIPromptService;
  var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(IPS);
  var result = ps.confirmEx(window, title, msg,
    IPS.STD_OK_CANCEL_BUTTONS,
    null, null, null, null, { value: false });
  switch (result) {
    case 0: return kConfirmYes;
    case 1: return kConfirmCancel;
  }
}

function confirmYesNo (title, msg) {
  const IPS = Components.interfaces.nsIPromptService;
  var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(IPS);
  var result = ps.confirmEx(window, title, msg,
    (IPS.BUTTON_POS_0 * IPS.BUTTON_TITLE_YES) +
    (IPS.BUTTON_POS_1 * IPS.BUTTON_TITLE_NO),
    null, null, null, null, { value: false });
  switch (result) {
    case 0: return kConfirmYes;
    case 1: return kConfirmNo;
  }
}

function confirmYesNoCancel (title, msg) {
  const IPS = Components.interfaces.nsIPromptService;
  var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(IPS);
  // The ordering of POS_1 and POS_2 differs between Mac and Windows. What you
  // would expect (Right-to-Left ordering: Cancel[2] No[1] Yes[0]) on both
  // platforms comes out as (No[1] Cancel[2] Yes[0]) on Windows, which is
  // a little disorienting to the user.
  var noPos     = isWin() ? IPS.BUTTON_POS_2 : IPS.BUTTON_POS_1;
  var cancelPos = isWin() ? IPS.BUTTON_POS_1 : IPS.BUTTON_POS_2;
  var result = ps.confirmEx(window, title, msg,
    (IPS.BUTTON_POS_0 * IPS.BUTTON_TITLE_YES) +
    (noPos            * IPS.BUTTON_TITLE_NO) +
    (cancelPos        * IPS.BUTTON_TITLE_CANCEL),
    null, null, null, null, { value: false });
  switch (result) {
    case 0: return kConfirmYes;
    case 1: return isWin() ? kConfirmCancel : kConfirmNo;
    case 2: return isWin() ? kConfirmNo : kConfirmCancel;
  }
}

// Find a menuitem by value.

function getItemByValue (elem, value) {
  if (!elem)  throw "getItemByValue: element is undefined";
  if (!value) throw "getItemByValue: value is undefined";

  switch (elem.nodeName) {
    case "menulist":
    case "menu":
      return getItemByValue_menulist(elem,  value);
    case "listbox":
      return getItemByValue_listbox(elem, value);
    case "tabbox":
      return getItemByValue_tabbox(elem, value);
    default:
      throw "getItemByValue: no implementation for " + elem.nodeName;
  }
}

// Determine if a tree row is seleced.

function isTreeRowSelected (tree, index) {
  return tree.view.selection.isSelected(index);
}

// Iterate through the selected rows of a tree.

function TreeSelectionIterator (tree) {
  this.tree = tree;
  this.currentRangeIndex = 0;
  this.currentRangeMin = { value: -1 };
  this.currentRangeMax = { value: -1 };
  this.lastValue = -1;
  this.rangeCount = tree.view.selection.getRangeCount();
}

TreeSelectionIterator.prototype = {
  hasMore: function () {
    return (this.lastValue < this.currentRangeMax.value
        || this.currentRangeIndex < this.rangeCount);
  },

  getNext: function () {
    if (this.lastValue < this.currentRangeMax.value)
      return ++this.lastValue;
    else if (this.currentRangeIndex < this.rangeCount) {
      this.tree.view.selection.getRangeAt(this.currentRangeIndex++,
        this.currentRangeMin, this.currentRangeMax);
      this.lastValue = this.currentRangeMin.value;
      return this.lastValue;
    }
    else
      return -1;
  }
};

// Private implementations

function getItemByValue_menulist (elem, value) {
  var popups = elem.getElementsByTagName("menupopup");
  if (popups.length != 1)
    throw "getItemByValue: menulists should have a single menupopup child";
  var items = popups[0].childNodes;
  for (var i = 0; i < items.length; i++) {
    if (items[i].value == value)
      return items[i];
  }
  return null;
}

function getItemByValue_listbox (elem, value) {
  var count = elem.getRowCount();
  for (var i = 0; i < count; i++) {
    var item = elem.getItemAtIndex(i);
    if (item.value == value)
      return item;
  }
  return null;
}

function getItemByValue_tabbox (elem, value) {
  var tabs = elem.getElementsByTagName("tab");
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("value") == value)
      return tabs[i];
  }
  return null;
}

