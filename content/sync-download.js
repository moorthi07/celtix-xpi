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
  dialog.sb      = document.getElementById('celtx-bundle');

  dialog.self    = document.documentElement;
  dialog.close   = dialog.self.getButton('cancel');

  dialog.message = {
    current: document.getElementById('current-message'),
    overall: document.getElementById('overall-message')
  };

  dialog.meter = {
    current: document.getElementById('current-meter'),
    overall: document.getElementById('overall-meter')
  };

  dialog.downloads = [];
  dialog.downloadCount = 0;
  dialog.downloadMax = 0;

  msg('current',
      dialog.sb.getFormattedString('preparingToGet', [ dialog.config.title ]));
  msg('overall',
      dialog.sb.getString('overallProgress'));

  try {
    startDownload();
  }
  catch (ex) { dump(ex) }
}


function closed () {
  // dialog.config.canceled = true;
  // TODO: tell project manager was canceled?
}


function msg (m, s) { dialog.message[m].value = s; }
function mtr (m, v) { dialog.meter[m].value   = v; }

var persist = null;

var req = new XMLHttpRequest();

req.onload = requestLoaded;


function startDownload () {
  dialog.downloadRoot = dialog.config.manager.initDownload(dialog.config.uri,
    dialog.config.projdir);
  dump("downloadRoot: " + dialog.downloadRoot + "\n");

  // Maybe make contents.rdf the Index page for these uris?
  var url = dialog.config.uri;
  var filename = url.match(/([^\/]+$)/)[1];
  var fileExt = filename.match(/[^.]+$/)[0];
  msg('current', dialog.sb.getFormattedString('getting', [ fileExt ]));
  req.open('GET', url);
  req.send(null);
}


function finishDownload () {
  if (dialog.downloadCount > 0) {
    mtr('current', 100);
    msg('current',
        dialog.sb.getFormattedString('finishCount', [ dialog.downloadCount ]));
    mtr('overall', 100);
    try{
      dialog.config.manager.notifyDownload(dialog.config.uri);
    } catch (ex) { dump(ex) }

    dialog.config.succeeded = true;
    setTimeout(function () { dialog.self.cancelDialog() }, 500);
  }
  else {
    mtr('current', 100);
    mtr('overall', 100);
    msg('current', dialog.sb.getString('noFiles'));
    // TODO: notify PM?
  }
  dialog.close.label = dialog.sb.getString('Close');
}


function requestLoaded (evt) {
  msg('current', dialog.sb.getString('responseReceived'));

  try {
    parseResponse(req.responseText);
  }
  catch (ex) {
    dump(ex);
    return;
  }

  // Kick off the upload process
  maybeDoDownload();
}


function parseResponse (str) {
  var ios = getIOService();

  // TODO: a strToURI util function?
  var uri = ios.newURI(Cx.PROJECTS_URL, null, null);

  // Datasource
  var ds = getRDFXMLDataSource();

  var p  = getRDFXMLParser();
  p.parseString(ds, uri, str);

  var rdf = getRDFService();

  var projRes = rdf.GetResource(dialog.config.uri);

  var cont = getRDFContainer();
  var cu   = getRDFContainerUtils();

  if (! cu.IsContainer(ds, projRes)) {
    throw "Not a Seq: " + dialog.config.uri;
  }
  cont.Init(ds, projRes);

  var elem;
  var iter = cont.GetElements();
  while (iter.hasMoreElements()) {
    elem = iter.getNext();
    elem = elem.QueryInterface(Components.interfaces.nsIRDFResource);
    // dump("element: " + elem.Value + "\n");
    dialog.downloads.push(elem.Value);
    dialog.downloadMax++;
  }
}


// nextDownload?
function maybeDoDownload () {
  var file;
  if (file = dialog.downloads.pop()) {
    // TODO: better progress based on actual download sizes
    var progress = dialog.downloadCount / dialog.downloadMax * 100;
    mtr('overall', progress);
    doDownload(file);
  }
  else {
    finishDownload();
  }
}


function doDownload (fileURL) {
  var src  = fileURL;
  var path = dialog.downloadRoot;  // download dir

  try {
    var ios = getIOService();

    var uri = ios.newURI(src, null, null);
    // Turn uri -> url so we can get filename
    uri = uri.QueryInterface(Components.interfaces.nsIURL);

    var f = IFile(path);
    f.append(uri.fileName);

    persist = getWebBrowserPersist();

    // TODO: may need to set persistFlags to bypass cache, replace
    // existing files?
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;

    persist.progressListener = persistProgressListener;

    persist.saveURI(uri, null, null, null, null, f);
  }
  catch (ex) {
    dump("doDownload: " + ex + "\n");
  }

}


function startProgress (request) {
  var filename = request.name.match(/([^\/]+)$/)[1];
  var fileExt = filename.match(/[^.]+$/)[0];
  msg('current', dialog.sb.getFormattedString('getting', [ fileExt ]));
  mtr('current', 0);
}


function stopProgress (request) {
  mtr('current', 100);
}

function updateProgress (request, current, maximum) {
  mtr('current', current / maximum * 100);
}


const nsIWebProgressListener   = Components.interfaces.nsIWebProgressListener;
const nsISupportsWeakReference = Components.interfaces.nsISupportsWeakReference;


var persistProgressListener = {

  QueryInterface: function (id) {
    if (id.equals(nsIWebProgressListener) ||
        id.equals(nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function (webProgress, request, stateFlags, status) {
    if (stateFlags & nsIWebProgressListener.STATE_START) {
      startProgress(request);
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP) {
      dialog.downloadCount++;
      stopProgress(request);
      maybeDoDownload();
    }
  },

  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    updateProgress(request, curSelfProgress, maxSelfProgress);
  },

  onLocationChange: function (webProgress, request, location) { },

  onStatusChange: function (webProgress, request, status, message) { },

  onSecurityChange: function (webProgress, request, state) { }
};
