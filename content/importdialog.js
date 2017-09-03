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

const nsIInterfaceRequestor    = Components.interfaces.nsIInterfaceRequestor;
const nsIWebProgress           = Components.interfaces.nsIWebProgress;
const nsIWebProgressListener   = Components.interfaces.nsIWebProgressListener;
const nsISupportsWeakReference = Components.interfaces.nsISupportsWeakReference;

const SCENE_CHUNK_DELAY = 75;
const SCENE_CHUNK_COUNT = 20;
const SCENE_CHUNK_MIN   = 5;
const SCENE_CHUNK_MAX   = 10;


var dialog = {};


function loaded () {
  dialog.fileURL   = window.arguments[0];
  dialog.fileName  = window.arguments[1];
  dialog.callbacks = window.arguments[2];
  dialog.aborted   = false;

  dialog.frame     = document.getElementById('import-frame');
  dialog.label     = document.getElementById('progress-label');
  dialog.progress  = document.getElementById('progress-meter');
  dialog.sb        = document.getElementById('celtx-bundle');

  // Load progress listener for the import frame
  var ir = dialog.frame.docShell.QueryInterface(nsIInterfaceRequestor);
  var wp = ir.getInterface(nsIWebProgress);
  wp.addProgressListener(importLoadProgressListener,
                         nsIWebProgress.NOTIFY_STATE_WINDOW);

  dialog.label.value =
    dialog.sb.getFormattedString('importingProject', [ dialog.fileName ]);
  dialog.progress.value = 5;

  dialog.frame.setAttribute('src', dialog.fileURL);
}



function canceled () {
  dialog.aborted = true;
}




function importFrameLoaded () {
  dialog.progress.value = 10;

  var doc = dialog.frame.contentDocument;

  // Simple-minded format detection
  var tag = 'body';
  if (doc.getElementsByTagName('a').length > 0) tag = 'pre';

  var body = doc.getElementsByTagName(tag)[0];
  var txt  = stringify_ws(body);

  var progressFn = function (n) {
    dialog.progress.value = 10 + 40 * n;
  };

  dialog.progress.mode = 'determined';

  parse_script(txt, progressFn, importCallback);
}


function importCallback (importDoc) {
  if (! importDoc) return;

  try {
    var xsl = document.implementation.createDocument('', '', null);
    xsl.async = false;
    xsl.load(Cx.CONTENT_PATH + 'import.xml');

    var proc = new XSLTProcessor();    
    proc.importStylesheet(xsl);

    dialog.progress.value = 55;

    var scriptDoc = proc.transformToDocument(importDoc);

    var heap = {
      scenes: scriptDoc.getElementsByTagName('div'),
      count: 0,
      limit: 0,
      chunkSize: 0
    };
    heap.limit = heap.scenes.length;

    var n = Math.ceil(heap.limit / SCENE_CHUNK_COUNT);
        n = Math.max(n, SCENE_CHUNK_MIN);
        n = Math.min(n, SCENE_CHUNK_MAX);
    heap.chunkSize = n;

    dialog.progress.value = 60;

    var target = dialog.callbacks.target;
    target[dialog.callbacks.beginImport]();

    setTimeout(importScene, SCENE_CHUNK_DELAY, heap);
  }
  catch (ex) {
    dump("importCallback:" + ex + "\n");
  }

}


function importScene (heap) {

  for (var i = 0; i < heap.chunkSize; i++) {
    if (heap.count == heap.limit) {
      var target = dialog.callbacks.target;
      target[dialog.callbacks.endImport]();
      dialog.progress.value = 100;
      setTimeout(window.close, 200);
      return;
    }

    var target = dialog.callbacks.target;
    target[dialog.callbacks.importScene](heap.scenes[heap.count++]);
  }

  dialog.progress.value = 60 + 35 * heap.count / heap.limit;
  setTimeout(importScene, SCENE_CHUNK_DELAY, heap);
}


var importLoadProgressListener = {
  QueryInterface: function (iid) {
    if (iid.equals(nsIWebProgressListener) ||
        iid.equals(nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },
  onStateChange: function (webProgress, request, stateFlags, status) {
    if (stateFlags & nsIWebProgressListener.STATE_STOP) {
      setTimeout(importFrameLoaded, 100);
    }
  }
};
