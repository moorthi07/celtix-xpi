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
  dialog.close   = dialog.self.getButton('cancel');

  dialog.message = {
    current: document.getElementById('current-message'),
    overall: document.getElementById('overall-message')
  };

  dialog.meter = {
    current: document.getElementById('current-meter'),
    overall: document.getElementById('overall-meter')
  };

  dialog.uploads = [];
  dialog.uploadCount = 0;
  dialog.uploadMax = 0;

  msg('current', dialog.sb.getFormattedString('pubPreparingMsg',
                                              [ dialog.config.project.title ]));
  msg('overall', dialog.sb.getString('overallProgress'));

  setTimeout(delayedLoad, 100);
}


function msg (m, s) { dialog.message[m].value = s; }
function mtr (m, v) { dialog.meter[m].value   = v; }


// Authentication --------------------------------------------------------

function delayedLoad () {
  msg('current', dialog.sb.getString('contactingServer'));

  setCursor('wait');
  authenticate('publish', authentication);
}


function authentication (rv) {
  setCursor('default');

  if (! rv) {
    msg('current', dialog.sb.getString('authError'));
    dialog.close.label = dialog.sb.getString('Close');
    return;
  }

  msg('current', dialog.sb.getString('authSuccess'));

  try {
    startUpload();
  }
  catch (ex) {
    dump("startUpload: " + ex);
  }
}


// -----------------------------------------------------------------------


function closed () {
  // dump("closed\n");
}


function requestLoaded (evt) {
  gotResponse = true;
  // dump("requestLoaded\n");
  msg('current', dialog.sb.getString('responseReceived'));
  mtr('current', 100);

  var errDoc, err;

  if (req.status == 403) {
    // 403 Forbidden
    errDoc = req.responseXML;
    if (errDoc) {
      err = errDoc.documentElement.firstChild.nodeValue;
      dump("publish error: " + err + "\n");
    }
    msg('current', dialog.sb.getString('uploadForbiddenMsg'));
    alert(dialog.sb.getString('uploadForbiddenDesc'));
    return;
  }
  else if (req.status == 409) {
    // 409 Conflict
    errDoc = req.responseXML;
    if (errDoc) {
      err = errDoc.documentElement.firstChild.nodeValue;
      dump("publish conflict: " + err + "\n");
    }
    msg('current', dialog.sb.getString('pubConflictMsg'));
    alert(dialog.sb.getString('uploadConflictDesc'));
    return;
  }

  try {
    parseResponse(req.responseText);
  }
  catch (ex) {
    msg('current', dialog.sb.getString('uploadErrorMsg'));
    dump(ex);
    return;
  }

  // Remember the published version
  var ver = dialog.config.publishedVersion;
  // dump("published version " + ver + "\n");
  dialog.config.project.setPublishedVersion(ver);
  // KLUDGE: force a save of the model
  dialog.config.project.model.save();

  // Kick off the upload process
  maybeDoUpload();
}


var req = new XMLHttpRequest();

req.onload = requestLoaded;

req.onreadystatechange = function (evt) {
  // dump("readystatechange: " + req.readyState + "\n");
  // FIXME: silly progress indicator
  // dialog.meter.value = req.readyState * 10;
  mtr('current', req.readyState * 10);
};

// Never called: see mozilla bug #218236
// TODO: this may be fixed now
req.onerror = function (evt) {
  dump("onerror\n");
};


var gotResponse = false;

function checkStatus () {
  if (! gotResponse) {
    dialog.close.label = dialog.sb.getString('Close');
    dump("request timed out\n");
    msg('current', dialog.sb.getString('pubNoResponseMsg'));
  }
}



function startUpload () {
  // Build the list of files to upload
  var proj = dialog.config.project;

  dialog.uploads = proj.uploadableFiles;

  dialog.uploadMax = dialog.uploads.length;

  msg('current', dialog.sb.getString('pubSerializingModelMsg'));
  var dom = datastoreToDOM(dialog.config.project.model.ds);

  msg('current', dialog.sb.getString('pubSendingRDFMsg'));

  // KLUDGE - timer to handle errors
  setTimeout(checkStatus, 15*1000);

  // dump("publishURL: " + dialog.config.publishURL + "\n");
  req.open('POST', dialog.config.publishURL);

  // The request seems to figure this out itself
  // req.setRequestHeader('Content-Type', 'text/xml');
  req.send(dom);

  msg('current', dialog.sb.getString('pubWaitingMsg'));
}


function datastoreToDOM (ds) {
  try {
    var file = tempFile('cx-rdf-' + generateID() + '.xml');
    serializeDSToFile(ds, file);
    var dom = document.implementation.createDocument('', '', null);
    dom.async = false;
    dom.load(pathToFileURL(file));
    return dom;
  }
  catch (ex) {
    dump("datastoreToDOM: " + ex + "\n");
  }
}


function parseResponse (str) {
  const CI = Components.interfaces;

  var ios = getIOService();

  // TODO: a strToURI util function?
  var uri = ios.newURI(Cx.PROJECTS_URL, null, null);

  // Datasource
  var ds = getRDFXMLDataSource();

  var p  = getRDFXMLParser();
  p.parseString(ds, uri, str);

  var rdf = getRDFService();

  var scriptLocProp    = rdf.GetResource(Cx.NS_CX + 'scriptLocation');
  var resourceLocProp  = rdf.GetResource(Cx.NS_CX + 'resourceLocation');
  var publishedVerProp = rdf.GetResource(Cx.NS_CX + 'publishedVersion');
  var projRes          = rdf.GetResource(dialog.config.project.uri);

  var scriptLoc    = ds.GetTarget(projRes, scriptLocProp, true);
  scriptLoc        = scriptLoc.QueryInterface(CI.nsIRDFResource);

  var resourceLoc  = ds.GetTarget(projRes, resourceLocProp, true);
  resourceLoc      = resourceLoc.QueryInterface(CI.nsIRDFResource);

  var publishedVer = ds.GetTarget(projRes, publishedVerProp, true);
  publishedVer     = publishedVer.QueryInterface(CI.nsIRDFLiteral);

  dialog.config.scriptLocation   = scriptLoc.Value;
  dialog.config.resourceLocation = resourceLoc.Value;
  dialog.config.publishedVersion = publishedVer.Value;
}


function maybeDoUpload () {
  var file;
  if (file = dialog.uploads.pop()) {
    var progress = dialog.uploadCount / dialog.uploadMax * 100;
    mtr('overall', progress);
    // doUpload(file);
    checkUpload(file);
  }
  else {
    // dialog.meter.value = 100;
    mtr('current', 100);
    mtr('overall', 100);
    dialog.close.label = dialog.sb.getString('Close');
    msg('current', dialog.sb.getString('pubCompleteMsg'));
  }
}


var headReq = null;

function checkUpload (fileURL) {
  var file = IFile(fileURL);
  var url  = dialog.config.resourceLocation + '/' + file.leafName;
  
  headReq = new XMLHttpRequest();

  headReq.onload  = function () { headLoaded(fileURL) };
  headReq.onerror = function () { headError(fileURL)  };

  headReq.open('HEAD', url);
  headReq.send(null);
}


function headLoaded (fileURL) {
  dump("headLoaded: " + fileURL + ": status = " + headReq.status + "\n");

  if (headReq.status == 200) {
    // Compare content length
    // TODO: other checks: date, etc?
    var len  = headReq.getResponseHeader('Content-Length');
    var file = IFile(fileURL);
    if (file.fileSize != len) {
      doUpload(fileURL);
    }
    else {
      // File is unchanged
      dialog.uploadCount++;
      maybeDoUpload();
    }
  }
  else {
    doUpload(fileURL);
  }
}


function headError (fileURL) {
  dump("headError: " + fileURL + "\n");
  maybeDoUpload();
}


function doUpload (fileURL) {
  dump("doUpload: " + fileURL + "\n");
  try {
    var ios  = getIOService();

    var file = IFile(fileURL);
    var loc  = dialog.config.resourceLocation + '/' + file.leafName;
    var uri  = ios.newURI(loc, null, null);

    // DEBUG
    size[loc] = file.fileSize;

    uri = uri.QueryInterface(Components.interfaces.nsIURL);  // XXX really necessary?

    var src  = ios.newURI(fileURL, null, null);
    src = src.QueryInterface(Components.interfaces.nsIURL);    

    persist = getWebBrowserPersist();

    // TODO: may need to set persistFlags to bypass cache, replace
    // existing files?
    // XXX valid for upload?
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;

    persist.progressListener = uploadListener;

    persist.saveURI(src, null, null, null, null, uri);
  }
  catch (ex) {
    dump("doUpload: " + ex + "\n");
  }

}


var size = {};
var seen = {};
var total = 0;


function startProgress (request) {
  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var url = channel.URI.QueryInterface(Components.interfaces.nsIURL);
    var fileExt = url.fileName.match(/[^.]+$/)[0];
    msg('current', dialog.sb.getFormattedString('pubUploading', [ fileExt ]));
  }
  catch (ex) {
    dump("startProgress: " + ex + "\n");
  }
  mtr('current', 0);
}


function stopProgress (request) {
  mtr('current', 100);
  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var uri = channel.URI.spec;
    if (seen[uri]) {
      total += seen[uri];
    }
    else {
      // Fallback to local size + approx HTTP header overhead
      total += size[uri] + 524;
    }
    dump("stop: " + uri + ", total: " + total + "\n");
  }
  catch (ex) {
    dump("stopProgress: " + ex + "\n");
  }
}


function updateProgress (request, current, maximum) {
  // Test for magic 10000?
  if (current == maximum) return;

  try {
    var channel = request.QueryInterface(Components.interfaces.nsIChannel);
    var uri = channel.URI.spec;
    // dump("progress: " + uri + "\n");
    // dump("  cur: " + current + ", max: " + maximum + ", total: " + total + "\n");

    if (! seen[uri]) {
      // dump("seen: " + uri + ": " + maximum + "\n");
      seen[uri] = maximum;
    }

    var actual = current - total;
    mtr('current', actual / maximum * 100);
  }
  catch (ex) {
    dump("updateProgress: " + ex + "\n");
  }
}


const nsIWebProgressListener   = Components.interfaces.nsIWebProgressListener;
const nsISupportsWeakReference = Components.interfaces.nsISupportsWeakReference;


var uploadListener = {

  QueryInterface: function (id) {
    if (id.equals(nsIWebProgressListener) ||
        id.equals(nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function (webProgress, request, stateFlags, status) {
    if (stateFlags & nsIWebProgressListener.STATE_START &&
        stateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      startProgress(request);
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP &&
             stateFlags & nsIWebProgressListener.STATE_IS_NETWORK) {
      dialog.uploadCount++;
      stopProgress(request);
      maybeDoUpload();
    }
  },

  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    updateProgress(request, curTotalProgress, maxTotalProgress);
  },

  onLocationChange: function (webProgress, request, location) { },

  onStatusChange: function (webProgress, request, status, message) { },

  onSecurityChange: function (webProgress, request, state) { }
};
