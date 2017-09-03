// scriptcontroller.js -- supercedes edCmdObserver and more!


function ScriptController(docview) {
  this.docview = docview;
  this.scriptEditor = docview.scripteditor;
  this.boneEditor = docview.boneyardeditor;
  this._activeEditor = this.scriptEditor;
  this.scriptLoaded = false;
  this.boneLoaded = false;
  this.openwindows = { findreplace: null, spellcheck: null };
  try {
    var mgr = this.scriptEditor.editorElement.commandManager;
    mgr.addCommandObserver(this, 'cmd_bold');
    mgr.addCommandObserver(this, 'cmd_setDocumentModified');
    mgr.addCommandObserver(this, 'obs_documentCreated');

    mgr = this.boneEditor.editorElement.commandManager;
    mgr.addCommandObserver(this, 'cmd_bold');
    mgr.addCommandObserver(this, 'cmd_setDocumentModified');
    mgr.addCommandObserver(this, 'obs_documentCreated');
  }
  catch (ex) {
    dump("*** ScriptController: " + ex + "\n");
  }
}


ScriptController.prototype = {
  lastBlock: null,
  lastModCount: 0,

  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIObserver) ||
        iid.equals(Components.interfaces.nsIDOMEventListener) ||
        iid.equals(Components.interfaces.nsIClipboardDragDropHooks))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },


  // nsIController implementation
  commands: {
    // Implemented
    "cmd-bold": 1,
    "cmd-check-spelling": 1,
    "cmd-export-script": 1,
    "cmd-find": 1,
    "cmd-find-next": 1,
    "cmd-find-previous": 1,
    "cmd-generate-pdf": 1,
    "cmd-import": 1,
    "cmd-italic": 1,
    "cmd-insert-note": 1,
    "cmd-recycle-scene": 1,
    "cmd-recycle-selection": 1,
    "cmd-replace": 1,
    "cmd-set-zoom": 1,
    "cmd-show-resource": 1,
    "cmd-toggle-boneyard": 1,
    "cmd-treeitem-up": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-goto": 1,
    "cmd-treeitem-selected": 1,
    "cmd-underline": 1,
    "cmd-unmarkup": 1,

    // Unimplemented
    "cmd-media-search": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    switch (cmd) {
      // Implemented
      case "cmd-bold":
      case "cmd-check-spelling":
      case "cmd-export-script":
      case "cmd-find":
      case "cmd-find-next":
      case "cmd-find-previous":
      case "cmd-generate-pdf":
      case "cmd-import":
      case "cmd-insert-note":
      case "cmd-italic":
      case "cmd-replace":
      case "cmd-set-zoom":
      case "cmd-toggle-boneyard":
      case "cmd-treeitem-selected":
      case "cmd-underline":
        return true;

      // Enabled for resource selections
      case "cmd-recycle-scene":
      case "cmd-treeitem-goto":
      case "cmd-treeitem-down":
      case "cmd-treeitem-up":
      case "cmd-treeitem-delete":
        return this.tree != null &&
               this.tree.selection != null;

      case "cmd-show-resource":
        return this.editor.inMarkup;

      case 'cmd-media-search':
        // TODO
        return false;

      case "cmd-recycle-selection":
      case "cmd-unmarkup":
        return ! document.getElementById("cmd_cut").disabled;

      default:
        return false;
    }
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-export-script":
        this.exportScript();
        break;
      case "cmd-generate-pdf":
        this.generatePDF();
        break;
      case "cmd-set-zoom":
        this.docview.setZoomByMenu();
        break;
      case "cmd-insert-note":
        this.insertNote();
        break;
      case "cmd-check-spelling":
        this.checkSpelling();
        break;
      case "cmd-find":
        this.findReplace(false);
        break;
      case "cmd-replace":
        this.findReplace(true);
        break;
      case "cmd-find-next":
      case "cmd-find-previous":
        this.findAgain(cmd);
        break;
      case "cmd-treeitem-goto":
        this.goToResource(this.tree.selection);
        break;
      case "cmd-show-resource":
        this.showResource();
        break;
      case "cmd-media-search":
        // TODO
        break;
      case "cmd-toggle-boneyard":
        // TODO
        this.toggleBoneyard();
        break;
      case "cmd-treeitem-down":
        // Down visually, but up numerically
        this.tree.moveScene(this.tree.selection, "up");
        break;
      case "cmd-treeitem-up":
        // Up visually, but down numerically
        this.tree.moveScene(this.tree.selection, "down");
        break;
      case "cmd-treeitem-delete":
        this.deleteScene(this.tree.selection);
        break;
      case "cmd-treeitem-selected":
        this.tree.selectionChanged();
        break;
      case "cmd-import":
        this.importScript();
        break;
      case "cmd-bold":
        this.editor.toggleStyle("bold");
        break;
      case "cmd-italic":
        this.editor.toggleStyle("italic");
        break;
      case "cmd-underline":
        this.editor.toggleStyle("underline");
        break;
      case "cmd-recycle-scene":
        this.recycleScene(this.tree.selection);
        break;
      case "cmd-recycle-selection":
        this.recycleSelection();
        break;
      case "cmd-unmarkup":
        this.unMarkup();
        break;
      default:
        dump("*** ScriptController.doCommand: Ignoring command " + cmd + "\n");
    }
  },


  get editor () {
    return this._activeEditor;
  },


  set editor (val) {
    val.editorElement.contentWindow.focus();
    return val;
  },


  setMenusVisible: function (visible) {
    var hidden = ! visible;
    document.getElementById("export-script-menuitem").hidden = hidden;
    document.getElementById("generate-pdf-menuitem").hidden = hidden;
    document.getElementById("import-script-menuitem").hidden = hidden;
    document.getElementById("check-spelling-menuitem").hidden = hidden;
  },


  showMenus: function () {
    this.setMenusVisible(true);
  },


  hideMenus: function () {
    this.setMenusVisible(false);
  },


  updateCommands: function () {
    // Restricted to script editor
    goUpdateCommand("cmd-bold");
    goUpdateCommand("cmd-italic");
    goUpdateCommand("cmd-underline");
    goUpdateCommand("cmd-set-zoom");
  },


  // Commands, etc., releated to editing actions, editor motion
  updateEditingCommands: function () {
    goUpdateCommand("cmd-show-resource");

    // Update commands dependent on script selection
    // ??? still needed?
    var selBC = document.getElementById("script-selection");
    if (this.editor.isTextSelected) {
      selBC.removeAttribute("disabled");
    }
    else {
      selBC.setAttribute("disabled", true);
    }

    window.updateCommands("undo");
  },


  updateEditorStatusBar: function () {
    var hint = this.editor.styleHint();
    if (! hint) {
      this.docview.setStatusMessage("");
    }
    else {
      var msg = "{" + app.text("tabKey") + "} "
        + this.lookupStyleName(hint.tab);
      if (hint.enter) {
        msg += ", {" + app.text("enterKey") + "} "
          + this.lookupStyleName(hint.enter);
      }
      this.docview.setStatusMessage(msg);
    }
  },


  lookupStyleName: function (id) {
    // KLUDGE: style names aren't in a properties file, only a DTD
    var formats = document.getElementById("format-menu-popup");
    for (var i = 0; i < formats.childNodes.length; i++) {
      var item = formats.childNodes[i];
      if (item.value == id) return item.label;
    }
    return "";
  },


  // Callback invoked by the editor's commandManager
  observe: function (subject, topic, data) {
    var editor = this.editor;
    switch (topic) {

    case 'cmd_bold':

      var blk = editor.currentBlock;
      if (! blk) {
        if (editor.documentIsBlank) {
          blk = editor.formatDefault();
        }
        else {
          blk = editor.avoidBlankNodes();
        }
      }

      var cnt   = editor.modificationCount;
      var btype = editor.blockTypeOf(blk);

      this.updateFormatMenu(this.docview.formatmenu, btype);

      // Autotext sanity check
      this.checkAutoTextPopup(btype);

      var changedBlock = null;
      if (! this.lastBlock) {
        this.lastBlock = blk;
      }
      else if (this.lastBlock == blk) {
        if (this.lastModCount != cnt) {
          changedBlock = blk;
        }
      }
      else {
        // Different block
        var modified = false;
        if (this.lastModCount != cnt) {
          changedBlock = this.lastBlock;
          modified = true;
        }

        switch (editor.blockTypeOf(this.lastBlock)) {
        case 'character':
          this.noticeCharacter(this.lastBlock, modified);
          break;
        case 'sceneheading':
          this.noticeHeading(this.lastBlock, modified);
          break;
        }

        this.lastBlock = blk;
      }

      this.lastModCount = cnt;

      if (changedBlock) {
        switch (editor.blockTypeOf(changedBlock)) {
        case 'character':
          this.maybeCharacterChanged(changedBlock);
          break;
        case 'sceneheading':
          this.maybeHeadingChanged(changedBlock);
          break;
        }
      }

      this.updateEditingCommands();
      this.updateEditorStatusBar();

      break;

    case 'cmd_setDocumentModified':
      break;

    case 'obs_documentCreated':
      if (subject == this.scriptEditor.editorElement.commandManager) {
        this.documentCreated(this.scriptEditor);
        this.scriptLoaded = true;
      }
      else {
        this.documentCreated(this.boneEditor);
        this.boneLoaded = true;
      }
      if (this.boneLoaded && this.scriptLoaded) {
        this.editor = this.scriptEditor;
        if (this.editor.documentIsBlank)
          this.editor.formatDefault();
      }
      break;
    }
  },


  // Called when editor has loaded and initialized document
  documentCreated: function (editor) {
    var body = editor.doc.body;
    body.addEventListener("click", this, false);
    body.addEventListener("dblclick", this, false);
    body.addEventListener("mouseover", this, false);
    body.addEventListener("mouseout", this, false);
    editor.doc.addEventListener("focus", this, false);

    // Add hooks for copy/paste
    try {
      var mgr = editor.editorElement.commandManager;
      var params = Components.classes["@mozilla.org/embedcomp/command-params;1"]
        .createInstance(Components.interfaces.nsICommandParams);
      params.setISupportsValue("addhook", this);
      mgr.doCommand("cmd_clipboardDragDropHook", params,
        editor.editorElement.contentWindow);
    }
    catch (ex) {
      dump("*** documentCreated: " + ex + "\n");
    }

    editor.cleanup();

    if (editor == this.scriptEditor)
      this.delayedDocumentCreated(editor);
    else
      this.checkBoneyardStyle();
  },


  // For lower priority tasks after document creation
  delayedDocumentCreated: function (editor) {
    // Connect the navigator tree to the document
    this.tree = new SceneTree(document.getAnonymousElementByAttribute(
      this.docview.navpanel, "anonid", "project-tree"), this.scriptEditor);

    this.scriptEditor.editorElement.contentWindow.focus();
    this.syncScriptTitle();
    this.initTimers();
    this.findCharacters();
    this.findSceneHeadings();

    this.scriptDragObserver = new SceneTreeDragObserver(this.tree);
    this.tree.elem.view.addObserver(this.scriptDragObserver);

    // XXX HACK
    gProjWin.sceneTreeDS = this.tree.ds;

    if (this.scriptEditor.zoomed)
      this.docview.zoommenu.selectedItem =
        this.docview.zoommenu.firstChild.lastChild;
  },


  // This should be deprecated: Its function should be replaced with something
  // more appropriate in the creation of the boneyard script.
  checkBoneyardStyle: function () {
    const IHTMLLinkElement = Components.interfaces.nsIDOMHTMLLinkElement;
    var bonedoc = this.boneEditor.editorElement.contentDocument;
    var re = new RegExp(this.boneEditor.pageRegex);
    var links = bonedoc.getElementsByTagName("link");
    for (var i = 0; i < links.length; ++i) {
      var link = links[i].QueryInterface(IHTMLLinkElement);
      var pageSettings = re.exec(link.href);
      if (pageSettings && pageSettings[4] == ".css") {
        var newLink = link.cloneNode(false).QueryInterface(IHTMLLinkElement);
        newLink.href = pageSettings[1] + pageSettings[2] + "-"
          + pageSettings[3] + "-Recycle.css";
        link.parentNode.replaceChild(newLink, link);
        return;
      }
    }
  },

  close: function () {
    this.cancelTimers();
  },


  focus: function () {
    this.showMenus();
    gProjWin.setCloseTabEnabled(false);
  },


  blur: function () {
    for (auxwin in this.openwindows) {
      if (this.openwindows[auxwin] && ! this.openwindows[auxwin].closed)
        this.openwindows[auxwin].close();
    }
    this.hideMenus();
    gProjWin.setCloseTabEnabled(true);
  },


  // =====[ Find & Replace ]=====
  findReplace: function (showReplace) {
    this.editor.editorElement.contentWindow.focus();

    var openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed) {
      if (openwin.dialog.editor == this.editor) {
        openwin.focus();
        return;
      }
      else
        openwin.close();
    }

    this.openwindows.findreplace =
      window.openDialog(Cx.CONTENT_PATH + "findreplace.xul",
          "_blank",
          "chrome,titlebar,dependent,centerscreen,dialog=no",
          this.editor, showReplace);
  },


  findAgain: function (cmd) {
    var backwards = cmd == "cmd-find-previous";

    try {
      var findInst = this.editor.editorElement.webBrowserFind;
      var findSvc  = getFindService();

      findInst.findBackwards = findSvc.findBackwards ^ backwards;
      findInst.findNext();
      findInst.findBackwards = findSvc.findBackwards;
    }
    catch (ex) {
      dump("findAgain: " + ex + "\n");
    }
  },


  // =====[ Spellcheck ]=====
  checkSpelling: function () {
    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed) {
      openwin.focus();
      return;
    }

    // var editorFn = function () { return this.editor.editor; };

    this.openwindows.spellcheck =
      window.openDialog(Cx.CONTENT_PATH + "spellcheck.xul",
          "_blank",
          "chrome,titlebar,dependent,centerscreen,dialog=no",
          this.editor.editor);
  },

  // nsiClipboardDragDrogHooks implementation
  allowDrop: function (event, session) {
    return true;
  },


  allowStartDrag: function (event) {
    return true;
  },


  onCopyOrDrag: function (event, trans) {
    if (event != null) {
      // Triggered by drag
      this.dragSource = this.editor;
    }
    try {
      var cxtxt = "celtx";
      var str = createSupportsString(cxtxt);
      trans.addDataFlavor("text/x-celtx");
      trans.setTransferData("text/x-celtx", str, cxtxt.length * 2);
    }
    catch (ex) {
      dump("*** onCopyOrDrag: " + ex + "\n");
    }
    return true;
  },


  onPasteOrDrop: function (event, trans) {
    if (event != null) {
      // Triggered by drag
      var targetDoc = event.target.ownerDocument;
      if (this.dragSource != null &&
          this.dragSource.doc != targetDoc) {
        this.dragSource.deleteSelection();
        this.dragSource = null;
      }
      return true;
    }
    try {
      var data = {};
      var dataLen = {};
      try {
        trans.getTransferData("text/x-celtx", data, dataLen);
      }
      catch (ex) {
        data = null;
      }
      if (! data) {
        data = {};
        try {
          trans.getTransferData("text/html", data, dataLen);
        }
        catch (ex) {
          data = null;
        }
        if (data) {
          var cxtxt = "celtx";
          var str = createSupportsString(cxtxt);
          trans.addDataFlavor("text/x-celtx");
          trans.setTransferData("text/x-celtx", str, cxtxt.length * 2);
          this.editor.editor.pasteNoFormatting(1); // 1 == SELECTION_NORMAL
          return false;
        }
      }
    }
    catch (ex) {
      dump("*** onPasteOrDrop: " + ex + "\n");
    }
    return true;
  },


  updateFormatMenu: function (formatMenu, btype) {
    for (var i = 0; i < formatMenu.firstChild.childNodes.length; i++) {
      var item = formatMenu.firstChild.childNodes[i];
      if (item.value == btype) {
        formatMenu.selectedItem = item;
        break;
      }
    }
  },


  handleEvent: function (event) {
    switch (event.type) {
      case "click":
        this.editorClick(event);
        break;
      case "dblclick":
        this.editorDoubleClick(event);
        break;
      case "mouseover":
        this.editorMouseOver(event);
        break;
      case "mouseout":
        this.editorMouseOut(event);
        break;
      case "focus":
        if (event.target == this.scriptEditor.doc)
          this._activeEditor = this.scriptEditor;
        else if (event.target == this.boneEditor.doc)
          this._activeEditor = this.boneEditor;
        var blk = this.editor.currentBlock;
        var btype = this.editor.blockTypeOf(blk);
        this.updateFormatMenu(this.docview.formatmenu, btype);
        break;
    }
  },

  editorClick: function (event) {
    if (! event) return;
  
    try {
      // c.f. event.explicitOriginalTarget, which will not be anonymous
      // content, and can be a text node.
      var elem = event.originalTarget
                   .QueryInterface(Components.interfaces.nsIDOMElement);
      var tag = elem.localName.toLowerCase();
      if (tag == "span" && elem.className == "note") {
        this.showNotePopup(elem);
      }
    }
    catch (ex) {
      dump("*** editorClick: " + ex + "\n");
    }
  },


  editorMouseOver: function (event) {
    if (! event.target.localName == "SPAN") return;
    var ref = event.target.getAttribute("ref");
    if (! ref) return;
    this.showItemInStatusBar(ref);
  },


  editorMouseOut: function (event) {
    if (! event.target.localName == "SPAN") return;
    this.docview.setStatusMessage("");
  },


  editorDoubleClick: function (event) {
   if (! event.target.localName == 'SPAN') return;
    var ref = event.target.getAttribute("ref");
    if (! ref) return;
    gProjWin.markupSelected(ref);
  },


  showItemInStatusBar: function (ref) {
    if (ref) {
      var m = gProjWin.project.model;
      var elemRes = RES(ref);
      var typeRes = m.target(elemRes, RES(Cx.NS_RDF + "type"));
      if (typeRes) {
        var typeName = gProjWin.project.schema.target(typeRes,
          RES(Cx.NS_RDFS + "label"));
        var itemName = m.target(elemRes, RES(Cx.NS_DC + "title"));
        var txt = typeName.value + ": " + itemName.value;
        this.docview.setStatusMessage(txt);
      }
      else {
        dump("*** Dangling reference in script: " + ref + "\n");
        this.docview.setStatusMessage("");
      }
    }
    else {
      this.docview.setStatusMessage("");
    }
  },


  syncScriptTitle: function () {
    dump("*** ignoring call to syncScriptTitle\n");
    // if (this.editor.title != gProjWin.project.title)
    //   this.editor.title = gProjWin.project.title;
  },


  boneDropObserver: {
    getSupportedFlavours: function () {
      var flavours = new FlavourSet();
      flavours.appendFlavour("text/html");
      return flavours;
    },

    onDragOver: function (event, flavour, session) {},

    canDrop: function (event, session) {
      return session.isDataFlavorSupported("text/x-celtx");
    },

    onDrop: function (event, data, session) {
      goDoCommand("cmd-recycle-selection");
    }
  },


  recycleSelection: function () {
    const nsIDOMNode = Components.interfaces.nsIDOMNode;
    try {
      var sel = this.scriptEditor.editor.selection;
      if (sel.rangeCount == 0)
        throw "Selection does not include any ranges";
      if (sel.rangeCount > 1)
        throw "Selection includes multiple ranges";
      var range = sel.getRangeAt(0);
      var fragment = range.cloneContents();
      if (range.startContainer == range.endContainer &&
          range.startContainer.nodeType == nsIDOMNode.TEXT_NODE) {
        var para = this.scriptEditor.doc.createElement("p");
        var parent = range.startContainer.parentNode;
        para.setAttribute("class", parent.getAttribute("class"));
        para.appendChild(fragment.childNodes[0]);
        fragment.appendChild(para);
      }
      
      this.boneEditor.importScene(fragment);
      this.boneEditor.scrollY =
        this.boneEditor.editorElement.contentWindow.scrollMaxY;
      this.scriptEditor.deleteSelection();
    }
    catch (ex) {
      dump("*** recycleSelection: " + ex + "\n");
    }
  },


  recycleScene: function (id) {
    if (! window.confirm(app.text("ConfirmRecycleScene"))) return;
    try {
      var fragment = this.scriptEditor.rangeOfScene(id).cloneContents();
      this.boneEditor.importScene(fragment);
      this.boneEditor.scrollY =
        this.boneEditor.editorElement.contentWindow.scrollMaxY;
      this.scriptEditor.deleteScene(id);
    }
    catch (ex) {
      dump("*** recycleScene: " + ex + "\n");
    }
    this.tree.update();
  },


  deleteScene: function (id) {
    if (! window.confirm(app.text("ConfirmDeleteScene"))) return;
    this.scriptEditor.deleteScene(id);
    this.tree.update();
  },


  goToResource: function (id) {
    this.editor = this.scriptEditor;
    this.scriptEditor.cursorToScene(id);
  },


  // Select the current editor resource in the tree view
  // XXX TODO
  showResource: function () {
    var ref = this.editor.currentMarkup;
    // if (m) app.tree.select(m.scene, m.item);  
  },


  // =====[ Timers ]=====
  initTimers: function () {
    gProjWin.addTimer(this, "autoSaveScript", 300000);
    gProjWin.addTimer(this, "updatePageCount", 5000, -1);
    gProjWin.addTimer(this, "syncWithScript", 2000);
  },


  // Called from the docview.xml binding
  cancelTimers: function () {
    gProjWin.removeTimers(this);
  },


  syncWithScript: function (timer) {
    if (timer.data == this.scriptEditor.modificationCount)
      return;
    timer.data = this.scriptEditor.modificationCount;
    dump("--- syncWithScript\n");
    this.tree.update();
  },


  updatePageCount: function (timer) {
    if (timer.data == this.scriptEditor.modificationCount)
      return;
    var count = this.editor.pageCount;
    if (count < 0)
      return;
    timer.data = this.scriptEditor.modificationCount;
    var elem = document.getAnonymousElementByAttribute(this.docview, "anonid",
      "status-pagecount");
    elem.label = app.text("PageCountPrefix") + " " +  count;
  },


  autoSaveScript: function (timer) {
    if (timer.data == this.scriptEditor.modificationCount)
      return;
    timer.data = this.scriptEditor.modificationCount;
    this.docview.saveScratch();
  },


  get autotext () {
    return top.autotext;
  },

  autotextView: {
  
    QueryInterface: function (iid) {
      if (iid.equals(Components.interfaces.nsITreeView) ||
          iid.equals(nsISupportsWeakReference))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },
  
    _list: [],
  
    get rowCount () { return this._list.length; },
  
    valueOf: function (row) { return this._list[row]; },
  
    setList: function (list) {
      var prev = this._list;
      this._list = list;
      if (this.treebox != null) {
        try {
          this.treebox.rowCountChanged(prev.length - 1, list.length - prev.length);
        } catch (ex) { dump("rowCountChanged: " + ex + "\n"); }
      }
    },
  
    getCellText : function(row, col){
      return this._list[row];
    },
  
    setTree: function (treebox){
      this.treebox = treebox;
    },

    defaultTreeRowHeight: function () {
      // Kludge
      const DEFAULT = 18;
      // if (this.tree.elem.treeBoxObject) {
      if (false) {
        var h = this.tree.elem.treeBoxObject.rowHeight;
        return (h > 0 ? h : DEFAULT);
      }
      else {
        return DEFAULT;
      }
    },
  
    get rowHeight () {
      if (this.treebox) return this.treebox.rowHeight;
      return this.defaultTreeRowHeight();
    },
  
    isContainer: function (row) { return false; },
  
    isSeparator: function (row) { return false; },
  
    isSorted: function (row) { return false; },
  
    getLevel: function (row) { return 0; },
  
    getImageSrc: function (row, col) { return null; },
  
    getRowProperties: function (row, props) { },
  
    getCellProperties: function (row, col, props) { },
  
    getColumnProperties: function(id, col, props) { }
  
  },
  
  
  findElements: function (id, className) {
  
    try {
    var xpath = new XPathEvaluator();
    var xset, e, s;
    var str = '//p[@class="' + className + '"]';
    var doc = this.editor.doc;
      this.autotext[id] = {};
      xset = xpath.evaluate(str, doc, null, 0, null);
      while (e = xset.iterateNext()) {
        s = stringify(e).toUpperCase();
        if (! s.match(/\S+/) || this.autotext[id][s]) continue;
        this.autotext[id][s] = 1;
      }
    }
    catch (ex) {
      dump("findElements: " + ex + "\n");
    }
  },
  
  
  findCharacters: function () {
    this.findElements("chars", "character");
  },
  
  
  findSceneHeadings: function () {
    this.findElements("headings", "sceneheading");
    // Add in defaults
    this.autotext.headings["EXT."] = 1;  // XXX needs i18n
    this.autotext.headings["INT."] = 1;
  },
  
  
  noticeElement: function (id, node) {
    try {
      var s = stringify(node).toUpperCase();
      if (s.match(/\S+/) && ! this.autotext[id][s]) this.autotext[id][s] = 1;
    }
    catch (ex) {
      dump("noticeElement: " + ex + "\n");
    }
  },
  
  
  noticeCharacter: function (node, modified) {
    this.noticeElement('chars', node);
    this.canonicalizeHeading(node);
  },
  
  
  noticeHeading: function (node, modified) {
    this.noticeElement('headings', node);
    this.canonicalizeHeading(node);
  },
  
  
  canonicalizeHeading: function (block) {
    var nodes = [ block ];
    var nd, ustr, i;
    
    while (nodes.length > 0) {
      nd = nodes.shift();
  
      if (nd.hasChildNodes()) {
        for (i = 0; i < nd.childNodes.length; i++) {
          nodes.push(nd.childNodes[i]);
        }
      }
  
      if (nd.nodeType == Node.TEXT_NODE) {
        ustr = nd.nodeValue.toUpperCase();
        if (nd.nodeValue != ustr) {
          nd.nodeValue = ustr;
        }
      }
    }
  },
  
  
  handleAutoTextPopup: function (id, blk) {
    var popup = document.getElementById('autotext-popup');
    if (! popup) return;
  
    if (blk != this.editor.currentBlock ||
        this.editor.isTextSelected ||
        stringify(blk) == '' ||
        ! this.editor.atEndOfBlock(blk, this.editor.selection)) {
      // Spurious notification
      if (popup.isOpen) popup.close();
      return;
    }
  
    var str = stringify(blk).toUpperCase();
    var list = [];
    for (var e in this.autotext[id]) {
      if (e.indexOf(str) == 0) list.push(e);
    }
    list.sort();
  
    try {
      if (popup.isOpen) {
        if (list.length == 0) {
          popup.close();
          return;
        }
        popup.selectedIndex = -1;
        this.autotextView.setList(list);
        popup.invalidate();
      }
      else {
        if (popup.lastBlock == blk && popup.lastCompletion == str) return;
        if (list.length == 0) return;
        this.autotextView.setList(list);
        popup.open(this.editor, blk, this.autotextView);
      }
    }
    catch (ex) {
      dump("handleAutoTextPopup: " + ex + "\n");
    }
  
  },
  
  
  checkAutoTextPopup: function (btype) {
    var popup = document.getElementById('autotext-popup');
    if (! popup || ! popup.isOpen) return;
  
    if (! (btype == 'character' || btype == 'sceneheading') ||
        this.editor.isTextSelected) popup.close();
  },
  
  
  maybeCharacterChanged: function (blk) {
    this.handleAutoTextPopup('chars', blk);
  },


  maybeHeadingChanged: function (node) {
    this.handleAutoTextPopup('headings', node);
    this.updateSceneHeading(node);
  },
  
  
  // A scene heading may have been added or changed
  updateSceneHeading: function (node) {
    var str = stringify(node);
    var id  = node.id;
  
    if (!id) {
      id = generateID();
      node.setAttribute('id', id);
    }
  
    // TODO: update single item in tree instead of total update
    if (this.editor == this.scriptEditor)
      this.tree.update();
  },


  isEditorFocused: function () {
    return gProjWin.currentDocumentView == this.docview &&
      document.commandDispatcher.focusedWindow == window.content;
  },


  unMarkup: function () {
    this.editor.unmarkup();
  },


  // =====[ Notes ]=====
  insertNote: function () {
    var dateline = (new Date()).toLocaleString() + "\n";
    var note = { text: dateline, id: generateID() };

    if (this.showNoteDialog(note) && note.text != "") {
      this.editor.insertNote(note);
    }
  },


  editNote: function (node) {
    var note = { text: node.getAttribute("text") };

    if (this.showNoteDialog(note) && note.text != "") {
      node.setAttribute("text", note.text);
    }
  },


  editNotePopup: function (obj) {
    // obj is a xul label
    try {
      obj.parentNode.parentNode.hidePopup();  // XXX hacky
      if (this.currentNote) this.editNote(this.currentNote);
    } catch (ex) { dump(ex); }
  },


  showNoteDialog: function (note) {
    if (! note) return;

    window.openDialog(Cx.CONTENT_PATH + "notedialog.xul",
                      "_blank",
                      Cx.MODAL_DIALOG_FLAGS,
                      note);
    return ! note.canceled;
  },


  showNotePopup: function (note) {
    if (! note) return;

    this.currentNote = note;

    var popup = document.getElementById("note-popup");
    if (popup.hasAttribute("showing")) {
      // Spurious showNotePopup?
      popup.hidePopup();
      return;
    }

    try {
      var doc = note.ownerDocument;
      var box = doc.getBoxObjectFor(note);
      var x = box.screenX + 12;  // TODO: get offsets from constant
      var y = box.screenY + 14;
  
      var xo = window.content.pageXOffset;
      var yo = window.content.pageYOffset;
  
      x -= xo;
      y -= yo;
  
      var txt = note.getAttribute("text");
      if (txt == "") return;
  
      var desc = document.getElementById("note-popup-text");
      while (desc.hasChildNodes()) {
        desc.removeChild(desc.lastChild);
      }
      desc.appendChild(document.createTextNode(txt));
  
      // XXX null out the popupNode or else context menu use (e.g., via
      // right-click, and even if there is no context menu) may cause
      // popup to appear in the wrong place.
      document.popupNode = null;
      popup.showPopup(this.editor, x, y, "popup", null, null);
    }
    catch (ex) {
      dump("*** showNotePopup: " + ex + "\n");
    }
  },


  // =====[ Import Functions ]=====
  importScript: function () {
    try {
      var fp = getFilePicker();
      fp.init(window, app.text("Import Text Script"), fp.modeOpen);
      fp.appendFilters(fp.filterText);
      if (fp.show() != fp.returnOK) return;

      var mimeType = getMIMEService().getTypeFromFile(fp.file);
      if (mimeType != "text/plain") {
        window.alert(app.text("unsupportedMediaMsg") + " (" + mimeType + ")");
        return;
      }

      this.editor = this.scriptEditor;

      var callbacks = {
        target:      this,
        beginImport: "beginSceneImport",
        importScene: "importScene",
        endImport:   "endSceneImport"
      };

      window.openDialog(Cx.CONTENT_PATH + "importdialog.xul",
                        "_blank",
                        Cx.MODAL_DIALOG_FLAGS,
                        fp.fileURL.spec,
                        fp.file.leafName,
                        callbacks);
    }
    catch (ex) {
      dump("importScript: " + ex + "\n");
    }
  },


  beginSceneImport: function () {
    this.editor.beginSceneImport();
  },


  endSceneImport: function () {
    this.editor.endSceneImport();
    this.tree.update();
    this.findCharacters();
  },


  importScene: function (sceneNode) {
    if (! sceneNode) return;

    try {
      this.editor.importScene(sceneNode);  
    }
    catch (ex) {
      dump("importScene: " + ex + "\n");
    }
  },


  // =====[ Export Functions ]=====

  exportScript: function () {
    // TODO Tony: Warn if no title page information

    this.docview.save();
    try {
      var fp = getFilePicker();
      fp.init(window, app.text("Export Script"), fp.modeSave);
      fp.appendFilters(fp.filterText);
      fp.appendFilters(fp.filterHTML);
      fp.defaultString = gProjWin.project.title;
      fp.defaultExtension = "txt";
      if (fp.show() == fp.returnCancel) return;

      if (fp.filterIndex == 0)
        this.exportScriptAsText(fp.file);
      else if (fp.filterIndex == 1)
        this.exportScriptAsHTML(fp.file);
      else
        throw "Invalid filter index";
    }
    catch (ex) {
      dump("exportScript: " + ex + "\n");
    }
  },


  generatePDF: function () {
    // TODO Tony: Warn if no title page information

    this.docview.saveScratch();
    try {
      var fp = getFilePicker();
      fp.init(window, app.text("Save As"), fp.modeSave);
      fp.appendFilter("PDF", "pdf");
      fp.defaultString = gProjWin.project.title + ".pdf";
      fp.defaultExtension = "pdf";
      if (fp.show() == fp.returnCancel) return;

      if (fp.filterIndex == 0)
        this.exportScriptAsPDF(fp.file);
      else
        throw "Invalid filter index";
    }
    catch (ex) {
      dump("generatePDF: " + ex + "\n");
    }
  },


  exportScriptAsHTML: function (file) {
    ensureExtension(file, 'html');

    try {
      var persist = getWebBrowserPersist();

      var impl    = document.implementation;
      var docID   = "-//W3C//DTD HTML 4.0 Transitional//EN";
      var docType = impl.createDocumentType("html", docID, "");
      var doc     = impl.createDocument("", "html", docType);

      var html = doc.documentElement;
      var head = doc.createElement("head");

      var meta = doc.createElement("meta");
      meta.setAttribute("http-equiv", "Content-Type");
      meta.setAttribute("content", "text/html; charset=" +
                        this.editor.documentCharacterSet);
      head.appendChild(meta);
      if (gProjWin.project.author && gProjWin.project.author != "")
      {
        var author = doc.createElement("meta");
        author.setAttribute("name", "Author");
        author.setAttribute("content", gProjWin.project.author);
        head.appendChild(author);
      }
      if (gProjWin.project.source && gProjWin.project.source != "")
      {
        var source = doc.createElement("meta");
        source.setAttribute("name", "DC.source");
        source.setAttribute("content", gProjWin.project.source);
        head.appendChild(source);
      }
      if (gProjWin.project.rights && gProjWin.project.rights != "")
      {
        var rights = doc.createElement("meta");
        rights.setAttribute("name", "DC.rights");
        rights.setAttribute("content", gProjWin.project.rights);
        head.appendChild(rights);
      }
      if (gProjWin.project.contact && gProjWin.project.contact != "")
      {
        var contact = doc.createElement("meta");
        contact.setAttribute("name", "CX.contact");
        contact.setAttribute("content", gProjWin.project.contact);
        head.appendChild(contact);
      }

      var title = doc.createElement('title');
      title.appendChild(doc.createTextNode(gProjWin.project.title));
      head.appendChild(title);

      var cssDoc = impl.createDocument("", "", null);
      cssDoc.async = false;
      cssDoc.load(Cx.CONTENT_PATH + "embed-css.xml");
      var style = doc.importNode(cssDoc.documentElement, true);

      head.appendChild(style);

      html.appendChild(head);

      // Import the body from the editor document
      var editDoc = this.editor.doc;
      var body = doc.importNode(editDoc.body, true);
      html.appendChild(body);

      // TODO: factor out a saveHTML routine

      // TODO: more output flags? see ComposerCommands.js
      var flags = persist.ENCODE_FLAGS_WRAP
                | persist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
                | persist.ENCODE_FLAGS_FORMATTED;
      var wrap = 80;

      // TODO: other flags?
      persist.persistFlags = persist.persistFlags
                           | persist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                           | persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                           | persist.PERSIST_FLAGS_DONT_FIXUP_LINKS
                           | persist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
                           | persist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

      persist.saveDocument(doc,
                           file,
                           null,  // related files parent dir
                           "text/html",
                           flags,
                           wrap);
    }
    catch (ex) {
      dump("exportScriptAsHTML: " + ex + "\n");
    }
  },


  exportScriptAsText: function (file) {
    ensureExtension(file, "txt");
    var xslFile = Cx.TRANSFORM_PATH + "export-text.xml";

    try {
      var xsl = document.implementation.createDocument("", "", null);
      xsl.async = false;
      xsl.load(xslFile);

      var proc = new XSLTProcessor();
      proc.importStylesheet(xsl);

      var doc = proc.transformToDocument(this.editor.doc);
      var str = stringify_ws(doc.documentElement);

      writeFile(str, file.path);
    }
    catch (ex) {
      dump("plainTextExport: " + ex + "\n");
    }
  },


  pdfExportData: {},


  exportScriptAsPDF: function (file) {
    this.pdfExportData.file = file;
    authenticate("pdf", goDoPDF);
  },


  goDoPDF: function (succeeded) {
    if (! succeeded) {
      window.alert(app.text("LoginFailed"));
      return;
    }
    try {
      if (!this.pdfExportData.file)
        throw "No destination for PDF export";

      var tmpfile   = this.pdfExportData.file;
      var replacing = false;

      if (! tmpfile.leafName.match(/\.pdf$/i)) {
        tmpfile.leafName += ".pdf";
      }

      var truepath = tmpfile.path;

      if (tmpfile.exists()) {
        // Substitute a temporary file in case they cancel
        replacing = true;
        tmpfile = IFile(tempFile(generateID() + ".pdf"));
      }

      var listener = {
        win:      null,
        canceled: false,
        dstpath:  truepath,
        replace:  replacing,
        channel:  null,

        QueryInterface: function (id) {
          if (id.equals(Components.interfaces.nsIDownloadObserver) ||
              id.equals(Components.interfaces.nsISupports)) return this;

          throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        },

        onDownloadComplete: function (downloader, request, context, status, result) {
          if (! this.channel.requestSucceeded) {
            var ps = getPromptService();
            ps.alert(null, null, app.text("pubNoResponseMsg"));
            if (result.exists()) {
              try { result.remove(false); }
              catch (ex) {}
            }
            if (this.win)
              this.win.close();
            return;
          }

          if (this.canceled) {
            if (result.exists())
              result.remove(false);
            return;
          }

          if (this.replace) {
            var orig = IFile(this.dstpath);
            var parentDir = orig.parent;
            var name = orig.leafName;
            try {
              orig.remove(false);
              result.copyTo(parentDir, name);
            }
            catch (ex) {
              dump(ex + "\n");
            }
          }

          if (this.win) this.win.close();
        }

      };


      var ios = getIOService();

      // Get a buffered input stream for the script file
      var src = ios.newURI(this.editor.doc.documentURI, null, null);
      var srcChannel = ios.newChannelFromURI(src);

      var bufferedStream = getBufferedInputStream();
      bufferedStream.init(srcChannel.open(), srcChannel.contentLength);

      // The upload channel
      var convertURL = Cx.PDF_CONVERT_URL;
      var target = ios.newURI(convertURL, null, null);
      var upload = ios.newChannelFromURI(target);
      upload instanceof Components.interfaces.nsIHttpChannel;
      upload instanceof Components.interfaces.nsIUploadChannel;

      var charset = this.editor.documentCharacterSet;
      var contentType = "text/html; charset=" + charset;
      upload.setUploadStream(bufferedStream, contentType, -1);
      upload.requestMethod = "POST";

      listener.channel = upload;

      // An nsIDownloader to handle the result
      var downloader = getDownloader();
      downloader.init(listener, tmpfile);

      var session = {
        channel:   upload,
        receiver:  downloader,
        responder: listener
      };

      downloader = null;

      window.openDialog(Cx.CONTENT_PATH + "pdf-download.xul",
                        "_blank",
                        Cx.MODAL_DIALOG_FLAGS,
                        session);
    }
    catch (ex) {
      dump("*** goDoPDF: " + ex + "\n");
    }

  },


  toggleBoneyard: function () {
    var bonecmd = document.getElementById("cmd-toggle-boneyard");
    if (bonecmd.getAttribute("checked") == "true") {
      bonecmd.removeAttribute("checked");
      this.boneEditor.collapsed = true;
      this.scriptEditor.editorElement.contentWindow.focus();
    }
    else {
      bonecmd.setAttribute("checked", "true");
      this.boneEditor.collapsed = false;
      this.boneEditor.editorElement.contentWindow.focus();
    }
  },


  isBoneyardVisible: function () {
    var bonecmd = document.getElementById("cmd-toggle-boneyard");
    return bonecmd.getAttribute("checked") == "true";
  }
};


// The scene tree controller
function SceneTree(tree, editor) {
  this.elem = tree;
  this.editor = editor;
  this.rdf  = getRDFService();
  this.ds   = getInMemoryDatasource();
  var res   = this.rdf.GetResource(this.refURL);
  var cu    = getRDFContainerUtils();
  this.cont = cu.MakeSeq(this.ds, res);
  this._dom = null;

  try {
    this.elem.ref = this.refURL;
    this.elem.database.AddDataSource(this.ds);
    this.dom = editor.doc;
  }
  catch (ex) {
    dump("*** SceneTree: " + ex + "\n");
  }

  this.listener = new TreeKeyListener(this);
  this.elem.addEventListener("keydown", this.listener, false);
}


SceneTree.prototype = {
  get ordinalProp () { return this.rdf.GetResource(Cx.NS_CX + "ordinal"); },
  get titleProp   () { return this.rdf.GetResource(Cx.NS_DC + "title"); },
  get descProp    () { return this.rdf.GetResource(Cx.NS_DC + "description"); },
  get refURL      () { return "urn:celtx:scenes"; },
  get itemPrefix  () { return gProjWin.project.sceneURIPrefix; },

  destroy: function () {
    if (this.ds) {
      this.elem.database.RemoveDataSource(this.ds);
      this.cont = null;
      this.ds   = null;
      this.rdf  = null;
    }
    this._dom = null;
    this.elem.removeEventListener("keydown", this.listener, false);
  },

  update: function () {
    dump("updating tree from dom\n");

    try {
      var exp = '//p[@class="sceneheading"' +
                '    and (br or normalize-space(string(.)) != "")]';
      var xpath = new XPathEvaluator();
      var rv = xpath.evaluate(exp,
                              this.dom,
                              null,
                              XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                              null);
      var i, idx, pos, elem, res, node, str, desc;
      var seen = {};

      for (i = 0; i < rv.snapshotLength; i++) {
        idx  = i + 1;
        elem = rv.snapshotItem(i);
        if (! elem.id || seen[elem.id]) elem.setAttribute('id', generateID());
        seen[elem.id] = true;
        str  = stringify(elem).toUpperCase();
        res  = this.rdf.GetResource(this.itemPrefix + elem.id);
        pos  = this.cont.IndexOf(res);
        // dump(i + " - " + elem.id + "\n");
        this.setLiteralProp(res, this.ordinalProp, idx);
        this.setLiteralProp(res, this.titleProp, str);
        if (pos == -1) {
          // dump("  not found - adding\n");
          this.cont.InsertElementAt(res, idx, true);
        }
        else if (pos != idx) {
          // dump("  found in pos " + pos + "\n");
          node = this.cont.RemoveElementAt(pos, true);
          this.cont.InsertElementAt(node, idx, true);
        }
      }

      // Purge leftover items
      for (i = this.cont.GetCount(); i > rv.snapshotLength; i--) {
        // dump("  removing leftover item " + i + "\n");
        this.cont.RemoveElementAt(i, true);
      }
    }
    catch (ex) {
      dump("update: " + ex + "\n");
    }
  },

  setLiteralProp: function (res, prop, val) {
    newVal = this.rdf.GetLiteral(val);
    oldVal = this.ds.GetTarget(res, prop, true);
    if (oldVal) {
      oldVal = oldVal.QueryInterface(Components.interfaces.nsIRDFLiteral);
      if (oldVal.Value != val) {
        this.ds.Change(res, prop, oldVal, newVal);
      }
    }
    else {
      this.ds.Assert(res, prop, newVal, true);
    }
  },

  clear: function () {
    if (! this.cont) return;

    for (var i = this.cont.GetCount(); i > 0; i--) {
      this.cont.RemoveElementAt(i, true);
    }
  },

  set dom (dom) {
    this._dom = dom;
    this.ds.beginUpdateBatch();
    this.update();
    this.ds.endUpdateBatch();
  },

  get dom () { return this._dom; },

  updateResourceCommands: function () {
    goUpdateCommand("cmd-recycle-scene");
    goUpdateCommand("cmd-treeitem-goto");
    goUpdateCommand("cmd-treeitem-down");
    goUpdateCommand("cmd-treeitem-up");
    goUpdateCommand("cmd-treeitem-delete");
    this.updateMediaCommands();
  },

  updateMediaCommands: function () {
    goUpdateCommand('cmd-media-search');
  },

  selectionChanged: function () {
    // dump("selectionChanged: " + this.selection + "\n");
    // TODO: broadcast?
    this.updateResourceCommands();
  },

  select: function (id) {
    try {
      var tv = this.elem.view;
      var row, rowID;
      for (var i = 0; i < tv.rowCount; i++) {
        row = tv.getResourceAtIndex(i);
        rowID = row.Value.substr(this.itemPrefix.length);
        if (rowID == id) {
          tv.selection.select(i);
          break;
        }
      }
    }
    catch (ex) {
      dump("tree.select: " + ex + "\n");
    }
  },

  // Returns ID of selected item
  get selection () {
    if (! this.elem.view) return null;
    var i = this.elem.view.selection.currentIndex;
    if (i == -1) return null;
    var row = this.elem.view.getResourceAtIndex(i);
    if (! row) return null;
    return row.Value.substr(this.itemPrefix.length);
  },

  get rowCount () { return this.elem.view.rowCount; },

  moveScene: function (scene, direction) {
    var pos = this.editor.scenePosition(scene);
    if (! pos) return;
  
    var newPos = direction == 'up' ? pos + 1 : pos - 1;
    
    if (newPos < 1 || newPos > this.editor.sceneCount) return;
  
    try {
      this.editor.moveScene(pos, newPos);
      this.update();
      this.select(scene);
    }
    catch (ex) {
      dump("moveScene: " + ex + "\n");
    }
  }

};


// Listens for Shift + Up/Down key in the tree view
function TreeKeyListener(tree) {
  this.tree = tree;
}


TreeKeyListener.prototype = {
  handleEvent: function (evt) {
    if (! evt.shiftKey) return;
    if (evt.keyCode != evt.DOM_VK_UP && evt.keyCode != evt.DOM_VK_DOWN)
      return;

    try {
      var id = this.tree.selection;
      if (id) {
        this.tree.moveScene(id, evt.keyCode == evt.DOM_VK_UP ? "down" : "up");
      }
    }
    catch (ex) {
      dump("*** TreeKeyListener.handleEvent: " + ex + "\n");
    }
  }
};


// Handles drag and drop of scenes within and between script and boneyard
function SceneTreeDragObserver (tree) {
  this.tree = tree;
  this.editor = this.tree.editor;
  this.DS = Components.classes["@mozilla.org/widget/dragservice;1"]
    .getService(Components.interfaces.nsIDragService);
}

SceneTreeDragObserver.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIXULTreeBuilderObserver))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },

  getSupportedFlavours: function () {
    var flavours = new FlavourSet();
    flavours.appendFlavour("application/x-celtx-scene");
    return flavours;
  },

  onDragStart: function (event, data, action) {
    data.data = new TransferData();
    data.data.addDataForFlavour("application/x-celtx-scene",
      this.tree.selection);
  },

  canDropBeforeAfter: function (index, before) {
    var session = this.DS.getCurrentSession();
    if (! session)
      return false;
    if (! session.isDataFlavorSupported("application/x-celtx-scene"))
      return false;
    return true;
  },

  canDropOn: function (index) {
    return true;

    if (index >= this.editor.sceneCount)
      return true;
    else
      return false;
  },

  onDrop: function (row, orientation) {
    // XXX: nsIXULTreeBuilderObserver lists constants for orientation, but
    // they're wrong. The correct ones are in nsITreeView.
    const nsITreeView = Components.interfaces.nsITreeView;
    switch (orientation) {
      case nsITreeView.inDropOn:
        dump("*** drop ONTO " + row + "\n");
        break;
      case nsITreeView.inDropBefore:
        dump("*** drop BEFORE " + row + "\n");
        break;
      case nsITreeView.inDropAfter:
        dump("*** drop AFTER " + row + "\n");
        break;
    }
    var session = this.DS.getCurrentSession();
    if (session == null || session.numDropItems < 1)
      return;
    if (orientation == nsITreeView.inDropOn) {
      dump("*** Invalid inDropOn orientation for row: " + row + "\n");
      return;
    }
    if (! session.isDataFlavorSupported("application/x-celtx-scene"))
      return;
    
    var trans = Components.classes["@mozilla.org/widget/transferable;1"]
      .createInstance(Components.interfaces.nsITransferable);
    trans.addDataFlavor("application/x-celtx-scene");
    session.getData(trans, 0);
    var dstPos = row;
    switch (orientation) {
      case nsITreeView.inDropBefore:
        // Leave as is
        break;
      case nsITreeView.inDropAfter:
        dstPos += 1;
        break;
    }
    var data = {};
    var dataLen = {};
    trans.getTransferData("application/x-celtx-scene", data, dataLen);
    data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
    var scene = data.data.substring(0, dataLen.value);
    var pos = this.editor.scenePosition(scene);
    this.editor.moveScene(pos, dstPos);
    this.tree.update();
  },

  isEditable: function (row, colid) { return false; },
  onCycleCell: function (row, colid) {},
  onCycleHeader: function (colid, elt) {},
  onPerformAction: function (action) {},
  onPerformActionOnCell: function (action, row, colid) {},
  onPerformActionOnRow: function (action, row) {},
  onSelectionChanged: function () {},
  onSetCellText: function (row, colid, value) {},
  onToggleOpenState: function (index) {}
};


// Temporary major hack...
function goDoPDF(succeeded) {
  gProjWin.currentDocumentView.controller.goDoPDF(succeeded);
}

