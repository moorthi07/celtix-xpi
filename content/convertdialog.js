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


var dialog = {};


function loaded () {
  dialog.fileURL   = window.arguments[0];
  dialog.itemMap   = window.arguments[1];
  dialog.descMap   = window.arguments[2];
  dialog.version   = window.arguments[3];
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

  dialog.label.value = 'Converting script...';
  dialog.progress.value = 10;

  dialog.frame.setAttribute('src', dialog.fileURL);
}


function canceled () {
  dialog.aborted = true;
}


function importFrameLoaded () {
  try {
    dialog.progress.value = 20;

    var xslFile = Cx.TRANSFORM_PATH + 'convert-' + dialog.version + '.xml';
    var xsl = document.implementation.createDocument('', '', null);
    xsl.async = false;
    xsl.load(xslFile);
    var proc = new XSLTProcessor();
    proc.importStylesheet(xsl);

    dialog.progress.value = 30;

    var oldDoc = dialog.frame.contentDocument;
    var mapDiv = oldDoc.createElement('div');
    mapDiv.setAttribute('id', 'scenes');
    var ul, li, e;
    for (e in dialog.itemMap) {
      ul = oldDoc.createElement('ul');
      ul.setAttribute('uri', e);
      for (var i in dialog.itemMap[e]) {
        li = oldDoc.createElement('li');
        li.appendChild(oldDoc.createTextNode(dialog.itemMap[e][i]));
        ul.appendChild(li);
      }
      mapDiv.appendChild(ul);
    }
    oldDoc.body.appendChild(mapDiv);

    // Descriptions
    var title, desc;
    var descMapDiv = oldDoc.createElement('div');
    descMapDiv.setAttribute('id', 'scene-descriptions');
    for (e in dialog.descMap) {
      ul = oldDoc.createElement('ul');
      ul.setAttribute('uri', e);
      li = oldDoc.createElement('li');

      title = dialog.descMap[e].title;
      if (title != '' && title.match(/\D/)) {
        li.appendChild(oldDoc.createTextNode(title));
      }
      
      desc = dialog.descMap[e].desc;
      if (desc != '') {
        if (title != '') li.appendChild(oldDoc.createTextNode(': '));
        li.appendChild(oldDoc.createTextNode(desc));
      }

      ul.appendChild(li);
      descMapDiv.appendChild(ul);
    }
    oldDoc.body.appendChild(descMapDiv);

    dialog.progress.value = 50;
    var doc = proc.transformToDocument(oldDoc);
    dialog.progress.value = 70;

    saveHTML(doc, dialog.fileURL);
    dialog.progress.value = 100;
  }
  catch (ex) {
    dump("convert: " + ex + "\n");
  }
  finally {
    setTimeout(window.close, 100);
  }
}


function saveHTML (doc, fileURL) {
  // XXX make backup copy?

  var persist = getWebBrowserPersist();
  var file    = IFile(fileURL);

  var flags = persist.ENCODE_FLAGS_WRAP
            | persist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
            | persist.ENCODE_FLAGS_FORMATTED;
  var wrap = 80;

  persist.persistFlags = persist.persistFlags
                       | persist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                       | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                       | persist.PERSIST_FLAGS_DONT_FIXUP_LINKS
                       | persist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
                       | persist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

  persist.saveDocument(doc,
                       file,
                       null,  // Related files dir
                       'text/html',
                       flags,
                       wrap);
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
