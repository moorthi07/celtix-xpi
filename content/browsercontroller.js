var gProxyButton = null;
var gProxyFavIcon = null;
var gProxyDeck = null;
var gURLBar = null;
var gLastValidURLStr = null;

function getBrowserURL() {
  dump("*** Uh oh, a call to getBrowserURL\n");
  return "chrome://browser/content/browser.xul";
}

function openUILinkIn(uri, where) {
  dump("*** openUILinkIn: " + uri + "\n");
  var view = gProjWin.ViewForDocument("urn:celtx:document:browser");
  if (! view)
    return;
  view.controller.browser.loadURI(uri, null, null);
}

function BrowserController(docview) {
  this.docview = docview;
  this.browser = docview.editor;
  this.browser.addProgressListener(this);
  this.docview.urlbar.addEventListener("keypress", this, false);
  this.bookmarks = document.getElementById("bookmarks-view");
  this.favIconURL = null;
  gProxyButton = document.getElementById("page-proxy-button");
  gProxyFavIcon = document.getElementById("page-proxy-favicon");
  gProxyDeck = document.getElementById("page-proxy-deck");
  gURLBar = docview.urlbar;
}

BrowserController.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIWebProgressListener) ||
        iid.equals(Components.interfaces.nsIDOMEventListener))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  commands: {
    "cmd-back": 1,
    "cmd-forward": 1,
    "cmd-go": 1,
    "cmd-reload": 1,
    "cmd-stop": 1,
    "cmd-open-bookmark": 1,
    "cmd-filter-bookmarks": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    switch (cmd) {
      case "cmd-back":
        return this.browser.canGoBack;
      case "cmd-forward":
        return this.browser.canGoForward;
      case "cmd-go":
        return this.docview.urlbar.value != "";
      case "cmd-stop":
        return this.browser.webProgress.isLoadingDocument;
      case "cmd-open-bookmark":
        return true;
      case "cmd-filter-bookmarks":
        return true;
      default:
        return true;
    }
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-back":
        this.browser.goBack();
        break;
      case "cmd-forward":
        this.browser.goForward();
        break;
      case "cmd-go":
        this.browser.loadURI(this.docview.urlbar.value, null, null);
        break;
      case "cmd-reload":
        this.browser.reload();
        break;
      case "cmd-stop":
        this.browser.stop();
        break;
      case "cmd-open-bookmark":
        this.bookmarks.openItemKey();
        break;
      case "cmd-filter-bookmarks":
        var navpanel = this.docview.navpanel;
        navpanel.tree.searchBookmarks(navpanel.filtervalue);
        break;
      default:
        dump("*** BrowserController: Unknown command " + cmd + "\n");
    }
  },

  updateCommands: function () {
    goUpdateCommand("cmd-back");
    goUpdateCommand("cmd-forward");
    goUpdateCommand("cmd-go");
    goUpdateCommand("cmd-reload");
    goUpdateCommand("cmd-stop");
  },

  handleEvent: function (event) {
    if (event.target != this.docview.urlbar)
      return;
    switch (event.keyCode) {
      case 13: // DOM_VK_RETURN
      case 14: // DOM_VK_ENTER
        goDoCommand("cmd-go");
        break;
      case 27: // DOM_VK_ESCAPE
        this.docview.urlbar.value = this.browser.currentURI.spec;
        break;
    }
  },

  // nsIWebProgressListener implementation
  onLocationChange: function (prog, req, loc) {
    this.docview.urlbar.value = loc.spec;
    SetPageProxyState("valid", loc);
  },

  onProgressChange: function (prog, req, curSelf, maxSelf, curTot, maxTot) {},

  onSecurityChange: function (prog, req, state) {},

  onStateChange: function (prog, req, flags, status) {
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    this.updateCommands();
    if (flags & nsIWebProgressListener.STATE_START)
      this.favIconURL = null;
    else if (flags & nsIWebProgressListener.STATE_STOP &&
             flags & nsIWebProgressListener.STATE_IS_NETWORK) {
      this.updatePageFavIcon(null);
    }
  },

  onStatusChange: function (prog, req, status, msg) {},

  // From tabbrowser.xml
  buildFavIconString: function (uri) {
    var end = (uri.port == -1) ? "/favicon.ico"
                               : (":" + uri.port + "/favicon.ico");
    return uri.scheme + "://" + uri.host + end;
  },

  // Adapted from browser.js
  updatePageFavIcon: function (aListener) {
    var uri = this.browser.currentURI;
  
    if (! ("schemeIs" in uri &&
        (uri.schemeIs("http") || uri.schemeIs("https"))))
      return;
  
    // if we made it here with this null, then no <link> was found for
    // the page load.  We try to fetch a generic favicon.ico.
    if (this.favIconURL == null)
      this.favIconURL = this.buildFavIconString(uri);
  
    PageProxySetIcon(this.favIconURL);
  
    if (this.favIconURL != null)
      BookmarksUtils.loadFavIcon(uri.spec, this.favIconURL);
  }
};


function UpdatePageProxyState()
{
  if (gURLBar && gURLBar.value != gLastValidURLStr)
    SetPageProxyState("invalid", null);
}


function SetPageProxyState(aState, aURI)
{
  gProxyButton.setAttribute("pageproxystate", aState);

  // the page proxy state is set to valid via OnLocationChange, which
  // gets called when we switch tabs.  We'll let updatePageFavIcon
  // take care of updating the mFavIconURL because it knows exactly
  // for which tab to update things, instead of confusing the issue
  // here.
  if (aState == "valid") {
    gLastValidURLStr = gURLBar.value;
    gURLBar.addEventListener("input", UpdatePageProxyState, false);

    var favIconURL = gProjWin.currentDocumentView.controller.favIconURL;
    if (favIconURL != null) {
      PageProxySetIcon(favIconURL);
    } else {
      PageProxyClearIcon();
    }
  } else if (aState == "invalid") {
    gURLBar.removeEventListener("input", UpdatePageProxyState, false);
    PageProxyClearIcon();
  }
}


function PageProxySetIcon (aURL)
{
  if (!gProxyFavIcon)
    return;

  if (gProxyFavIcon.getAttribute("src") != aURL)
    gProxyFavIcon.setAttribute("src", aURL);
  else if (gProxyDeck.selectedIndex != 1)
    gProxyDeck.selectedIndex = 1;
}


function PageProxyClearIcon ()
{
  if (gProxyDeck.selectedIndex != 0)
    gProxyDeck.selectedIndex = 0;
  if (gProxyFavIcon.hasAttribute("src"))
    gProxyFavIcon.removeAttribute("src");
}


// Adapted from browser.js
function PageProxyDragGesture(aEvent)
{
  if (gProxyButton.getAttribute("pageproxystate") == "valid") {
    nsDragAndDrop.startDrag(aEvent, proxyIconDNDObserver);
    return true;
  }
  return false;
}


// Adapted from browser.js
var proxyIconDNDObserver = {
  onDragStart: function (aEvent, aXferData, aDragAction)
    {
      var value = gURLBar.value;
      // XXX - do we want to allow the user to set a blank page to their homepage?
      //       if so then we want to modify this a little to set about:blank as
      //       the homepage in the event of an empty urlbar.
      if (!value) return;

      var urlString = value + "\n" + window._content.document.title;
      var htmlString = "<a href=\"" + value + "\">" + value + "</a>";

      aXferData.data = new TransferData();
      aXferData.data.addDataForFlavour("text/x-moz-url", urlString);
      aXferData.data.addDataForFlavour("text/unicode", value);
      aXferData.data.addDataForFlavour("text/html", htmlString);

      // we're copying the URL from the proxy icon, not moving
      // we specify all of them though, because d&d sucks and OS's
      // get confused if they don't get the one they want
      aDragAction.action =
        Components.interfaces.nsIDragService.DRAGDROP_ACTION_COPY |
        Components.interfaces.nsIDragService.DRAGDROP_ACTION_MOVE |
        Components.interfaces.nsIDragService.DRAGDROP_ACTION_LINK;
    }
};

