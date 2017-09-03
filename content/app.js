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


function newSplashScreen(arg) {
  return window.openDialog(Cx.CONTENT_PATH + 'celtx.xul', '',
    Cx.NEW_WINDOW_FLAGS, arg);
}


function fixupSearchbar () {
  try {
    // Remove the Add Engines option by removing the handlers that add it
    var sb = document.getElementById('searchbar');
    if (! sb) {
      dump("*** fixupSearchbar: No search bar present\n");
      return;
    }
    var p = document.getAnonymousElementByAttribute(sb, 'anonid', 'searchbar-popup');
    p.removeAttribute('onpopupshowing');
    p.removeAttribute('onpopuphiding');
  }
  catch (ex) {
    dump("fixupSearchbar: " + ex + "\n");
  }
}


function numProjectsOpen () {
  const CI = Components.interfaces;
  const CC = Components.classes;
  const watcherClass = '@mozilla.org/embedcomp/window-watcher;1';
  var openWindows = 0;
  try {
    var watcher = CC[watcherClass].getService(CI.nsIWindowWatcher);
    var windows = watcher.getWindowEnumerator();
    while (windows.hasMoreElements()) {
      var domWin = windows.getNext();
      try {
        var windowElement = domWin.document.getElementsByTagName('window')[0];
        var type = windowElement.getAttribute('windowtype');
        if (type && type == 'celtx:main')
          ++openWindows;
      } catch (ex) {}
    }
  } catch (ex) {
    dump("*** numProjectsOpen: Couldn't get the nsIWindowWatcher service!\n");
    dump(ex + "\n");
    throw ex;
  }

  return openWindows;
}


function findProjectWindow (uri) {
  var wm = getWindowMediator();
  var e  = wm.getEnumerator('celtx:main');
  while (e.hasMoreElements()) {
    var w = e.getNext();
    if (w.project == uri) {
      return w;
    }
  }

  return null;
}


function setToolbarMode (mode) {
  // XXX: Do not list toolbars here unless all buttons in that toolbar have
  // icons, otherwise text-only buttons will be invisible in icon-only mode.
  var toolbars = [
    "celtx:project-toolbar",
    "celtx:search-toolbar"
  ];
  for (var i = 0; i < toolbars.length; i++)
  {
    var toolbar = document.getElementById(toolbars[i]);
    if (toolbar) {
      toolbar.setAttribute("mode", mode);
      document.persist(toolbar.id, "mode");
    }
  }
  // Kludge: Addeded calendar assistance
  var calframe = document.getElementById("calendar-view");
  if (calframe) {
    var calbar = calframe.contentDocument.getElementById("calendar-bar");
    if (calbar) {
      calbar.setAttribute("mode", mode);
      calframe.contentDocument.persist(calbar.id, "mode");
    }
  }
  getPrefService().setCharPref("celtx.toolbar.show", mode);
}


function setSmallIcons (small) {
  var smallIconBC = document.getElementById("small-icons");
  var smallIconMenu = document.getElementById("smallIconsMenuItem");
  var size = small ? "small" : "large";
  smallIconBC.setAttribute("iconsize", size);
  smallIconMenu.setAttribute("checked", small);
  getPrefService().setCharPref("celtx.toolbar.size", size);
}


var app = new Object();

app.startup = function () {
  try {
    app.init();
  }
  catch (ex) {
    var msg = app.text("initError") + ": " + ex + "\n";
    dump(msg);
    window.alert(msg);
    window.close();
  }
};


app.shutdown = function () {
  dump("unload\n");

  // Remove controllers
  window.controllers.removeController(app.controller);
};


app.helpAbout = function () {
  window.openDialog(Cx.CONTENT_PATH + "about.xul", "_blank",
    Cx.MODAL_DIALOG_FLAGS);
};


app.helpReportBug = function () {
  window.open(Cx.BUG_REPORT_URL);
};


app.helpSupport = function () {
  window.open(Cx.SUPPORT_URL);
};


app.helpAccount = function () {
  setTimeout(this.doRegistration, 100);
};


app.quit = function () {
  goQuitApplication();
};


app.hasAccount getter = function () {
  return app.userID != null;
};


app.init = function () {
  app.stringBundle = document.getElementById('celtx-bundle');

  app.initPrefs();

  fixupSearchbar();

  var dir = currentProfileDir();
  app.projectManager = new ProjectManager(dir);

  // Register command controller
  window.controllers.appendController(app.controller);
};


function Version (str) {
  this.major = 0;
  this.minor = 0;
  this.patch = 0;

  if (str == null || str == "")
    return;

  var match = str.match(/^(\d+)(.*)/);
  if (! match)
    throw "Invalid version string";
  this.major = Number(match[1]);
  if (match[2] == "")
    return;

  match = match[2].match(/^\.(\d+)(.*)/);
  if (! match)
    return;
  this.minor = Number(match[1]);
  if (match[2] == "")
    return;

  match = match[2].match(/^\.(\d+)/);
  if (match)
    this.patch = Number(match[1]);
}


// Same return convention as strcmp, etc.
Version.prototype.compare = function (vers) {
  if (this.major < vers.major)
    return -1;
  if (this.major > vers.major)
    return 1;
  if (this.minor < vers.minor)
    return -1;
  if (this.minor > vers.minor)
    return 1;
  return this.patch - vers.patch;
};


function removeBookmarksInFolder (ds, folder) {
  dump("--- removeBookmarksInFolder: " + folder.Value + "\n");
  const kResource = Components.interfaces.nsIRDFResource;
  var svc = getRDFService();
  var cu = getRDFContainerUtils();
  var cont = getRDFContainer();
  cont.Init(ds, folder);
  var elems = cont.GetElements();
  while (elems.hasMoreElements()) {
    var elem = elems.getNext().QueryInterface(kResource);
    if (cu.IsContainer(ds, elem))
      removeBookmarksInFolder(ds, elem);
    // XXX: I was going to delete the bookmarks themselves, but I was
    // crashing inside the arc enumerator's hasMoreElements method.
  }
  while (cont.GetCount() > 0)
    cont.RemoveElementAt(cont.GetCount(), true);
}


function removeAllBookmarks (ds) {
  var rdfsvc = getRDFService();
  var root = rdfsvc.GetResource("NC:BookmarksRoot");
  removeBookmarksInFolder(ds, root);
}


// Update me if the bookmark icon changes!
var gCeltxBookmarkIcon = {
  url: "http://www.celtx.com/favicon.ico",
  mimeType: "image/x-icon",
  data: [
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00,
    0x20, 0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00, 0x28, 0x00,
    0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x23, 0x2e,
    0x00, 0x00, 0x23, 0x2e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xdc, 0xdc, 0xdc, 0xff, 0x52, 0x52, 0x52, 0xff, 0x45, 0x45,
    0x45, 0xff, 0x49, 0x49, 0x49, 0xff, 0x4b, 0x4b, 0x4b, 0xff, 0x51, 0x51,
    0x51, 0xff, 0x56, 0x56, 0x56, 0xff, 0x59, 0x59, 0x59, 0xff, 0x5f, 0x5f,
    0x5f, 0xff, 0x63, 0x63, 0x63, 0xff, 0x68, 0x68, 0x68, 0xff, 0x6c, 0x6c,
    0x6c, 0xff, 0x72, 0x72, 0x72, 0xff, 0xab, 0xab, 0xab, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x81, 0x81, 0x81, 0xff, 0x24, 0x24,
    0x24, 0xff, 0x29, 0x29, 0x29, 0xff, 0x33, 0x33, 0x33, 0xff, 0x45, 0x45,
    0x45, 0xff, 0x37, 0x37, 0x37, 0xff, 0x3a, 0x3a, 0x3a, 0xff, 0x44, 0x44,
    0x44, 0xff, 0x45, 0x45, 0x45, 0xff, 0x50, 0x50, 0x50, 0xff, 0x56, 0x56,
    0x56, 0xff, 0x5b, 0x5b, 0x5b, 0xff, 0x61, 0x61, 0x61, 0xff, 0x6f, 0x6f,
    0x6f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd, 0xfd, 0xfd, 0xff, 0x50, 0x50,
    0x50, 0xff, 0x2a, 0x2a, 0x2a, 0xff, 0x29, 0x29, 0x29, 0xff, 0x63, 0x63,
    0x63, 0xff, 0xa1, 0xa1, 0xa1, 0xff, 0xab, 0xab, 0xab, 0xff, 0x62, 0x62,
    0x62, 0xff, 0x99, 0x99, 0x99, 0xff, 0x89, 0x89, 0x89, 0xff, 0x51, 0x51,
    0x51, 0xff, 0x5c, 0x5c, 0x5c, 0xff, 0x62, 0x62, 0x62, 0xff, 0x68, 0x68,
    0x68, 0xff, 0x7b, 0x7b, 0x7b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xe2, 0xe2,
    0xe2, 0xff, 0x32, 0x32, 0x32, 0xff, 0x31, 0x31, 0x31, 0xff, 0x2c, 0x2c,
    0x2c, 0xff, 0x88, 0x88, 0x88, 0xff, 0x9d, 0x9d, 0x9d, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xda, 0xda, 0xda, 0xff, 0xdb, 0xdb, 0xdb, 0xff, 0xff, 0xff,
    0xff, 0xff, 0x8c, 0x8c, 0x8c, 0xff, 0x5c, 0x5c, 0x5c, 0xff, 0x68, 0x68,
    0x68, 0xff, 0x6e, 0x6e, 0x6e, 0xff, 0x84, 0x84, 0x84, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xb2, 0xb2, 0xb2, 0xff, 0x31, 0x31, 0x31, 0xff, 0x37, 0x37,
    0x37, 0xff, 0x34, 0x34, 0x34, 0xff, 0x98, 0x98, 0x98, 0xff, 0x96, 0x96,
    0x96, 0xff, 0xb4, 0xb4, 0xb4, 0xff, 0x6d, 0x6d, 0x6d, 0xff, 0xd2, 0xd2,
    0xd2, 0xff, 0xa9, 0xa9, 0xa9, 0xff, 0x6c, 0x6c, 0x6c, 0xff, 0x67, 0x67,
    0x67, 0xff, 0x6e, 0x6e, 0x6e, 0xff, 0x74, 0x74, 0x74, 0xff, 0x8d, 0x8d,
    0x8d, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7b, 0x7b, 0x7b, 0xff, 0x36, 0x36,
    0x36, 0xff, 0x39, 0x39, 0x39, 0xff, 0x3a, 0x3a, 0x3a, 0xff, 0x4e, 0x4e,
    0x4e, 0xff, 0x4c, 0x4c, 0x4c, 0xff, 0x4c, 0x4c, 0x4c, 0xff, 0x57, 0x57,
    0x57, 0xff, 0x6a, 0x6a, 0x6a, 0xff, 0x5b, 0x5b, 0x5b, 0xff, 0x67, 0x67,
    0x67, 0xff, 0x6f, 0x6f, 0x6f, 0xff, 0x74, 0x74, 0x74, 0xff, 0x7a, 0x7a,
    0x7a, 0xff, 0x95, 0x95, 0x95, 0xff, 0xfb, 0xfb, 0xfb, 0xff, 0x80, 0x80,
    0x80, 0xff, 0x90, 0x90, 0x90, 0xff, 0x67, 0x67, 0x67, 0xff, 0x8e, 0x8e,
    0x8e, 0xff, 0x57, 0x57, 0x57, 0xff, 0x7d, 0x7d, 0x7d, 0xff, 0x5c, 0x5c,
    0x5c, 0xff, 0x62, 0x62, 0x62, 0xff, 0x68, 0x68, 0x68, 0xff, 0x64, 0x64,
    0x64, 0xff, 0x6b, 0x6b, 0x6b, 0xff, 0x75, 0x75, 0x75, 0xff, 0x77, 0x77,
    0x77, 0xff, 0x7c, 0x7c, 0x7c, 0xff, 0x9d, 0x9d, 0x9d, 0xff, 0xdf, 0xdf,
    0xdf, 0xff, 0xa0, 0xa0, 0xa0, 0xff, 0x94, 0x94, 0x94, 0xff, 0xac, 0xac,
    0xac, 0xff, 0xa3, 0xa3, 0xa3, 0xff, 0x9f, 0x9f, 0x9f, 0xff, 0xb4, 0xb4,
    0xb4, 0xff, 0x7a, 0x7a, 0x7a, 0xff, 0xcf, 0xcf, 0xcf, 0xff, 0x8b, 0x8b,
    0x8b, 0xff, 0x9d, 0x9d, 0x9d, 0xff, 0xc1, 0xc1, 0xc1, 0xff, 0x81, 0x81,
    0x81, 0xff, 0x9c, 0x9c, 0x9c, 0xff, 0xa9, 0xa9, 0xa9, 0xff, 0xa5, 0xa5,
    0xa5, 0xff, 0xa2, 0xa2, 0xa2, 0xff, 0xc4, 0xc4, 0xc4, 0xff, 0x94, 0x94,
    0x94, 0xff, 0xb9, 0xb9, 0xb9, 0xff, 0xaf, 0xaf, 0xaf, 0xff, 0xd7, 0xd7,
    0xd7, 0xff, 0xe9, 0xe9, 0xe9, 0xff, 0xea, 0xea, 0xea, 0xff, 0xde, 0xde,
    0xde, 0xff, 0xc4, 0xc4, 0xc4, 0xff, 0xc8, 0xc8, 0xc8, 0xff, 0xb5, 0xb5,
    0xb5, 0xff, 0x9e, 0x9e, 0x9e, 0xff, 0xda, 0xda, 0xda, 0xff, 0xbe, 0xbe,
    0xbe, 0xff, 0xa7, 0xa7, 0xa7, 0xff, 0x64, 0x64, 0x64, 0xff, 0x6e, 0x6e,
    0x6e, 0xff, 0x72, 0x72, 0x72, 0xff, 0xbd, 0xbd, 0xbd, 0xff, 0x95, 0x95,
    0x95, 0xff, 0xd1, 0xd1, 0xd1, 0xff, 0xa2, 0xa2, 0xa2, 0xff, 0xc2, 0xc2,
    0xc2, 0xff, 0xd8, 0xd8, 0xd8, 0xff, 0xf6, 0xf6, 0xf6, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf5, 0xf5,
    0xf5, 0xff, 0xe8, 0xe8, 0xe8, 0xff, 0xe8, 0xe8, 0xe8, 0xff, 0xbd, 0xbd,
    0xbd, 0xff, 0x81, 0x81, 0x81, 0xff, 0x63, 0x63, 0x63, 0xff, 0x69, 0x69,
    0x69, 0xff, 0x6f, 0x6f, 0x6f, 0xff, 0xa0, 0xa0, 0xa0, 0xff, 0xa5, 0xa5,
    0xa5, 0xff, 0xbd, 0xbd, 0xbd, 0xff, 0xd9, 0xd9, 0xd9, 0xff, 0x9c, 0x9c,
    0x9c, 0xff, 0xcf, 0xcf, 0xcf, 0xff, 0xcf, 0xcf, 0xcf, 0xff, 0xed, 0xed,
    0xed, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xe0, 0xe0,
    0xe0, 0xff, 0xb1, 0xb1, 0xb1, 0xff, 0x87, 0x87, 0x87, 0xff, 0x74, 0x74,
    0x74, 0xff, 0xa0, 0xa0, 0xa0, 0xff, 0xce, 0xce, 0xce, 0xff, 0xcc, 0xcc,
    0xcc, 0xff, 0x9c, 0x9c, 0x9c, 0xff, 0xea, 0xea, 0xea, 0xff, 0xc0, 0xc0,
    0xc0, 0xff, 0xb9, 0xb9, 0xb9, 0xff, 0xda, 0xda, 0xda, 0xff, 0xcb, 0xcb,
    0xcb, 0xff, 0xee, 0xee, 0xee, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfa, 0xfa,
    0xfa, 0xff, 0xe2, 0xe2, 0xe2, 0xff, 0xfd, 0xfd, 0xfd, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf3, 0xf3, 0xf3, 0xff, 0xd9, 0xd9,
    0xd9, 0xff, 0xcc, 0xcc, 0xcc, 0xff, 0xaa, 0xaa, 0xaa, 0xff, 0xf6, 0xf6,
    0xf6, 0xff, 0xca, 0xca, 0xca, 0xff, 0xd2, 0xd2, 0xd2, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf3, 0xf3,
    0xf3, 0xff, 0xe0, 0xe0, 0xe0, 0xff, 0xd6, 0xd6, 0xd6, 0xff, 0xe7, 0xe7,
    0xe7, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x98, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]
};


function addCeltxBookmarks (ds) {
  var svc = ds.QueryInterface(Components.interfaces.nsIBookmarksService);
  var rdfsvc = getRDFService();
  var root = rdfsvc.GetResource("NC:BookmarksRoot");
  var cont = getRDFContainer();
  cont.Init(ds, root);

  // Recreate the bookmarks toolbar folder in its original place
  var folder = svc.getBookmarksToolbarFolder();
  cont.AppendElement(folder);

  // Change the bookmarks toolbar folder's name
  var nameArc = rdfsvc.GetResource("http://home.netscape.com/NC-rdf#Name");
  ds.Change(folder, nameArc, ds.GetTarget(folder, nameArc, true),
    rdfsvc.GetLiteral("Celtx"));

  // Populate the folder with our links
  var bookmarks = [
    { name: "Celtx Website",
      url: "http://celtx.com/" },
    { name: "Getting Started",
      url: "http://www.celtx.com/walkthru/gettingstarted.html" },
    { name: "User Forum",
      url: "http://forums.celtx.com/" },
    { name: "Celtx Projects",
      url: "http://pc.celtx.com/" },
    { name: "Celtx Central Login",
      url: "http://users.celtx.com/" }
  ];
  for (var i = 0; i < bookmarks.length; i++) {
    var bookmark = bookmarks[i];
    svc.createBookmarkInContainer(bookmark.name, bookmark.url, null,
      bookmark.name, "UTF-8", null, folder, i+1);
    svc.updateBookmarkIcon(bookmark.url, gCeltxBookmarkIcon.mimeType,
      gCeltxBookmarkIcon.data, gCeltxBookmarkIcon.data.length);
  }
}


function addDefaultCalendar () {
  var mgrFile = currentProfileDir();
  mgrFile.append("Calendar");
  if (mgrFile.exists()) {
    dump("*** addDefaultCalendar: Calendar already exists, aborting.\n");
    return;
  }
  mgrFile.create(1, 0700);

  // Copy the calendar file to the profile directory
  var calFile = mgrFile.clone();
  calFile.append("CalendarDataFile1.ics");
  var ios = getIOService();
  var caluri = ios.newURI(Cx.CONTENT_PATH + "res/CalendarDataFile.ics",
    null, null);
  var calIStream = ios.newChannelFromURI(caluri).open();
  var calOStream = Components.classes[
    "@mozilla.org/network/file-output-stream;1"].
    createInstance(Components.interfaces.nsIFileOutputStream);
  // RDWR, CREAT flags
  calOStream.init(calFile, 0x04 | 0x08, 0600, 0);
  var bufOStream = Components.classes[
    "@mozilla.org/network/buffered-output-stream;1"].
    createInstance(Components.interfaces.nsIBufferedOutputStream);
  bufOStream.init(calOStream, 4096);
  var avail = calIStream.available();
  while (avail > 0) {
    bufOStream.writeFrom(calIStream, avail);
    avail = calIStream.available();
  }
  bufOStream.flush();
  bufOStream.close();
  calIStream.close();
  caluri = ios.newFileURI(calFile);

  // Create the calendar manager data
  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var mgrds = getInMemoryDatasource();
  var mgrseq = rdfsvc.GetResource("urn:calendarcontainer");
  var mgrseq = cu.MakeSeq(mgrds, mgrseq);
  var cal0res = rdfsvc.GetResource("urn:calendarcontainer:calendar0");
  var cal1res = rdfsvc.GetResource("urn:calendarcontainer:calendar1");
  mgrseq.AppendElement(cal0res);
  mgrseq.AppendElement(cal1res);
  var cal0File = mgrFile.clone();
  cal0File.append("CalendarDataFile.ics");
  var cal0attrs = {
    "name": defaultCalendarFileName,
    "path": cal0File.path,
    "active": "true",
    "remote": "false",
    "remotePath": "",
    "color": "#F9F4FF"
  };
  var cal1attrs = {
    "name": "The Wizard of Oz",
    "path": calFile.path,
    "active": "false",
    "remote": "false",
    "remotePath": "",
    "color": "#CCFFCC"
  };
  for (var attr in cal0attrs)
    mgrds.Assert(cal0res, rdfsvc.GetResource(Cx.NS_NC + attr),
                 rdfsvc.GetLiteral(cal0attrs[attr]), true);
  for (var attr in cal1attrs)
    mgrds.Assert(cal1res, rdfsvc.GetResource(Cx.NS_NC + attr),
                 rdfsvc.GetLiteral(cal1attrs[attr]), true);

  // Serialize the calendar manager data
  mgrFile.append("CalendarManager.rdf");
  var serializer = getRDFXMLSerializer();
  var mgrOStream = Components.classes[
    "@mozilla.org/network/file-output-stream;1"].
    createInstance(Components.interfaces.nsIFileOutputStream);
  mgrOStream.init(mgrFile, 0x04 | 0x08, 0600, 0);
  bufOStream = Components.classes[
    "@mozilla.org/network/buffered-output-stream;1"].
    createInstance(Components.interfaces.nsIBufferedOutputStream);
  bufOStream.init(mgrOStream, 4096);
  serializer.init(mgrds);
  var atomsvc = getAtomService();
  serializer.addNameSpace(atomsvc.getAtom("NC"), Cx.NS_NC);
  serializer.addNameSpace(atomsvc.getAtom("RDF"), Cx.NS_RDF);
  serializer.Serialize(bufOStream);
  bufOStream.flush();
  bufOStream.close();
}


app.initPrefs = function () {
  var prefsvc = getPrefService();
  var firstLaunch = true;
  try {
    firstLaunch = prefsvc.getBoolPref("celtx.firstlaunch");
    if (firstLaunch) {
      prefsvc.setBoolPref("celtx.firstlaunch", false);
      firstLaunch = false;
    }
  }
  catch (ex) {
    prefsvc.setBoolPref("celtx.firstlaunch", true);
  }

  var curVersion = new Version(Cx.VERSION);
  var lastVersion = null;
  try {
    lastVersion = prefsvc.getCharPref("celtx.version");
  }
  catch (ex) {}
  lastVersion = new Version(lastVersion);
  if (curVersion.compare(lastVersion) > 0) {
    // Place any additional upgrade code here
    if (lastVersion.compare(new Version("0.9.5")) < 0) {
      // If upgrading from pre-0.9.5, back up the bookmarks and replace them
      try {
        var bookmarksFile = currentProfileDir();
        bookmarksFile.append("bookmarks.html");
        try {
          bookmarksFile.copyTo(null, "bookmarks_backup.html");
        }
        catch (ex) {} // Not a significant error, really.
        var rdfsvc = getRDFService();
        var bmds = rdfsvc.GetDataSource("rdf:bookmarks");
        var bmsvc = bmds.QueryInterface(
          Components.interfaces.nsIBookmarksService);
        bmsvc.readBookmarks();
        removeAllBookmarks(bmds);
        addCeltxBookmarks(bmds);
      }
      catch (ex) {
        dump("*** Error backing up bookmarks: " + ex + "\n");
      }
      // And add the default calendar
      addDefaultCalendar();
    }
    prefsvc.setCharPref("celtx.version", Cx.VERSION);
  }

  // Set the UserID
  app.userID = null;
  try {
    app.userID = prefsvc.getCharPref(Cx.PREF_USER_ID);
  }
  catch (ex) {}

  // Initialise the printer settings to our preferred defaults
  try { ScriptPrinting.setGlobalPrintSettings(); }
  catch (ex) { dump("*** app.initPrefs: " + ex + "\n"); }

  // Set the toolbar icon/text mode
  try {
    prefsvc.getCharPref("celtx.toolbar.show");
  }
  catch (ex) {
    prefsvc.setCharPref("celtx.toolbar.show", "icons");
  }

  try {
    var dir = prefsvc.getCharPref("celtx.projectsdirectory");
  }
  catch (ex) {
    try {
      dir = userDocsDir().path;
      prefsvc.setCharPref("celtx.projectsdirectory", dir);
    }
    catch (ex2) {
      dump("*** Unable to set projects directory: " + ex2 + "\n");
    }
  }
}


app.openProject = function () {
  var proj = { uri: null, canceled: false };

  window.openDialog(Cx.CONTENT_PATH + 'openproj.xul',
		    '_blank',
		    Cx.RESIZABLE_DIALOG_FLAGS,
		    app.projectManager,
		    proj);

  if (proj.canceled) return;

  dump("openProject: " + proj.uri + "\n");
  app.goOpenProject(proj.uri);
};


// Main command controller
// XXX needs cleanup
app.controller = {

  commands: {
    "cmd-download-project": 1,
    "cmd-goto-forums": 1,
    "cmd-goto-guide": 1,
    "cmd-goto-projcentral": 1,
    "cmd-goto-walkthru": 1,
    "cmd-help-account": 1,
    "cmd-new-project": 1,
    "cmd-open-project": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    switch (cmd) {
    // Always enabled
    case "cmd-download-project":
    case "cmd-help-account":
    case "cmd-goto-forums":
    case "cmd-goto-guide":
    case "cmd-goto-projcentral":
    case "cmd-goto-walkthru":
    case "cmd-new-project":
    case "cmd-open-project":
      return true;
    default:
      return false;
    }
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-download-project":
        app.downloadProject();
        break;
      case "cmd-goto-projcentral":
      case "cmd-goto-walkthru":
      case "cmd-goto-guide":
      case "cmd-goto-forums":
        app.goTo(cmd);
        break;
      case "cmd-help-account":
        app.helpAccount();
        break;
      case "cmd-new-project":
        app.newProject();
        break;
      case "cmd-open-project":
        app.openProject();
        break;
      case "cmd-open-scrapbook":
        app.openScrapbook();
        break;
      default:
	dump("command not implemented: " + cmd + "\n");
    }
  }

};


// A gettext function
app.text = function (str) {
  if (! app.stringBundle) return '';
  return app.stringBundle.getString(str);
};


// gettext for formatted strings
app.textf = function (id, args) {
  if (! app.stringBundle) return '';
  return app.stringBundle.getFormattedString(id, args);
};


app.goOpenProject = function (uri) {
  var win = findProjectWindow(uri);
  if (win) {
    // Project is already open
    win.focus();
  }
  else {
    window.openDialog(Cx.CONTENT_PATH + "projwin.xul",
    '_blank',
    Cx.NEW_WINDOW_FLAGS,
    uri);
  }
};


app.downloadProject = function () {
  dump("downloadProject\n");

  if (! app.hasAccount) {
    setTimeout(this.doRegistration, 100);
    return false;
  }

  var config = { manager: app.projectManager,
                 projURL: Cx.PROJ_LIST_URL,
                 authURL: Cx.AUTH_URL
  };  // Other args?
    
  window.openDialog(Cx.CONTENT_PATH + 'getproj.xul',
                    '_blank',
                    Cx.RESIZABLE_DIALOG_FLAGS,
                    config);

  if (config.canceled) return false;

  var id  = config.uri.replace(/^.*\//, '');
  var uri = Cx.PROJECTS_URL + '/' + id;

  // Make sure it's not already open
  if (findProjectWindow(uri)) {
    window.alert(app.text('noDownloadProjectOpen'));
    return false;
  }

  var saveresult = { canceled: true, projdir: null };
  window.openDialog(Cx.CONTENT_PATH + "addproj.xul",
    "_blank", Cx.MODAL_DIALOG_FLAGS, app.projectManager, saveresult,
    app.text("DownloadProject"), config.title);

  if (saveresult.canceled) return false;

  config.projdir = saveresult.projdir;

  // Do the actual download
  window.openDialog(Cx.CONTENT_PATH + 'sync-download.xul',
                    '_blank',
                    Cx.MODAL_DIALOG_FLAGS,
                    config);

  if (! config.succeeded) return false;

  // Add the localpath arc to its download location
  var localpath = RES(Cx.NS_CX + "path");
  app.projectManager.model.add(RES(uri), localpath,
    LIT(config.projdir.path));

  // Open the downloaded project
  setTimeout(function () { app.goOpenProject(uri) }, 100);

  return true;
};


app.newProject = function () {
  var result = { canceled: false, projdir: null };
  // TODO: i18n
  window.openDialog(Cx.CONTENT_PATH + "addproj.xul", "_blank",
    Cx.MODAL_DIALOG_FLAGS, app.projectManager, result,
    app.text("CreateNewProject"));
  if (result.canceled)
    return;
  var projURI = app.projectManager.createProject(result.projdir);
  window.openDialog(Cx.CONTENT_PATH + "projwin.xul", "_blank",
    Cx.NEW_WINDOW_FLAGS, projURI);
};


app.close = function () {
  var windowElement = window.document.firstChild;
  if (windowElement.id != 'celtx-main' || gProjWin.tryClose())
    window.close();
};


app.canClose = function () {
  var windowElement = window.document.firstChild;
  return (windowElement.id != 'celtx-main' || gProjWin.tryClose());
};


app.migrationCheck = function () {
  var prefs = getPrefService();
  var migrated = false;
  try {
    migrated = prefs.getBoolPref(Cx.PREF_MIGRATED);
  }
  catch (ex) { }

  if (migrated) return;

  // Check for old version using path preference
  var path = null;
  try {
    path = prefs.getCharPref(Cx.PREF_PROJ_PATH);
  }
  catch (ex) { }

  if (! path) {
    // Remember this so we don't bother checking again
    try {
      prefs.setBoolPref(Cx.PREF_MIGRATED, true);
    }
    catch (ex) { }
    return;
  }

  var f = null;
  try {
    f = IFile(path);
    if (! (f.exists() && f.isDirectory())) return;

    f.append(Cx.OLD_PROJECTS_FILE);
    if (! (f.exists() && f.isReadable())) return;
  }
  catch (ex) {
    dump("migrationCheck: " + ex + "\n");
    return;
  }

  // Delay migration so the main window appears first
  setTimeout(function () { app.doMigration(f) }, 500);
};


app.doMigration = function (file) {
  if (! file) return;

  var arg = {
    canceled: false,
    file:     file,
    manager:  app.projectManager
  };

  window.openDialog(Cx.CONTENT_PATH + 'migration.xul',
                    'migration-wizard',
                    'chrome,modal,centerscreen',
                    arg);
  
  if (arg.canceled) {
    dump("Migration canceled\n");
    return;
  }
  
  try {
    var prefs = getPrefService();
    prefs.setBoolPref(Cx.PREF_MIGRATED, true);
  }
  catch (ex) {
    dump("doMigration: can't set pref: " + ex + "\n");
  }
};


app.doRegistration = function () {
  var reg = {
    name:     '',
    email:    '',
    prefix:   Cx.REGISTER_URL,
    canceled: false,
    existing: false
  };

  window.openDialog(Cx.CONTENT_PATH + 'regwizard.xul',
                    'registration-wizard',
                    isMac() ? 'chrome,modal,centerscreen,dialog=no,titlebar'
                            : 'chrome,modal,centerscreen',
                    reg);
  
  if (reg.canceled) {
    dump("Registration canceled\n");
    return;
  }

  try {
    var prefs = getPrefService();
    prefs.setCharPref(Cx.PREF_USER_ID, reg.username);
    app.userID = reg.username;
  }
  catch (ex) {
    dump("Registration failed: unable to store user ID pref\n");
    return;
  }

  dump("Registration succeeded\n");
};


function openPreferences () {
  window.openDialog(Cx.CONTENT_PATH + 'prefdialog.xul', '_blank',
		Cx.RESIZABLE_DIALOG_FLAGS);
}


function updateGlobalEditCommands () {
  goUpdateCommand('cmd_undo');
  goUpdateCommand('cmd_redo');
  goUpdateCommand('cmd_cut');
  goUpdateCommand('cmd_copy');
  goUpdateCommand('cmd_paste');
  goUpdateCommand('cmd_selectAll');
  goUpdateCommand('cmd_delete');
}


function updateSelectEditCommands () {
  goUpdateCommand('cmd_cut');
  goUpdateCommand('cmd_copy');
  goUpdateCommand('cmd_delete');
  goUpdateCommand('cmd_selectAll');
}


function updateUndoEditCommands () {
  goUpdateCommand('cmd_undo');
  goUpdateCommand('cmd_redo');
}


function updatePasteCommands () {
  goUpdateCommand('cmd_paste');
}


app.openBrowser = function (uri) {
  window.openDialog('chrome://browser/content/',
    '_blank', Cx.NEW_WINDOW_FLAGS + ',width=640,height=480',
    uri);
};


app.goTo = function (cmd) {
  var urls = {
    'cmd-goto-projcentral': Cx.PROJ_CENTRAL_URL,
    'cmd-goto-walkthru':    Cx.WALKTHRU_URL,
    'cmd-goto-guide':       Cx.USER_GUIDE_URL,
    'cmd-goto-forums':      Cx.FORUMS_URL
  };
  
  if (urls[cmd]) window.open(urls[cmd]);
};

