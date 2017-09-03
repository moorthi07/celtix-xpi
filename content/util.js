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

const ID_CHARS =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ID_CHARS_LEN   = 62;
const ID_DEFAULT_LEN = 6;


function ucfirst (str) {
  if (str == '') return '';
  return str.charAt(0).toUpperCase() + str.substr(1);
}


// Returns the first element in array whose attr matches the supplied value
function lookup (array, attr, match) {
  if (! array instanceof Array || attr == '') return;

  for (var i = 0; i < array.length; i++) {
    if (attr in array[i] && array[i][attr] == match) return array[i];
  }

  return null;
}


// Like lookup, above, but return index of match rather than the
// object, or -1 if not found.
function ilookup (array, attr, match) {
  if (! array instanceof Array || attr == '') return -1;

  for (var i = 0; i < array.length; i++) {
    if (attr in array[i] && array[i][attr] == match) return i;
  }

  return -1;
}


function generateID () {
  var id = '';
  for (var i = 0; i < ID_DEFAULT_LEN; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS_LEN)];
  }
  return id;
}


function gatherTextUnder (root) {
  var nodes = new Array(root);
  var text  = '';

  while (nodes.length > 0) {
    var node = nodes.pop();
    if (node.nodeType == 3) {
      var s = new String(node.nodeValue);
      // Trim trailing spaces
      s = s.replace(/ +$/gm, '');
      text += s;
    }

    if (node.hasChildNodes()) {
      for (var i = node.childNodes.length - 1; i >= 0; i--) {
        nodes.push(node.childNodes[i]);
      }
    }
  }

  return text;
}


function stringify (node) {
  try {
    var xpe = new XPathEvaluator();
    var rv = xpe.evaluate('normalize-space(string(.))',
                          node, null, XPathResult.STRING_TYPE, null);
    return rv.stringValue;
  }
  catch (ex) {
    dump("stringify: " + ex + "\n");
  }
  return '';
}


function stringify_ws (node) {
  try {
    var xpe = new XPathEvaluator();
    var rv = xpe.evaluate('string(.)',
                          node, null, XPathResult.STRING_TYPE, null);
    return rv.stringValue;
  }
  catch (ex) {
    dump("stringify_ws: " + ex + "\n");
  }
  return '';
}


// Given a DOM node, return an xpath expression locating it
function xpathForNode (node) {
  if (! (node && node.nodeType == document.ELEMENT_NODE)) return;

  var parent = node.parentNode;
  if (parent.nodeType == document.ELEMENT_NODE) {
    var pos = 0;
    for (var i = 0; i < parent.childNodes.length; i++) {
      var curr = parent.childNodes[i];
      if (curr.localName == node.localName) pos++;
      if (curr == node) {
        if (curr.getAttribute('id')) {
          return curr.localName + "[@id='" + curr.getAttribute('id') + "']";
        }
        else {
          return xpathForNode(parent) + '/' + curr.localName +
                 '[' + pos + ']';
        }
      }
    }
  }
  else {
    return '/' + node.localName;
  }
}


// Returns a unique temp file path based on name
function tempFile (name) {
  if (name == '') name = 'moztmp';

  var ds = Components
             .classes['@mozilla.org/file/directory_service;1']
             .getService(Components.interfaces.nsIDirectoryServiceProvider);
  var persist = {};
  var tmpDir  = ds.getFile('TmpD', persist);
  tmpDir.append(name);
  tmpDir.createUnique(0, 0600);

  return tmpDir.path;
}


function userDocsDir() {
  var dirsvc = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIDirectoryServiceProvider);
  var dir = null;
  if (isMac())
    dir = dirsvc.getFile("UsrDocs", {value:0});
  else if (isWin())
    dir = dirsvc.getFile("Pers", {value:0});
  else
    dir = dirsvc.getFile("Home", {value:0});
  return dir;
}


function isoDateTime() {
  var now = new Date();

  var year   = now.getUTCFullYear();
  var month  = now.getUTCMonth() + 1;
  var day    = now.getUTCDate();
  var hour   = now.getUTCHours();
  var minute = now.getUTCMinutes();
  var second = now.getUTCSeconds();

  if (month  < 10) month  = '0' + month;
  if (day    < 10) day    = '0' + day;
  if (hour   < 10) hour   = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  if (second < 10) second = '0' + second;

  var time = year + '-' + month + '-' + day + 'T' +
             hour + ':' + minute + ':' + second + 'Z';

  return time;
}


function ISODateStringToDate(isoDate) {
  var elems = isoDate.match(/(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z/);
  return new Date(elems[1], elems[2]-1, elems[3], elems[4], elems[5], elems[6]);
}


function DateTransformerEnumerator(enumerator) {
  this.enumerator = enumerator;
  this.svc = getRDFService();
}

DateTransformerEnumerator.prototype.QueryInterface = function(iid) {
  if (iid.equals(Components.interfaces.nsISupports) ||
      iid.equals(Components.interfaces.nsISimpleEnumerator))
    return this;
  throw Components.results.NS_NOINTERFACE;
};

DateTransformerEnumerator.prototype.getNext = function() {
  var next = this.enumerator.getNext();
  next = next.QueryInterface(Components.interfaces.nsIRDFLiteral);
  var dateLit = ISODateStringToDate(next.Value);
  return this.svc.GetLiteral(dateLit.toLocaleDateString());
};

DateTransformerEnumerator.prototype.hasMoreElements = function() {
  return this.enumerator.hasMoreElements();
};


function DateTransformerDS (source) {
  this.source = source;
  this.svc = getRDFService();
}

DateTransformerDS.prototype = {
  source: null, // the internal data source,
  svc: null, // a cached copy of the RDFService
  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIRDFDataSource))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },

  URI getter: function() { return this.source.URI; },
  AddObserver: function(observer) { this.source.AddObserver(observer); },
  ArcLabelsIn: function(node) { return this.source.ArcLabelsIn(node); },
  ArcLabelsOut: function(source) { return this.source.ArcLabelsOut(source); },
  Assert: function(source, property, target, truthValue) {
    this.source.Assert(source, property, target, truthValue); },
  beginUpdateBatch: function() { this.source.beginUpdateBatch(); },
  Change: function(source, property, oldTarget, newTarget) {
    this.source.Change(source, property, oldTarget, newTarget); },
  DoCommand: function(sources, command, arguments) {
    this.source.DoCommand(sources, command, arguments); },
  endUpdateBatch: function() { this.source.endUpdateBatch(); },
  GetAllCmds: function(source) { return this.source.GetAllCmds(source); },
  GetAllResources: function() { return this.source.GetAllResources(); },
  GetSource: function(property, target, truthValue) {
    return this.source.GetSource(property, target, truthValue); },
  GetSources: function(property, target, truthValue) {
    return this.source.GetSources(property, target, truthValue); },
  GetTarget: function(source, property, truthValue) {
    var target = this.source.GetTarget(source, property, truthValue);
    if (target == null)
      return null;
    if (property.Value == Cx.NS_DC + "created" ||
        property.Value == Cx.NS_DC + "modified") {
      target = target.QueryInterface(Components.interfaces.nsIRDFLiteral);
      var dateLit = ISODateStringToDate(target.Value);
      return this.svc.GetLiteral(dateLit.toLocaleDateString());
    }
    else
      return target;
  },
  GetTargets: function(source, property, truthValue) {
    var targets = this.source.GetTargets(source, property, truthValue);
    if (property.Value == Cx.NS_DC + "created" ||
        property.Value == Cx.NS_DC + "modified")
      return new DateTransformerEnumerator(targets);
    else
      return targets;
  },
  hasArcIn: function(node, arc) { return this.source.hasArcIn(node, arc); },
  hasArcOut: function(source, arc) {
    return this.source.hasArcOut(source, arc); },
  HasAssertion: function(source, property, target, truthValue) {
    return this.source.HasAssertion(source, property, target, truthValue); },
  IsCommandEnabled: function(sources, command, arguments) {
    return this.source.IsCommandEnabled(sources, command, arguments); },
  Move: function(oldSource, newSource, property, target) {
    this.source.Move(oldSource, newSource, property, target); },
  RemoveObserver: function(observer) { this.source.RemoveObserver(observer); },
  Unassert: function(source, property, target) {
    this.source.Unassert(source, property, target); }
};


function ASSERT (expr, msg) {
  if (! expr) {
    dump("ASSERT: " + msg + "\n");
    // alert("ASSERT: " + msg);
    return false;
  }
  else {
    return true;
  }
}


function arrayRemoveAt (array, i) { array.splice(i, 1); }


// Find the named element containing the given node
function findContaining (node, name) {
  while (node && !(node.nodeType  == Node.ELEMENT_NODE &&
                   node.localName == name)) {
    node = node.parentNode;   // Will be null for root node
  }

  return node;
}


function previousElement (node) {
  if (! node) return;

  var n = node.previousSibling;
  while (n) {
    if (n.nodeType == node.ELEMENT_NODE) return n;
    n = n.previousSibling;
  }

  return null;
}


function nextElement (node) {
  if (! node) return;

  var n = node.nextSibling;
  while (n) {
    if (n.nodeType == node.ELEMENT_NODE) return n;
    n = n.nextSibling;
  }

  return null;
}


function el (id) {
  return document.getElementById(id);
}


function strToURL (str) {
  var url = Components.classes['@mozilla.org/network/standard-url;1']
              .createInstance(Components.interfaces.nsIStandardURL);
  url.init(url.URLTYPE_STANDARD, 0, str, null, null);
  url = url.QueryInterface(Components.interfaces.nsIURL);
  return url;
}


function serializeDOMtoFile (dom, path) {
  try {
    var serializer = new XMLSerializer();
    var file = IFile(path);
    var os = Components.classes['@mozilla.org/network/file-output-stream;1']
        .createInstance(Components.interfaces.nsIFileOutputStream);
    // RDWR, CREAT, APPEND flags
    os.init(file, 0x04 | 0x08 | 0x20, 0644, 0);
    serializer.serializeToStream(dom, os, "utf-8");
    os.close();
    return true;
  }
  catch (ex) {
    dump("serializeDOMtoFile: " + ex + "\n");
    return false;
  }
}


function serializeDSToFile (ds, path) {
  try {
    var serializer = getRDFXMLSerializer();
    var file = IFile(path);
    var os = Components.classes['@mozilla.org/network/file-output-stream;1']
        .createInstance(Components.interfaces.nsIFileOutputStream);
    // RDWR, CREAT, APPEND flags
    os.init(file, 0x04 | 0x08 | 0x20, 0644, 0);
    serializer.init(ds);
    serializer.Serialize(os);
    os.close();
    return true;
  }
  catch (ex) {
    dump("serializeDStoFile: " + ex + "\n");
    return false;
  }
}


function copyFile (src, dest, name) {
  try {
    var f = IFile(src);
    var d = IFile(dest);
    f.copyTo(d, name);
  }
  catch (ex) {
    dump("copyFile: " + ex + "\n");
    return false;
  }

  return true;
}


// Unix-style path, or fileuri
function IFile (path) {
  // dump("IFile: " + path + "\n");
  if (path.constructor != String) {
    dump("IFile: path is not a string\n");
    return null;
  }

  var file;

  if (path.search(/^file:/) == 0) {
    try {
      var ios = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);
      var url = ios.newURI(path, null, null);
      url = url.QueryInterface(Components.interfaces.nsIFileURL);
      file = url.file.clone();
    }
    catch (ex) {
      dump("IFile: error converting to path: " + ex + "\n");
      file = null;
    }
  }
  else {
    // Assume a native path
    try {
      file = Components.classes['@mozilla.org/file/local;1']
               .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(path);
    }
    catch (ex) {
      dump("IFile: error creating from native path: " + ex + "\n");
      file = null;
    }
  }

  return file;
}


function writeFile (str, path) {
  var file = IFile(path);
  if (! file) return false;

  try {
    if (file.exists()) {
      if (! file.isWritable()) throw new Error("File not writable");
    }
    else {
      file.create(0x0, 0644);
    }
  }
  catch (ex) {
    dump("writeFile: error initializing " + file.path + "\n");
    return false;
  }

  try {
    var os = Components.classes['@mozilla.org/network/file-output-stream;1']
               .createInstance(Components.interfaces.nsIFileOutputStream);
    // RDWR, CREAT, APPEND flags
    os.init(file, 0x04 | 0x08 | 0x20, 0644, 0);
    os.write(str, str.length);
    os.close();
  }
  catch (ex) {
    dump("writeFile: error writing " + file.path + ": " + ex + "\n");
    return false;
  }

  return true;
}


// Slurps a file into a string
function readFile (path) {
  var file = IFile(path);
  if (! file) return false;

  try {
    if (file.exists()) {
      if (! file.isReadable()) throw new Error("File not readable");
    }
    else {
      throw new Error("File not found");
    }
  }
  catch (ex) {
    dump("readFile: error reading " + file.path + ": " + ex + "\n");
    return '';
  }

  var str = '';

  try {
    var is = Components.classes['@mozilla.org/network/file-input-stream;1']
               .createInstance(Components.interfaces.nsIFileInputStream);
    is.init(file, 0x01, 0444, null);

    var sis = Components.classes['@mozilla.org/scriptableinputstream;1']
                .createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(is);

    str = sis.read(file.fileSize);
    sis.close();
  }
  catch (ex) {
    dump("readFile: error reading " + file.path + ": " + ex + "\n");
    return '';
  }

  return str;
}


function getIOService () {
  var ios = Components.classes['@mozilla.org/network/io-service;1']
                      .getService(Components.interfaces.nsIIOService);
  return ios;
}


function getAtomService () {
  var as = Components.classes["@mozilla.org/atom-service;1"]
                    .getService(Components.interfaces.nsIAtomService);
  return as;
}


function getMIMEService () {
  var ms = Components.classes['@mozilla.org/mime;1'].getService()
                     .QueryInterface(Components.interfaces.nsIMIMEService);
  return ms;
}


function getRDFService () {
  var s = Components.classes['@mozilla.org/rdf/rdf-service;1']
                    .getService(Components.interfaces.nsIRDFService);
  return s;
}


function getRDFContainer () {
  var c = Components.classes['@mozilla.org/rdf/container;1']
                    .createInstance(Components.interfaces.nsIRDFContainer);
  return c;
}


function getRDFContainerUtils () {
  var s = Components.classes['@mozilla.org/rdf/container-utils;1']
                    .getService(Components.interfaces.nsIRDFContainerUtils);
  return s;
}


function getXULSortService () {
  var s = Components.classes['@mozilla.org/xul/xul-sort-service;1']
                    .getService(Components.interfaces.nsIXULSortService);
  return s;
}


function getRDFXMLParser () {
  var p = Components.classes['@mozilla.org/rdf/xml-parser;1'].createInstance()
                    .QueryInterface(Components.interfaces.nsIRDFXMLParser);
  return p;
}


function getRDFXMLSerializer () {
  var rs = Components.classes['@mozilla.org/rdf/xml-serializer;1']
             .getService(Components.interfaces.nsIRDFXMLSerializer);
  rs = rs.QueryInterface(Components.interfaces.nsIRDFXMLSource);
  return rs;
}


function getRDFXMLDataSource () {
  var ds = Components.classes['@mozilla.org/rdf/datasource;1?name=xml-datasource']
                     .createInstance();
  ds = ds.QueryInterface(Components.interfaces.nsIRDFDataSource);
  return ds;
}


function getBufferedInputStream () {
  var s = Components.classes['@mozilla.org/network/buffered-input-stream;1']
                    .createInstance(Components.interfaces.nsIBufferedInputStream);
  return s;
}


function getWebBrowserPersist () {
  var wbp =
    Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
              .createInstance(Components.interfaces.nsIWebBrowserPersist);
  return wbp;
}


function getRemoteDataSource (url) {
  var rdf = Components.classes['@mozilla.org/rdf/rdf-service;1']
                      .getService(Components.interfaces.nsIRDFService);
  var ds  = rdf.GetDataSource(url);
  ds = ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
  return ds;
}


function getDirectoryService () {
  var ds = Components.classes['@mozilla.org/file/directory_service;1']
                     .getService(Components.interfaces.nsIProperties);
  return ds;
}


function getWindowMediator () {
  var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator);
  return wm;
}


function getPrefService () {
  var ps = Components.classes['@mozilla.org/preferences-service;1']
                     .getService(Components.interfaces.nsIPrefService);
  ps = ps.getBranch(null);
  return ps;
}


function getStringBundleService () {
  var bs = Components.classes['@mozilla.org/intl/stringbundle;1']
                     .getService(Components.interfaces.nsIStringBundleService);
  return bs;
}


function getFilePicker () {
  var fp = Components.classes['@mozilla.org/filepicker;1']
                     .createInstance(Components.interfaces.nsIFilePicker);
  return fp;
}


function getAuthManager () {
  var mgr = Components.classes['@mozilla.org/network/http-auth-manager;1']
                      .getService(Components.interfaces.nsIHttpAuthManager);
  return mgr;
}


function getDownloader () {
  var dl = Components.classes['@mozilla.org/network/downloader;1']
                     .createInstance(Components.interfaces.nsIDownloader);
  return dl;
}


function getObserverService () {
  var os = Components.classes['@mozilla.org/observer-service;1']
                     .getService(Components.interfaces.nsIObserverService);
  return os;
}


function getInMemoryDatasource () {
  var ds = Components.classes['@mozilla.org/rdf/datasource;1?name=in-memory-datasource']
                     .createInstance(Components.interfaces.nsIRDFDataSource);
  return ds;
}


function getEditorSpellCheck () {
  var sc = Components.classes['@mozilla.org/editor/editorspellchecker;1']
                     .createInstance(Components.interfaces.nsIEditorSpellCheck);
  return sc;
}


function getTextServicesFilter () {
  var tf = Components.classes['@mozilla.org/editor/txtsrvfilter;1']
                     .createInstance(Components.interfaces.nsITextServicesFilter);
  return tf;
}


function getFindService () {
  var fs = Components.classes['@mozilla.org/find/find_service;1']
                     .getService(Components.interfaces.nsIFindService);
  return fs;
}


function getRangeFind () {
  var rf = Components.classes['@mozilla.org/embedcomp/rangefind;1']
                     .createInstance(Components.interfaces.nsIFind);
  return rf;
}


function getTransferable () {
  var t = Components.classes['@mozilla.org/widget/transferable;1']
                    .createInstance(Components.interfaces.nsITransferable);
  return t;
}


function getClipboard () {
  var cb = Components.classes['@mozilla.org/widget/clipboard;1']
                     .getService(Components.interfaces.nsIClipboard);
  return cb;
}


function getPromptService () {
  var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                     .getService(Components.interfaces.nsIPromptService);
  return ps;
}


function createSupportsString (str) {
  var s = Components.classes['@mozilla.org/supports-string;1']
                    .createInstance(Components.interfaces.nsISupportsString);
  if (str) s.data = str;
  return s;
}


function createSupportsCString (str) {
  var s = Components.classes['@mozilla.org/supports-cstring;1']
                    .createInstance(Components.interfaces.nsISupportsCString);
  if (str) s.data = str;
  return s;
}


function createSupportsArray () {
  var a = Components.classes['@mozilla.org/supports-array;1']
                    .createInstance(Components.interfaces.nsISupportsArray);
  return a;
}


function mimeTypeFromURI (uri) {
  var ms = getMIMEService();
  // Compatibility for Seamonkey or Firefox
  if      ('GetTypeFromURI' in ms) return ms.GetTypeFromURI(uri);
  else if ('getTypeFromURI' in ms) return ms.getTypeFromURI(uri);
  else return '';
}


// Returns an nsIFile
function currentProfileDir () {
  var ds = getDirectoryService();
  var profileDir = ds.get('ProfD', Components.interfaces.nsIFile);

  return profileDir;
}


function pathToFileURL (path) {
  return 'file://' + path;
}


function ensureExtension (file, ext) {
  var re = new RegExp('\.' + ext + '$');

  if (! file.leafName.match(re)) {
    file.leafName += '.' + ext;
  }
}


function isMac () {
  return navigator.platform.indexOf('Mac') != -1;
}


function isWin () {
  return navigator.platform.indexOf('Win') != -1;
}


function isValidFilename (fname) {
  // I've tried to pull this list from a number of sources, including
  // http://www.portfoliofaq.com/pfaq/FAQ00352.htm and various Windows/Unix
  // references. Some characters may be illegal on one platform and not
  // another, but it makes our own lives easier if we discourage users from
  // using file names that are not universally accepted.

  // Cannot begin with a period
  if (fname.match(/^\./)) return false;
  // Cannot end with a period
  if (fname.match(/\.$/)) return false;
  // Cannot contain certain punctuation (, : ; / \ ? * " < > | % # $)
  if (fname.match(/[:;\/\\?*"<>|%$]/)) return false; //"

  return true;
}


function sanitizeFilename (fname) {
  fname = fname.replace(/^\./, "");
  fname = fname.replace(/\.$/, "");
  fname = fname.replace(/[\/\\:]/g, " ");
  fname = fname.replace(/[*?"<>|%$]/g, ""); //"
  return fname;
}


// Returns true if a plug-in exists to handle a given MIME type (e.g.,
// "audio/x-aiff").
function handlesMIMEType (type)
{
    for (var i = 0; i < navigator.plugins.length; i++)
    {
        var plugin = navigator.plugins[i];
        for (var j = 0; j < plugin.length; j++)
        {
            var mimetype = plugin[j];
            if (mimetype.type == type)
                return true;
        }
    }
    return false;
}

// Returns an array of file suffixes supported for a given MIME content
// type (don't supply subtype, e.g., use only "audio" instead of
// "audio/x-aiff").
function suffixesForContentType (type)
{
    type = type.toLowerCase();
    var suffixes = [];
    for (var i = 0; i < navigator.plugins.length; i++)
    {
        var plugin = navigator.plugins[i];
        for (var j = 0; j < plugin.length; j++)
        {
            var mimeType = plugin[j];
            if (mimeType.type.indexOf(type) == 0)
                suffixes = suffixes.concat(mimeType.suffixes.split(','));
        }
    }
    return suffixes;
}


function mediaTypeOf (url) {
  try {
    var ms   = getMIMEService();
    var mt   = ms.getTypeFromURI(url);
    var type = mt.split('/').shift();
    return Cx.NS_CX + ucfirst(type);
  }
  catch (ex) {
    dump("mediaTypeOf: " + ex + "\n");
  }
}


// Returns the content type (without subtype) for the given file suffix,
// or null if it can't be identified.
function typeForSuffix (suffix)
{
    suffix = suffix.toLowerCase();
    if (suffix.match(/(jpe?g|png|gif|bmp)/))
        return 'image';
    for (var i = 0; i < navigator.plugins.length; i++)
    {
        var plugin = navigator.plugins[i];
        for (var j = 0; j < plugin.length; j++)
        {
            var mimeType = plugin[j];
            var suffixes = mimeType.suffixes.split(',');
            for (var k = 0; k < suffixes.length; k++)
            {
                if (suffix == suffixes[k])
                    return mimeType.type.split('/').shift();
            }
        }
    }
    return null;
}


// Returns a FilePicker filter string from an array of file suffixes
function filePickerFilter (suffixes) {
  var wildcards = [];
  for (var i = 0; i < suffixes.length; i++) {
    dump("suffix: " + suffixes[i] + "\n");
    wildcards.push('*.' + suffixes[i]);
  }
  return wildcards.join('; ');
}


// Authentication
function authenticate (service, callback) {
  dump("authenticate: " + service + "\n");

  var authMgr = getAuthManager();

  // Check if already auth'd, callback true if so
  var authenticated = true;
  var rv = { domain: {}, username: {}, password: {} };

  try {
    // Throws an exception if not auth'd
    authMgr.getAuthIdentity(Cx.AUTH_SCHEME, Cx.PUBLISH_SERVER, Cx.AUTH_PORT,
                            Cx.AUTH_TYPE, Cx.AUTH_REALM, Cx.AUTH_PATH,
                            rv.domain, rv.username, rv.password);
  }
  catch (ex) {
    authenticated = false;
  }

  if (authenticated) {
    // XXX maybe test-auth with current credentials anyway?
    dump("already auth'd\n");
    // dump("rv.username.value: " + rv.username.value + "\n");
    callback(true);
    return;
  }
  
  // Not auth'd yet
  var auth = { username: '', password: '', service: service,
               server: Cx.PUBLISH_SERVER };
  try {
    auth.username = getPrefService().getCharPref(Cx.PREF_USER_ID);
  }
  catch (ex) {}

  window.openDialog(Cx.CONTENT_PATH + 'authenticate.xul',
                    'auth-dialog',
                    Cx.MODAL_DIALOG_FLAGS,
                    auth);

  if (auth.canceled) {
    dump("canceled\n");
    callback(false);
    return;
  }

  authMgr.setAuthIdentity(Cx.AUTH_SCHEME, Cx.PUBLISH_SERVER, Cx.AUTH_PORT,
                          Cx.AUTH_TYPE, Cx.AUTH_REALM, Cx.AUTH_PATH,
                          Cx.AUTH_DOMAIN, auth.username, auth.password);

  // XXX deadman timer?
  var request = new XMLHttpRequest();
  request.onload  = function () { authLoaded(request, service, callback) };
  request.onerror = function () { authError (request, service, callback) };
  request.open('GET', Cx.AUTH_URL);
  request.send(null);
}


function authenticateAs(username, password, service, callback)
{
  var authMgr = getAuthManager();
  authMgr.setAuthIdentity(Cx.AUTH_SCHEME, Cx.PUBLISH_SERVER, Cx.AUTH_PORT,
                          Cx.AUTH_TYPE, Cx.AUTH_REALM, Cx.AUTH_PATH,
                          Cx.AUTH_DOMAIN, username, password);
  var request = new XMLHttpRequest();
  request.onload  = function () { callback(request.status == 200); };
  request.onerror = function () { callback(false); };
  request.open('GET', Cx.AUTH_URL);
  request.send(null);
}


function authLoaded (request, service, callback) {
  var authMgr = getAuthManager();

  if (request.status == 401) {
    // Not Authorized
    dump("401 not authorized\n");
    authMgr.clearAll();
    // Retry
    authenticate(service, callback);
  }
  else if (request.status != 200) {
    dump("error: status: " + request.status + "\n");
    authMgr.clearAll();
    callback(false);
  }
  else {
    callback(true);
  }
}


function authError (request, service, callback) {
  dump("authError\n");
  callback(false);
}


function dumpDS (rdfds) {
  const kResource = Components.interfaces.nsIRDFResource;
  const kLiteral = Components.interfaces.nsIRDFLiteral;
  const kInt = Components.interfaces.nsIRDFInt;
  var cu = getRDFContainerUtils();
  dump("*** Dumping RDF Datasource: " + rdfds.URI + "\n");
  var subjs = rdfds.GetAllResources();
  while (subjs.hasMoreElements()) {
    var subj = subjs.getNext().QueryInterface(kResource);
    dump("  " + subj.Value + "\n");
    if (cu.IsContainer(rdfds, subj)) {
      var cont = getRDFContainer();
      cont.Init(rdfds, subj);
      var elems = cont.GetElements();
      var idx = 1;
      while (elems.hasMoreElements()) {
        var elem = elems.getNext();
        try {
          elem = elem.QueryInterface(kResource);
        }
        catch (e1) {
          try {
            elem = elem.QueryInterface(kLiteral);
          }
          catch (e2) {
            try {
              elem = elem.QueryInterface(kInt);
            }
            catch (e3) {
              elem = { Value: "Couldn't query interface" };
            }
          }
        }
        dump("    [" + (idx++) + "] " + elem.Value + "\n");
      }
    }
    var arcs = rdfds.ArcLabelsOut(subj);
    while (arcs.hasMoreElements()) {
      var arc = arcs.getNext().QueryInterface(kResource);
      if (! cu.IsOrdinalProperty(arc)) {
        dump("    " + arc.Value + "\n");
        var objs = rdfds.GetTargets(subj, arc, true);
        while (objs.hasMoreElements()) {
          var obj = objs.getNext();
          try {
            obj = obj.QueryInterface(kResource);
          }
          catch (e1) {
            try {
              obj = obj.QueryInterface(kLiteral);
            }
            catch (e2) {
              try {
                obj = obj.QueryInterface(kInt);
              }
              catch (e3) {
                obj = { Value: "Couldn't query interface" };
              }
            }
          }
          dump("      " + obj.Value + "\n");
        }
      }
    }
  }
  dump("\n\n");
}


// Global constants and configuration object
var Cx = {
  get VERSION ()       { return '0.9.5' },
  get FILE_VERSION ()  { return '1.1' },

  get PROJECTS_FILE () { return 'celtx.rdf' },
  get PROJECTS_DIR  () { return 'celtx.d' },
  get PROJECT_FILE  () { return 'project.rdf' },
  get SCRIPT_FILE   () { return 'script.html' },
  get BONEYARD_FILE () { return 'script_boneyard.html' },
  get SCRIPT_TEMP_FILE () { return 'script_swap.html' },
  get CONTENT_PATH  () { return 'chrome://celtx/content/' },
  get LOCALE_PATH   () { return 'chrome://celtx/locale/' },
  get TRANSFORM_PATH() { return 'chrome://celtx/content/xsl/' },
  get SCHEMA_URL    () { return 'chrome://celtx/content/schema.rdf' },
  get DIR_PERMS     () { return 0755 },
  get PROJECTS_URL  () { return 'http://celtx.com/project' },
  get LOCAL_PROJECTS() { return 'http://celtx.com/local-projects' },

  get MODAL_DIALOG_FLAGS     () { return 'chrome,modal,centerscreen,titlebar' },
  get RESIZABLE_DIALOG_FLAGS () { return 'chrome,modal,centerscreen,'
                                       + 'resizable,titlebar' },
  get RESIZABLE_WINDOW_FLAGS () { return 'chrome,resizable,titlebar' },
  get NEW_WINDOW_FLAGS       () { return 'chrome,all,dialog=no' },

  get BUG_REPORT_URL   () { return 'http://www.celtx.com/bugreport' },
  get SUPPORT_URL      () { return 'http://www.celtx.com/splash/support' },
  get WALKTHRU_URL     () { return 'http://www.celtx.com/splash/walkthru' },
  get USER_GUIDE_URL   () { return 'http://www.celtx.com/splash/guide' },
  get FORUMS_URL       () { return 'http://forums.celtx.com/' },
  get PROJ_CENTRAL_URL () { return 'http://pc.celtx.com/' },

  get PUBLISH_SERVER () { return 'publish.celtx.com' },
  get SERVER_BASEURL () { return 'http://' + this.PUBLISH_SERVER },

  get REGISTER_URL   () { return this.SERVER_BASEURL + '/pub/register/check/' },
  get AUTH_URL       () { return this.SERVER_BASEURL + '/app/test-auth' },
  get PROJ_LIST_URL  () { return this.SERVER_BASEURL + '/app/projects' },
  get PUBLISH_URL    () { return this.SERVER_BASEURL + '/app/publish' },
  get STARTUP_URL    () { return this.SERVER_BASEURL + '/pub/startup' },
  get USERLIST_URL   () { return this.SERVER_BASEURL + '/pub/find-users/' },
  get PDF_CONVERT_URL() { return this.SERVER_BASEURL + '/app/genpdf' },

  get PREF_BRANCH    () { return 'celtx' },
  get PREF_USER_ID   () { return this.PREF_BRANCH + '.user.id' },
  get PREF_PROJ_PATH () { return this.PREF_BRANCH + '.projects.home' },
  get PREF_MIGRATED  () { return this.PREF_BRANCH + '.migrated' },
  get PREF_SIDEBAR   () { return this.PREF_BRANCH + '.sidebar.visible' },

  get AUTH_REALM     () { return 'celtx' },
  get AUTH_TYPE      () { return 'basic' },
  get AUTH_PORT      () { return 80 },
  get AUTH_SCHEME    () { return 'http' },
  get AUTH_DOMAIN    () { return null },
  get AUTH_PATH      () { return '/' },
  
  get OLD_PROJECTS_FILE () { return 'projects.rdf' },
  get SCRIPT_XML_FILE   () { return 'script.xml' },


  // Namespaces
  get NS_RDF        () { return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
  get NS_RDFS       () { return 'http://www.w3.org/2000/01/rdf-schema#' },
  get NS_CX         () { return 'http://celtx.com/NS/v1/' },
  get NS_DC         () { return 'http://purl.org/dc/elements/1.1/' },
  get NS_NOTE       () { return 'http://www.w3.org/2000/10/annotation-ns#' },
  get NS_NC         () { return 'http://home.netscape.com/NC-rdf#' }
};
