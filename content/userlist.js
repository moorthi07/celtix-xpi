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
 * Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */


var win = {};


var keyListener = {
  handleEvent: function (event) {
    if (event.keyCode == KeyEvent.DOM_VK_RETURN ||
        event.keyCode == KeyEvent.DOM_VK_ENTER) {
      if (event.target == win.filter) win.findBtn.click();
    }
  }
};


function loaded () {
  win.findBtn = el('find-btn');
  win.addBtn  = el('add-btn');
  win.remBtn  = el('remove-btn');
  win.filter  = el('filter');
  win.selBox  = el('selection-listbox');
  win.userBox = el('user-listbox');

  win.sessionData = window.arguments[0];
  win.lastFilter = '';
  win.userSet = {};

  var users = win.sessionData.users;
  for (var i = 0; i < users.length; i++) {
    win.selBox.appendItem(users[i]);
    win.userSet[users[i]] = 1;
  }

  document.documentElement.getButton('accept').removeAttribute('default');
  window.addEventListener('keypress', keyListener, true);
}


function accepted () {
  win.sessionData.users = [];
  var rows = win.selBox.getRowCount();
  for (var i = 0; i < rows; i++) {
    var item = win.selBox.getItemAtIndex(i);
    win.sessionData.users.push(item.label);
  }
  win.sessionData.accepted = true;
  return true;
}


function canceled () {
    win.sessionData.accepted = false;
    return true;
}


function filterInput () {
  var str = win.filter.value || '';
  win.findBtn.disabled = str.search(/\w+/) == -1;
}


function find () {
  var str = win.filter.value;
  if (str == '' || str == win.lastFilter) return;

  try {
    var list = el('user-listbox');
    list.setAttribute('datasources',
                      Cx.USERLIST_URL + encodeURIComponent(str));
    list.builder.rebuild();
    win.lastFilter = str;
  }
  catch (ex) {
    dump(ex);
  }

}


function doEnabling () {
  win.addBtn.disabled = win.userBox.selectedCount == 0;
  win.remBtn.disabled = win.selBox.selectedCount == 0;
}


function removeClicked () {
  while (win.selBox.selectedCount > 0) {
    var item = win.selBox.removeItemAt(win.selBox.selectedIndex);
    if (item) delete win.userSet[item.label];
  }
}


function addClicked () {
  var items = win.userBox.selectedItems;
  var i, uid;
  for (i = 0; i < items.length; i++) {
    uid = items[i].id.replace(/^.*\//, '');
    if (win.userSet[uid]) continue;
    win.selBox.appendItem(uid);
    win.userSet[uid] = 1;
  }
  win.userBox.clearSelection();
}
