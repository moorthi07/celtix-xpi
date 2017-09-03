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


var gProjWin = new Object();

function loaded() {
  app.init();
  gProjWin.init();
  // Let the window appear so any modal dialogs can be attached to the
  // correct window in case of error messages.
  window.setTimeout(OpenDefaultDocument, 100);
}

function OpenDefaultDocument () {
  // Temporary hack
  gProjWin.OpenDocument("urn:celtx:document:script");
}


function getBrowser() {
  return gProjWin.currentDocumentView;
}


function getScriptEditor () {
  var view = gProjWin.ViewForDocument('urn:celtx:document:script');
  if (! view) return;
  return view.scripteditor;
}


function deleteResource (uri) {
  try {
    gProjWin.project.deleteResource(uri);

    var view, i;
    for (i = 0; i < gProjWin.documentViews.length; i++) {
      view = gProjWin.documentViews[i];
      if ('itemDeleted' in view) view.itemDeleted(uri);
    }
  }
  catch (ex) {
    dump("deleteResource: " + ex + "\n");
  }
}


gProjWin.IsCalendarVisible = function () {
  var caldeck = document.getElementById("calendar-deck");
  return caldeck.selectedIndex == 1;
};


gProjWin.ShowCalendar = function () {
  var caldeck = document.getElementById("calendar-deck");
  caldeck.selectedIndex = 1;
};


gProjWin.HideCalendar = function () {
  var caldeck = document.getElementById("calendar-deck");
  caldeck.selectedIndex = 0;
};


gProjWin.ViewForDocument = function (doc) {
  for (var i = 0; i < this.documentViews.length; i++) {
    var view = this.documentViews[i];
    if (view.doc == doc)
      return view;
  }
  return null;
};


gProjWin.OpenDocument = function (doc) {
  const ILit = Components.interfaces.nsIRDFLiteral;
  const IRes = Components.interfaces.nsIRDFResource;
  const NS_XUL =
    "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

  var docdeck = document.getElementById("document-deck");

  // Select the item in the listbox
  var navlist = document.getElementById("doclist");
  var navitem = getItemByValue(navlist, doc);
  if (navitem)
    navlist.selectedItem = navitem;

  // If a tab is already open, just select it
  for (var i = 0; i < this.documentViews.length; i++) {
    var view = this.documentViews[i];
    if (view.doc == doc) {
      docdeck.selectedIndex = i;
      return;
    }
  }

  if (this.documentViews.length == 1)
    docdeck.firstChild.collapsed = false;

  // Otherwise, create a tab and load it
  var navdeck = document.getElementById("navigation-deck");
  var tabs = docdeck.firstChild.firstChild;
  var panels = docdeck.lastChild;

  var rdfsvc = getRDFService();
  var docres = rdfsvc.GetResource(doc);
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var editorarc = rdfsvc.GetResource(Cx.NS_CX + "editor");
  var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");
  var imagearc = rdfsvc.GetResource(Cx.NS_CX + "image");

  var ds = document.getElementById("doclist").database;
  var editor = ds.GetTarget(docres, editorarc, true);
  if (! editor)
    throw "Unable to open document: " + doc;
  editor = editor.QueryInterface(IRes);
  var elementName = ds.GetTarget(editor, elemarc, true).QueryInterface(ILit);
  elementName = elementName.Value;
  var documentName = ds.GetTarget(docres, titlearc, true).QueryInterface(ILit);
  documentName = documentName.Value;
  var imageURI = ds.GetTarget(editor, imagearc, true).QueryInterface(ILit);
  imageURI = imageURI.Value;

  var viewerElement = document.createElement(elementName + "view");
  viewerElement.setAttribute("flex", "1");
  this.documentViews.push(viewerElement);

  // Create the tab
  var tab = document.createElement("tab");
  tab.setAttribute("class", "tabbrowser-tab");
  tab.setAttribute("label", documentName);
  tab.setAttribute("image", imageURI);
  tab.setAttribute("crop", "end");
  tab.setAttribute("value", doc);
  tab.maxWidth = 200;
  tab.minWidth = 30;
  tab.width = 0;
  tab.setAttribute("flex", "100");
  tabs.appendChild(tab);
  viewerElement.tab = tab;

  // Create the navigation panel
  var navpanel = document.createElement(elementName + "panel");
  navdeck.appendChild(navpanel);
  viewerElement.navpanel = navpanel;

  // Add the main panel inside a vbox (for the print preview getBrowser kludge)
  var outerBox = document.createElement("vbox");
  outerBox.setAttribute("flex", "1");
  outerBox.appendChild(viewerElement);
  panels.appendChild(outerBox);

  // Allow it to start loading the document
  try {
    viewerElement.open(gProjWin.project, doc);
  
    // Now select the tab
    docdeck.selectedIndex = this.documentViews.length - 1;
  }
  catch (ex) {
    dump("*** Unable to open tab: " + ex + "\n");
    panels.removeChild(outerBox);
    navdeck.removeChild(navpanel);
    tabs.removeChild(tab);
    this.documentViews.splice(this.documentViews.length - 1, 1);
  }
};


gProjWin.TabSelected = function (tabvalue) {
  var docdeck = document.getElementById("document-deck");
  var navdeck = document.getElementById("navigation-deck");
  var doclist = document.getElementById("doclist");
  var docView = null;

  for (var i = 0; i < this.documentViews.length; i++) {
    var view = this.documentViews[i];
    if (view.tab.getAttribute("value") == tabvalue) {
      docView = view;
      break;
    }
  }
  if (docView == null)
    throw "*** Unable to find view for tab " + tabvalue;
  if (docView == gProjWin.currentDocumentView)
    return;
  navdeck.selectedPanel = view.navpanel;

  // Blur the old view (if any)
  if (gProjWin.currentDocumentView != null)
    gProjWin.currentDocumentView.blur();

  // Update the current document pointer
  gProjWin.currentDocumentView = docView;
  docdeck.selectedTab = view.tab;

  // Synchronize the document tree selection
  var docitem = getItemByValue(doclist, tabvalue);
  if (docitem)
    doclist.selectedItem = docitem;

  // Force the sidebar to hide/unhide where appropriate
  var sidebar = document.getElementById("sidebar-box");
  if (this.currentDocumentView.allowSidebar) {
    if (document.getElementById("view-sidebar").getAttribute("checked"))
      sidebar.removeAttribute("hidden");
  }
  else
    sidebar.setAttribute("hidden", true);

  // Focus the new view
  gProjWin.currentDocumentView.focus();

  // Force an update to commands
  this.updateDocumentCommands();
  updateGlobalEditCommands();
};


gProjWin.setCloseTabEnabled = function (val) {
  var tabs = document.getElementById("document-deck").firstChild.firstChild;
  var closebutton = document.getAnonymousElementByAttribute(tabs, "class",
    "tabs-closebutton close-button");
  closebutton.disabled = ! val;
  // There's no visible sign of being disabled, at least on Mac, so we'll
  // hide it as well to remove any doubts.
  closebutton.hidden = ! val;
};


gProjWin.CloseTab = function () {
  var docdeck = document.getElementById("document-deck");
  var navdeck = document.getElementById("navigation-deck");
  var tab = docdeck.selectedTab;
  var index = -1;
  for (var i = 0; i < gProjWin.documentViews.length; i++) {
    var view = gProjWin.documentViews[i];
    if (tab == view.tab) {
      index = i;
      break;
    }
  }
  if (index < 0)
    throw "No view for tab " + tab.value;

  var viewer = gProjWin.documentViews[index];
  viewer.blur();
  if (viewer.close()) {
    // Prevent a second blur event from being passed when we change focus
    gProjWin.currentDocumentView = null;

    // Check if we should collapse the tab list
    if (gProjWin.documentViews.length == 2)
      docdeck.firstChild.collapsed = true;

    // Splice out the view from the document list
    gProjWin.documentViews.splice(index, 1)

    var newIndex = -1;
    // Focus the previous viewer if the last one, otherwise focus the next
    if (index == gProjWin.documentViews.length)
      newIndex = index - 1;
    else
      newIndex = index;

    // Clean up the before/afterselected attributes before removing the tab
    viewer.tab.selected = false;
    
    // Remove the tab
    docdeck.firstChild.firstChild.removeChild(viewer.tab);

    // Remove the view's vbox container
    docdeck.lastChild.removeChild(viewer.parentNode);

    // Remove the panel
    navdeck.removeChild(viewer.navpanel);

    // On closing the last remaining tab, newIndex == -1
    if (newIndex >= 0) {
      var newView = gProjWin.documentViews[newIndex];
      docdeck.selectedTab = newView.tab;
      docdeck.lastChild.selectedIndex = newIndex;
    }
    return true;
  }
  else {
    viewer.focus();
    return false;
  }
};


gProjWin.print = function () {
  var view = this.currentDocumentView;
  if ("onprint" in view)
    view.onprint();
  PrintUtils.print();
};


gProjWin.printPreview = function () {
  var view = this.currentDocumentView;
  var enterCallback = function () {
    document.getElementById("sidebar-box").collapsed = true;
    document.getElementById("nav-sidebar").collapsed = true;
    document.getElementById("document-deck").firstChild.collapsed = true;
    if ("enterPrintPreview" in gProjWin.currentDocumentView)
      gProjWin.currentDocumentView.enterPrintPreview();
  };
  var exitCallback = function () {
    if ("exitPrintPreview" in gProjWin.currentDocumentView)
      gProjWin.currentDocumentView.exitPrintPreview();
    document.getElementById("sidebar-box").collapsed = false;
    // XXX: Should be be switching up collapsed and hidden for this?
    document.getElementById("nav-sidebar").collapsed = false;
    var docdeck = document.getElementById("document-deck");
    if (docdeck.firstChild.childNodes.length > 1)
      docdeck.firstChild.collapsed = false;
  };
  if ("onprint" in view)
    view.onprint();
  PrintUtils.printPreview(enterCallback, exitCallback);
};


gProjWin.tryClose = function () {
  // Force a save of the current RDF data
  gProjWin.project.model.save();

  if (gProjWin.project.temporary) {
    const IPS = Components.interfaces.nsIPromptService;
    var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(IPS);
    var pressed = confirmYesNoCancel(null, app.text("ConfirmSaveProject"));
    if (pressed == kConfirmCancel ||
        (pressed == kConfirmYes && ! gProjWin.saveProject()))
      return false;
  }
  
  // gProjWin.project.temporary will only be true if the user declined to
  // save the project, in which case we should delete it
  if (gProjWin.project.temporary) {
    app.projectManager.deleteProject(gProjWin.project.uri);
    return true;
  }

  try {
    while (gProjWin.documentViews.length > 0) {
      var curDocView = gProjWin.currentDocumentView;
      var docname = curDocView.doc;
      try {
        if (! gProjWin.CloseTab())
          return false;
      }
      catch (ex) {
        dump("*** Error closing " + docname + ": " + ex + "\n");
        // Force its removal so we don't enter an infinite loop
        for (var i = 0; i < gProjWin.documentViews.length; i++) {
          if (curDocView == gProjWin.documentViews[i]) {
            gProjWin.documentViews.splice(i, 1);
            if (gProjWin.documentViews.length > 0) {
              if (i == gProjWin.documentViews.length)
                gProjWin.currentDocumentView = gProjWin.documentViews[i - 1];
              else
                gProjWin.currentDocumentView = gProjWin.documentViews[i];
            }
            break;
          }
        }
      }
    }
  }
  catch (ex) {
    dump("*** projwin.tryClose: " + ex + "\n");
  }
  gProjWin.project.close();
  return true;
};


gProjWin.toggleSidebar = function () {
  var el = document.getElementById('view-sidebar');
  var isChecked = el.getAttribute('checked');
  if (gProjWin.currentDocumentView != null &&
      ! gProjWin.currentDocumentView.allowSidebar)
    return;

  if (isChecked) {
    gProjWin.hideSidebar();
  }
  else {
    gProjWin.showSidebar();
  }

  try {
    var pref = getPrefService();
    pref.setBoolPref(Cx.PREF_SIDEBAR, ! isChecked);
  }
  catch (ex)
  {
    dump("*** toggleSidebar: " + ex + "\n");
  }
};


gProjWin.showSidebar = function () { gProjWin.setSidebarVisible(true)  };
gProjWin.hideSidebar = function () { gProjWin.setSidebarVisible(false) };


gProjWin.setSidebarVisible = function (visible) {
  var el  = document.getElementById('view-sidebar');
  var box = document.getElementById('sidebar-box');
  var spl = document.getElementById('sidebar-splitter');

  box.hidden = ! visible;
  spl.hidden = ! visible;

  if (visible) el.setAttribute('checked', true);
  else el.removeAttribute('checked');
};


gProjWin.isSidebarVisible = function () {
  var box = document.getElementById('sidebar-box');
  return ! box.hidden;
};


gProjWin.propertyChanged = function (project, property) {
  if (property != "title" || project != this.project)
    return;
  setWindowTitle(project.title);
};


gProjWin.init = function () {
  gProjWin.documentViews = [];

  var prefsvc = getPrefService();

  var tbmode = prefsvc.getCharPref("celtx.toolbar.show");
  setToolbarMode(tbmode);

  setSmallIcons(true);

  // Select the correct toolbar mode menu item from the prefs
  var tbmenu = document.getElementById('toolbars-menu');
  if (tbmenu) {
    var tbmenuitem = getItemByValue(tbmenu, tbmode);
    if (tbmenuitem)
      tbmenuitem.setAttribute('checked', true);
  }

  gProjWin.project = null;

  gProjWin.mediaView = document.getElementById('media-view');

  // Called by goQuitApplication
  window.tryToClose = gProjWin.tryClose;
  window.controllers.appendController(this.controller);
  this.updateProjectCommands();

  gProjWin.loadProject(window.arguments[0]);
};


gProjWin.loadProject = function (uri) {
  try {
    var proj = app.projectManager.project(uri);
    proj.open();
  }
  catch (ex) {
    // TODO: proper message box/error handling
    dump("can't open project: " + uri + ": " + ex);
    return;
  }

  gProjWin.project = proj;
  setWindowTitle(proj.title);
  proj.addPropertyListener(this);

  /*
  // Add cx:Document items to the document list
  var projds = proj.model.ds.QueryInterface(
    Components.interfaces.nsIRDFDataSource);
  document.getElementById("doclist").database.AddDataSource(projds);
  document.getElementById("doclist").builder.rebuild();
  */

  instanceMapper.init(proj.model.ds);

  try {
    var pref = getPrefService();
    var sidebarVisible = pref.getBoolPref(Cx.PREF_SIDEBAR);
    if (sidebarVisible)
      gProjWin.showSidebar();
    else
      gProjWin.hideSidebar();
  }
  catch (ex) {
    gProjWin.showSidebar();
  }

  // Set a window property so we can find this window later
  window.project = uri;

  // XXX: Obsolete
  // Unhide menus and toolbars
  document.getElementById('script-visible').removeAttribute('hidden');
  document.getElementById('script-enabled').removeAttribute('disabled');

  // Need to 'delay' this command update so 2nd and subsequent windows
  // have their commands properly enabled
  setTimeout(gProjWin.delayedUpdateCommands, 0);

  // TODO: Rework into a proper model
  gProjWin.initTimers();
};


gProjWin.delayedUpdateCommands = function () {
  gProjWin.updateProjectCommands();
};


gProjWin.saveProjectAs = function () {
  var result = { canceled: false, projdir: null };
  var title = gProjWin.project.title != "" ? gProjWin.project.title : null;
  window.openDialog(Cx.CONTENT_PATH + "addproj.xul", "_blank",
    Cx.MODAL_DIALOG_FLAGS, app.projectManager, result,
      app.text("SaveProjectAs"), title);
  if (result.canceled)
    return false;
  var dir = result.projdir;

  var wasTemp = gProjWin.project.temporary;
  if (wasTemp)
    gProjWin.project.temporary = false;
  gProjWin.saveProject();

  // Move the existing folder to the new destination
  var curDir = gProjWin.project.localPath;
  var oldDir = curDir.parent;
  oldDir.append(curDir.leafName);
  curDir.moveTo(dir.parent, dir.leafName);

  // If the project is labelled temporary, move it to its new destination and
  // remove the temporary flag. Otherwise, move it to its new destination and
  // create a copy in its old location (to keep the editors and such using the
  // correct file).
  if (! wasTemp || gProjWin.project.managed)
    window.setTimeout(dir.copyTo, 5000, oldDir.parent, oldDir.leafName);

  // And update the project manager store
  var pmmodel = app.projectManager.model;
  var projres = gProjWin.project.res;
  var localpath = RES(Cx.NS_CX + 'path');
  var oldPath = pmmodel.target(projres, localpath);
  var newPath = LIT(dir.path);
  if (oldPath)
    pmmodel.change(projres, localpath, oldPath, newPath);
  else
    pmmodel.add(projres, localpath, newPath);
  return true;
};


gProjWin.saveProject = function () {
  if (gProjWin.project.temporary) {
    if (gProjWin.project.managed)
      gProjWin.project.temporary = false;
    else
      return gProjWin.saveProjectAs();
  }

  for (var i = 0; i < this.documentViews.length; i++) {
    try { this.documentViews[i].save(); }
    catch (ex) { dump("*** saveProject: " + ex + "\n"); }
  }
  gProjWin.project.model.save();
  gProjWin.updateProjectCommands();
  return true;
};


gProjWin.copyProject = function () {
  // Force a save of the current project
  gProjWin.saveProject();

  // Generate an appropriate numbered suffix
  var title = gProjWin.project.title;
  var copyNumber = title.match(/(.*) - ([2-9][0-9]*)$/);
  if (copyNumber != null && copyNumber.length == 3)
    title = copyNumber[1] + " - " + (Number(copyNumber[2]) + 1);
  else
    title = title + " - 2";

  var result = { canceled: true, projdir: null };
  window.openDialog(Cx.CONTENT_PATH + "addproj.xul", "_blank",
    Cx.MODAL_DIALOG_FLAGS, app.projectManager, result,
    app.text("CopyProject"), title);
  if (result.canceled)
    return;

  var projURI = app.projectManager.copyProject(gProjWin.project,
    result.projdir);
  window.openDialog(Cx.CONTENT_PATH + "projwin.xul",
                    '_blank',
                    Cx.NEW_WINDOW_FLAGS,
                    projURI);
};


gProjWin.publishProject = function () {
  var publish = this.project.publishSettings;

  publish.canceled   = false;
  publish.authURL    = Cx.AUTH_URL;
  publish.publishURL = Cx.PUBLISH_URL;

  window.openDialog(Cx.CONTENT_PATH + "publish.xul",
                    "_blank",
                    Cx.MODAL_DIALOG_FLAGS,
                    publish);

  if (publish.canceled) return;

  gProjWin.project.savePublishSettings(publish);
  gProjWin.saveProject();
  window.openDialog(Cx.CONTENT_PATH + "sync-upload.xul",
                    "_blank",
                    Cx.MODAL_DIALOG_FLAGS,
                    publish);
};


gProjWin.showProperties = function (tabname) {
  var props = { title:        gProjWin.project.title ||
                              app.text("untitled"),
                description:  gProjWin.project.description,
                author:       gProjWin.project.author,
                source:       gProjWin.project.source,
                rights:       gProjWin.project.rights,
                contact:      gProjWin.project.contact,
                sceneNumbers: gProjWin.project.sceneNumbering,
                canceled:     false };

  window.openDialog(Cx.CONTENT_PATH + 'projdialog.xul',
		    '_blank',
		    Cx.MODAL_DIALOG_FLAGS,
		    props, tabname);

  if (props.canceled) return;

  try {
    // TODO: Re-title the script.html document?
    // app.editor.title = props.title;
  } catch (ex) { }

  gProjWin.project.title          = props.title;
  gProjWin.project.description    = props.description;
  gProjWin.project.author         = props.author;
  gProjWin.project.source         = props.source;
  gProjWin.project.rights         = props.rights;
  gProjWin.project.contact        = props.contact;
  gProjWin.project.sceneNumbering = props.sceneNumbers;
};


gProjWin.addTimer = function (target, callback, interval, data) {
  var timer = {
    lastChecked: new Date().valueOf(),
    interval: interval,
    target: target,
    callback: callback,
    data: (data != null ? data : null)
  };
  this.timers.push(timer);
  return timer;
};


gProjWin.removeTimers = function (target) {
  for (var i = 0; i < this.timers.length; i++) {
    if (this.timers[i].target == target)
      this.timers.splice(i--, 1);
  }
};


gProjWin.initTimers = function () {
  this.timers = [];
  window.setInterval(gProjWin.idleTimer, 1000);
};


gProjWin.idleTimer = function () {
  // This is a callback function, so it can't make reference to "this". Use
  // gProjWin instead.
  var checkTime = new Date().valueOf();
  for (var i = 0; i < gProjWin.timers.length; i++) {
    var timer = gProjWin.timers[i];
    if (checkTime > timer.lastChecked + timer.interval) {
      timer.lastChecked = checkTime;
      try { timer.target[timer.callback](timer); }
      catch (ex) { dump("*** bad timer: " + ex + "\n"); }
    }
  }
};


/*
app.checkForScrapbook = function () {
  var checkObserver = {
    QueryInterface: function (id) {
      if (id.equals(Components.interfaces.nsISupports) ||
          id.equals(Components.interfaces.nsIRequestObserver))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },
    onStartRequest: function (req, ctx) {},
    onStopRequest: function (req, ctx, status) {
      if (status == 0) {
        var cmd = document.getElementById('scrapbook-enabled');
        cmd.removeAttribute('disabled');
        cmd.removeAttribute('hidden');
      }
    }
  };
  try {
    var checker = Components.classes['@mozilla.org/network/urichecker;1']
      .createInstance(Components.interfaces.nsIURIChecker);
    var sburi = getIOService().newURI(
      'chrome://scrapbook/content/scrapbook.xul', null, null);
    checker.init(sburi);
    checker.asyncCheck(checkObserver, null);
  }
  catch (ex) {
    dump("*** checkForScrapbook: " + ex + "\n");
  }
};


app.openScrapbook = function () {
  var browserwin = window.openDialog('chrome://browser/content/browser.xul',
    '_blank', Cx.NEW_WINDOW_FLAGS, 'about:blank');
  browserwin.setTimeout("toggleSidebar('viewScrapBookSidebar', true);", 1000);
};
*/


gProjWin.addResourceMedia = function (uri) {
  dump("adding media to " + uri + "\n");

  try {
    var fp = getFilePicker();
    fp.init(window, app.text("Add File"), fp.modeOpen);
    fp.appendFilters(fp.filterImages | fp.filterAll);
    if (fp.show() != fp.returnOK) return;

    if (this.project.canAddFile(fp.file)) {
      this.addMediaFile(uri, fp.fileURL);
    }
    else {
      window.alert(app.text("unsupportedMediaMsg"));
    }
  }
  catch (ex) {
    dump("addResourceMedia: " + ex + "\n");
  }
};


// XXX: Can this be made more generic, to take http URLs as well?
gProjWin.addMediaFile = function (uri, fileURL) {
  try {
    var type  = mediaTypeOf(fileURL);
    var ext   = fileURL.fileExtension || "bin";
    var id    = generateID() + "." + ext;
    var title = unescape(fileURL.fileBaseName);

    var mediaURI = this.project.initMedia(uri, type, id, title);
    var fSize = -1;
    try {
      fileURL = fileURL.QueryInterface(Components.interfaces.nsIFileURL);
      fSize = fileURL.file.fileSize;
    } catch (ex) {}

    fileCopyListener.fileMap[fileURL.spec] = {
      uri:  mediaURI,
      size: fSize
    };

    var file = this.project.localPath;
    file.append(id);
  
    var persist = getWebBrowserPersist();
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
    persist.progressListener = fileCopyListener;
    persist.saveURI(fileURL, null, null, null, null, file);
  }
  catch (ex) {
    dump("addMediaFile: " + ex + "\n");
  }
};


gProjWin.removeResourceMedia = function (mediaURI) {
  this.project.deleteResource(mediaURI);
};


gProjWin.mediaSearch = function (resURI) {
  var searchList = document.getElementById("media-search-menu");
  var searchMenuItem = searchList.selectedItem;
  if (searchMenuItem.hasAttribute("gis"))
    this.gisSearch(resURI, searchMenuItem.value);
  else
    app.openBrowser(searchMenuItem.value);
};


gProjWin.gisSearch = function (resURI, site) {
  var prefix = "http://images.google.com/images?q=";
  var suffix = "&btnG=Google+Search";
  var titleRes = RES(Cx.NS_DC + "title");
  titleRes = this.project.model.target(RES(resURI), titleRes);
  if (!titleRes)
    return;
  var term = titleRes.value;
  if (site)
    term = "site:" + site + " " + term;
  term = encodeURIComponent(term);
  var browser = window.openDialog("chrome://browser/content/",
    "_blank", Cx.NEW_WINDOW_FLAGS + ",width=640,height=480",
    prefix + term + suffix);
};


gProjWin.markupSelected = function (ref) {
  if (! this.isSidebarVisible()) return;

  try {
    // Perhaps should just fire an event here?
    var t = this.project.model.target(RES(ref), RES(Cx.NS_RDF + "type"));
    var sb = document.getElementById("sidebar-frame");
    sb.contentWindow.panel.selectDeptItem(t.value, ref);
    _content.focus();
  }
  catch (ex) {
    dump("markupSelected: " + ex + "\n");
  }
};


// XXX: Just a copy and paste job, needs major revision, including the fact
// that a lot of these commands will actually be the duty of the docview
// controller.
gProjWin.controller = {

  commands: {
    "cmd-close": 1,

    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,

    "cmd-project-properties": 1,

    "cmd-publish-project": 1,
    "cmd-copy-project": 1,
    "cmd-save-project": 1,
    "cmd-save-project-as": 1,
    "cmd-toggle-sidebar": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    switch (cmd) {
    // Always enabled
    case "cmd-close":
    case "cmd-project-properties":
    case "cmd-save-project":
    case "cmd-save-project-as":
      return true;

    // Enabled when a document is visible
    case "cmd-page-setup":
    case "cmd-print":
    case "cmd-print-preview":
      return gProjWin.currentDocumentView != null;

    // Enabled only for non-temporary projects
    case "cmd-copy-project":
    case "cmd-publish-project":
      return gProjWin.project != null && ! gProjWin.project.temporary;

    case "cmd-toggle-sidebar":
      return gProjWin.currentDocumentView != null
          && gProjWin.currentDocumentView.allowSidebar;

    default:
      return false;
    }
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-close":
        app.close();
        break;
      case "cmd-copy-project":
        gProjWin.copyProject();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        gProjWin.print();
        break;
      case "cmd-print-preview":
        gProjWin.printPreview();
        break;
      case "cmd-project-properties":
        gProjWin.showProperties("properties-tab");
        break;
      case "cmd-publish-project":
        gProjWin.publishProject();
        break;
      case "cmd-save-project":
        gProjWin.saveProject();
        break;
      case "cmd-save-project-as":
        gProjWin.saveProjectAs();
        break;
      case "cmd-toggle-sidebar":
        gProjWin.toggleSidebar();
        break;
    }
  }
};


gProjWin.updateProjectCommands = function () {
  // File menu items
  goUpdateCommand("cmd-copy-project");
  goUpdateCommand("cmd-download-project");
  goUpdateCommand("cmd-publish-project");
  goUpdateCommand("cmd-project-properties");
};


gProjWin.updateDocumentCommands = function () {
  // File menu items
  goUpdateCommand("cmd-save-project"); // document, not project, really
  goUpdateCommand("cmd-export-script");
  goUpdateCommand("cmd-page-setup");
  goUpdateCommand("cmd-print-preview");
  goUpdateCommand("cmd-print");
  goUpdateCommand("cmd-generate-pdf");
  goUpdateCommand("cmd-import");

  // Edit menu items
  goUpdateCommand("cmd-find");
  goUpdateCommand("cmd-replace");
  goUpdateCommand("cmd-find-next");
  goUpdateCommand("cmd-find-previous");

  // View menu items
  goUpdateCommand("cmd-toggle-sidebar");

  // Tools menu items
  goUpdateCommand('cmd-check-spelling');
};


// Takes a node with a single text child and converts newlines to br elements
function convertNewlinesInTextNode (text) {
  var node = text.parentNode;
  var lines = text.nodeValue.split("\n");
  node.removeChild(text);
  for (var i = 0; i < lines.length; ++i) {
    node.appendChild(node.ownerDocument.createTextNode(lines[i]));
    node.appendChild(node.ownerDocument.createElement('br'));
  }
  // Remove the extraneous <br/> at the end
  node.removeChild(node.lastChild);
}


var instanceMapper = {
  _map:  null,
  _rdf:  null,
  _ds:   null,
  _cont: null,

  get mapping () { return this._map; },
  get typeRes () { return this._rdf.GetResource(Cx.NS_RDF + 'type'); },
  get instRes () { return this._rdf.GetResource(Cx.NS_CX  + 'markup'); },
  get refURL  () { return 'urn:celtx:instances'; },

  init: function (ds) {
    this._ds  = ds;
    this._rdf = getRDFService();
    this._map = getInMemoryDatasource();

    var res = this._rdf.GetResource(this.refURL);
    var cu = getRDFContainerUtils();
    this._cont = cu.MakeSeq(this._map, res);

    try {
      var s, o, subjects, targets;
      subjects = this._ds.GetAllResources();
      while (subjects.hasMoreElements()) {
        s = subjects.getNext();
        s = s.QueryInterface(Components.interfaces.nsIRDFResource);
        targets = this._ds.GetTargets(s, this.typeRes, true);
        if (targets.hasMoreElements()) {
          this._cont.AppendElement(s);
        }

//         while (targets.hasMoreElements()) {
//           o = targets.getNext();
//           this._map.Assert(o, this.instRes, s, true);
//         }

      }

      this._ds.AddObserver(this);
    }
    catch (ex) {
      dump("instanceMapper.init: " + ex + "\n");
    }
  },

  destroy: function () {
    try {
      this._ds.RemoveObserver(this);
      this._ds   = null;
      this._rdf  = null;
      this._cont = null;
      this._map  = null;
    }
    catch (ex) { }
  },

  // nsIRDFObserver methods

  onAssert: function (ds, source, property, target) {
    if (property.EqualsNode(this.typeRes)) {
      // A new typed object has been added
      try {
//         this._map.Assert(target,
//                          this.instRes,
//                          source,
//                          true);
        this._cont.AppendElement(source);
      } catch (ex) { dump("instanceMapper: " + ex + "\n"); }
    }
  },

  onUnassert: function (ds, source, property, target) {
    // TODO: remove instance mapping if prop is rdf:type
  },

  onBeginUpdateBatch: function (ds) { },
  onEndUpdateBatch:   function (ds) { },

  onChange:           function (ds, source, property, oldTarget, newTarget) { },
  onMove:             function (ds, oldSource, newSource, property, target) { }
};


var fileCopyListener = {

  fileMap: {},

  QueryInterface: function (id) {
    if (id.equals(Components.interfaces.nsIWebProgressListener) ||
        id.equals(Components.interfaces.nsISupportsWeakReference))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function (webProgress, request, stateFlags, status) {
    var file;
    var nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    if (stateFlags & nsIWebProgressListener.STATE_START) {
      file = this.fileMap[request.name];
      gProjWin.project.model.add(RES(file.uri),
                                 RES(Cx.NS_CX + 'progress'),
                                 LIT('0'));
    }
    else if (stateFlags & nsIWebProgressListener.STATE_STOP) {
      file = this.fileMap[request.name];
      gProjWin.project.model.remove(RES(file.uri),
                                    RES(Cx.NS_CX + 'state'),
                                    LIT('downloading'));
      removeProp(gProjWin.project.model,
                 RES(file.uri),
                 RES(Cx.NS_CX + 'progress'));
    }
  },

  onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {
    var file = this.fileMap[request.name];
    var progress = file.size >= 0 ? curSelfProgress / file.size
                                  : curSelfProgress / maxSelfProgress;
    var pct = Math.floor(progress * 100);
    setLiteralProp(gProjWin.project.model,
                   RES(file.uri),
                   RES(Cx.NS_CX + 'progress'),
                   LIT(pct));
  },

  onLocationChange: function (webProgress, request, location) { },

  onStatusChange: function (webProgress, request, status, message) { },

  onSecurityChange: function (webProgress, request, state) { }
};


var autotext = { chars: {}, headings: {} };


function scriptSelectionChanged () {
  // XXX currently a no-op, called from broadcast of script-selection
}

