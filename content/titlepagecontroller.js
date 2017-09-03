
function TitlePageController(docview) {
  this.docview = docview;
  this.editor = docview.editor;
  this.loaded = false;
  this.editor.addProgressListener(this);
  this.fieldMap = {
    "titlepage-title": "title",
    "titlepage-author": "author",
    "titlepage-source": "source",
    "titlepage-rights": "rights",
    "titlepage-contact": "contact"
  };
}

TitlePageController.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIWebProgressListener))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },

  commands: {
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    return true;
  },

  doCommand: function (cmd) {
    switch (cmd) {
      default:
        dump("*** TitlePageController: Unknown command " + cmd + "\n");
    }
  },

  onLocationChange: function (prog, req, uri) {},
  onProgressChange: function (prog, req, curself, maxself, curtot, maxtot) {},
  onSecurityChange: function (prog, req, state) {},
  onStatusChange: function (prog, req, status, msg) {},

  onStateChange: function (prog, req, flags, status) {
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    if (flags & nsIWebProgressListener.STATE_STOP &&
        flags & nsIWebProgressListener.STATE_IS_NETWORK) {
      this.loaded = true;
      this.setupListeners();
      this.syncFromProject();
    }
  },

  open: function () {
    gProjWin.project.addPropertyListener(this);
  },

  close: function () {
    gProjWin.project.removePropertyListener(this);
  },

  syncFromProject: function () {
    if (! this.loaded)
      return;
    var doc = this.docview.contentDocument;
    for (var field in this.fieldMap)
      doc.getElementById(field).value = gProjWin.project[this.fieldMap[field]];
  },

  syncToProject: function () {
    if (! this.loaded)
      return;
    var doc = this.docview.contentDocument;
    for (var field in this.fieldMap)
      gProjWin.project[this.fieldMap[field]] = doc.getElementById(field).value;
  },

  setupListeners: function () {
    var doc = this.docview.contentDocument;
    for (var field in this.fieldMap) {
      var input = doc.getElementById(field);
      input.addEventListener("change", this, false);
    }
  },

  handleEvent: function (event) {
    if (event.type != "change")
      return;
    var field = this.fieldMap[event.target.id];
    if (gProjWin.project[field] != event.target.value)
      gProjWin.project[field] = event.target.value;
  },

  propertyChanged: function (project, property) {
    if (! this.loaded)
      return;
    var doc = this.docview.contentDocument;
    for (var field in this.fieldMap) {
      if (this.fieldMap[field] == property) {
        doc.getElementById(field).value = project[property];
        return;
      }
    }
  }
};

