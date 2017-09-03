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
 * Portions created by Netscape Communications Corporation are Copyright
 * (C) 1998 Netscape Communications Corporation. All Rights Reserved.
 * 
 * Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

function checkFocusedWindow() {
  const CC = Components.classes;
  const CI = Components.interfaces;
  var mgr = CC['@mozilla.org/rdf/datasource;1?name=window-mediator'].
    getService(CI.nsIWindowDataSource);
  var menuItem = document.getElementById('sep-window-list');
  while (menuItem = menuItem.nextSibling) {
    var url = menuItem.getAttribute('id');
    var win = mgr.getWindowForResource(url);
    if (win == window) {
      menuItem.setAttribute('checked', 'true');
      break;
    }
  }
}

function ShowWindowFromResource(node) {
  const CC = Components.classes;
  const CI = Components.interfaces;
  var mgr = CC['@mozilla.org/rdf/datasource;1?name=window-mediator'].
    getService(CI.nsIWindowDataSource);
  var url = node.getAttribute('id');
  var win = mgr.getWindowForResource(url);
  if (win)
    win.document.commandDispatcher.focusedWindow.focus();
}

function zoomWindow() {
  if (window.windowState == STATE_NORMAL)
    window.maximize();
  else
    window.restore();
}


function updateEditCommands() {
  goUpdateCommand('cmd_undo');
  goUpdateCommand('cmd_redo');
  goUpdateCommand('cmd_cut');
  goUpdateCommand('cmd_copy');
  goUpdateCommand('cmd_paste');
  goUpdateCommand('cmd_delete');
  goUpdateCommand('cmd_selectAll');
}

