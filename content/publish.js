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


function loaded () {
  dialog.publish = window.arguments[0];
  dialog.self    = document.documentElement;
  dialog.sb      = document.getElementById('celtx-bundle');

  dialog.server      = document.getElementById('servers-menu');
  dialog.sharedUsers = document.getElementById('shared-users');
  dialog.publishMode = document.getElementById('mode-group');
  dialog.defaultItem = document.getElementById('default-item');
  dialog.userListBtn = document.getElementById('userlist-button');

  dialog.accept = dialog.self.getButton('accept');
  dialog.accept.label = dialog.sb.getString('Upload');

  // Only one menu option for now
  // dialog.server.appendItem(dialog.sb.getString('CeltxServerName'),
  //   Cx.PUBLISH_SERVER);
  // dialog.server.selectedIndex = 0;
  dialog.server.value = dialog.sb.getString('CeltxServerName');

  if (dialog.publish.users != '') {
    dialog.sharedUsers.value = dialog.publish.users;
  }

  if (dialog.publish.mode != '') {
    var radio = document.getElementById('mode-' + dialog.publish.mode);
    if (radio) dialog.publishMode.selectedItem = radio;
  }

  if (dialog.publish.mode == 'shared') {
    optionShared();
  }
}


function accepted () {
  var mode = dialog.publishMode.selectedItem.id;
  mode = mode.replace(/^mode-/, '');
  dialog.publish.mode = mode;
  dialog.publish.users = dialog.sharedUsers.value;
  // TODO: set publishURL based on server selection
  // dialog.publish.publishURL = dialog.server.selectedItem.value;
}


function canceled () {
  dialog.publish.canceled = true;
}


function optionShared () {
  dialog.sharedUsers.disabled = false;
  dialog.userListBtn.disabled = false;
}

function optionPublic () {

  dialog.sharedUsers.disabled = true;
  dialog.userListBtn.disabled = true;
}

function optionPrivate () {
  dialog.sharedUsers.disabled = true;
  dialog.userListBtn.disabled = true;
}

function presentUserlist ()
{
  var given;
  if (dialog.sharedUsers.value)
    given = dialog.sharedUsers.value.split(/, */);
  else
    given = [];
  var sessionData =
  {
    users: given,
    accepted: false
  };
  window.openDialog(Cx.CONTENT_PATH + "userlist.xul",
    "userlist", Cx.MODAL_DIALOG_FLAGS,
    sessionData);
  if (sessionData.accepted)
    dialog.sharedUsers.value = sessionData.users.join(", ");
}

