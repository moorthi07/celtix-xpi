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
  dialog.config  = window.arguments[0];
  dialog.self    = document.documentElement;
  dialog.sb      = document.getElementById('celtx-bundle');
  dialog.tree    = document.getElementById('projects-tree');

  dialog.accept = dialog.self.getButton('accept');
  dialog.accept.label = dialog.sb.getString('Download');
  dialog.accept.disabled = true;

  setTimeout(delayedLoad, 200);   // So we'll be showing prior to auth popup
}



// Authentication -----------------------------------------------------

function delayedLoad () {
  setCursor('wait');
  authenticate('get-project', authentication);
}


function authentication (rv) {
  if (! rv) {
    setCursor('default');
    setTimeout(function () { dialog.self.cancelDialog() }, 200);
    return;
  }

  try {
    var ds = getRemoteDataSource(dialog.config.projURL);

    var sink = ds.QueryInterface(Components.interfaces.nsIRDFXMLSink);
    sink.addXMLSinkObserver(loadObserver);

    dialog.tree.database.AddDataSource(new DateTransformerDS(ds));
    dialog.tree.builder.rebuild();
  }
  catch (ex) {
    dump("getproj: " + ex + "\n");
  }
}

// --------------------------------------------------------------------


function selected () {
  dialog.accept.disabled = false;
}


function canceled () {
  dialog.config.canceled = true;
}


function accepted () {
  var i = dialog.tree.currentIndex;
  if (i == -1) return;

  var id  = dialog.tree.view.getResourceAtIndex(i).Value;
  var title = dialog.tree.view.getCellText(i, 'title');

  dialog.config.uri = id;
  dialog.config.title = title;
}


/*
function sortProjects () {
  var key = Cx.NS_DC + 'modified';
  var direction = 'descending';

  var node = document.getElementById('modified');
  if (!node) return;

  try {
    var srv = getXULSortService();
    srv.sort(node, key, direction);
  }
  catch (ex) {
    // This will also fail if there are no items to sort
    // dump("Sort failed " + ex + "\n");
  }
}
*/

// Handles our busy cursor
var loadObserver = {
  onBeginLoad: function (sink) { },
  onInterrupt: function (sink) { },
  onResume:    function (sink) { },
  onEndLoad:   function (sink) { setCursor('default'); },
  onError:     function (sink, status, errMsg) { setCursor('default'); }
};

