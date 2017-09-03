
function ReportController(docview) {
  this.kScenesURL = "http://celtx.com/selection/scenes";
  this.kDeptsURL  = "http://celtx.com/selection/departments";
  this.kItemsURL  = "http://celtx.com/selection/items";
  this.docview    = docview;
  this.browser    = docview.editor;
  this.selections = null;
  this.sceneds    = null;
  this.sceneAllSelected = false;
}

ReportController.prototype = {
  commands: {
    "cmd-report-scene-changed": 1,
    "cmd-report-dept-changed": 1,
    "cmd-report-item-changed": 1,
    "cmd-report-toggle-media": 1,
    "cmd-report-changed": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    return true;
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-report-scene-changed":
        this.sceneSelectionChanged();
        break;
      case "cmd-report-dept-changed":
        this.deptSelectionChanged();
        break;
      case "cmd-report-item-changed":
        this.itemSelectionChanged();
        break;
      case "cmd-report-toggle-media":
        this.createBreakdown();
        break;
      case "cmd-report-changed":
        this.createBreakdown();
        break;
      default:
        dump("*** ReportController: Unknown command " + cmd + "\n");
    }
  },

  refreshScriptDS: function () {
    dump("--- refreshScriptDS\n");
    // TODO: Make it load the script directly into a temporary browser (or
    // better yet, rewrite ScriptToDatasource to use DOM Core instead of
    // DOM HTML, so we don't have to load the script with a browser).
    var scriptview = gProjWin.ViewForDocument("urn:celtx:document:script");
    if (! scriptview)
      throw "No script view open";
    var scenelist = this.docview.scenelist;
    var deptlist = this.docview.deptlist;
    var itemlist = this.docview.itemlist;
    scenelist.view.selection.selectEventsSuppressed = true;
    if (this.sceneds) {
      // Preserve the scene selection
      if (! this.sceneAllSelected) {
        dump("*** Populating this.sceneSelectionCache\n");
        this.sceneSelectionCache = [];
        var count = scenelist.view.rowCount;
        for (var i = 1; i < count; ++i) {
          var sceneres = scenelist.view.getResourceAtIndex(i);
          if (this.scenes.IndexOf(sceneres) > 0)
            this.sceneSelectionCache.push(sceneres);
        }
      }
      else dump("*** this.sceneAllSelected is true\n");
      scenelist.database.RemoveDataSource(this.sceneds);
      itemlist.database.RemoveDataSource(this.sceneds);
    }
    else {
      dump("*** this.sceneAllSelected is true\n");
      this.sceneAllSelected = true;
    }
    this.sceneds = ScriptToDatasource(scriptview.editor.contentDocument);
    scenelist.database.AddDataSource(this.sceneds);
    scenelist.builder.rebuild();
    itemlist.database.AddDataSource(this.sceneds);
    window.setTimeout(
      "gProjWin.currentDocumentView.controller.selectDefaults()", 500);
  },

  selectDefaults: function () {
    var scenelist = this.docview.scenelist;
    var deptlist = this.docview.deptlist;

    // This seems to be the best way to detect if the scene listbox is still
    // being built from the template.
    if (scenelist.view.rowCount > 1) {
      if (scenelist.view.getCellText(1, "report-scene-value-col") == null) {
        window.setTimeout(
          "gProjWin.currentDocumentView.controller.selectDefaults()", 500);
        return;
      }
    }

    dump("--- selectDefaults\n");

    if (deptlist.view.selection.count == 0)
      deptlist.view.selection.timedSelect(0, 100);
    // Restore the scene selection if we're regaining focus
    if (this.sceneAllSelected || this.sceneSelectionCache.length == 0) {
      dump("this.scenes.GetCount() == " + this.scenes.GetCount() + "\n");
      scenelist.view.selection.timedSelect(0, 100);
    }
    else {
      for (var i = 0; i < this.sceneSelectionCache.length; ++i) {
        var idx = scenelist.view.getIndexOfResource(
          this.sceneSelectionCache[i]);
        if (idx > 0)
          scenelist.view.selection.toggleSelect(idx);
      }
    }
    dump("*** Enabling select events\n");
    scenelist.view.selection.selectEventsSuppressed = false;
  },

  init: function () {

    this.docview.navpanel.selectedIndex = 0;

    // Initialize the datasources
    var svc = getRDFService();
    var utils = getRDFContainerUtils();

    // Selections (intermediate datasources)
    this.selections = getInMemoryDatasource();
    var sceneSeq = svc.GetResource(this.kScenesURL);
    this.scenes = utils.MakeSeq(this.selections, sceneSeq);
    // bd_win.depts is not a sequence; it uses cx:member instead
    this.depts = svc.GetResource(this.kDeptsURL);
    var itemSeq = svc.GetResource(this.kItemsURL);
    this.items = utils.MakeSeq(this.selections, itemSeq);

    // Scenes
    var scenelist = this.docview.scenelist;
    scenelist.database.allowNegativeAssertions = false;
    // scenelist.database.AddDataSource(this.sceneds);
    // scenelist.builder.rebuild();

    // Departments
    var deptlist = this.docview.deptlist;
    deptlist.database.allowNegativeAssertions = false;
    deptlist.ref = gProjWin.project.markupURL; // is this being ignored?
    deptlist.database.AddDataSource(gProjWin.project.model.ds);

    // Items
    var itemlist = this.docview.itemlist;
    itemlist.database.allowNegativeAssertions = false;
    // itemlist.database.AddDataSource(this.sceneds);
    itemlist.database.AddDataSource(gProjWin.project.model.ds);
    itemlist.database.AddDataSource(this.selections);
  },

  sceneSelectionChanged: function () {
    dump("--- sceneSelectionChanged\n");
    var svc = getRDFService();
    // Clear the initial selection list
    var scenelist = this.docview.scenelist;
    while (this.scenes.GetCount() > 0)
      this.scenes.RemoveElementAt(this.scenes.GetCount(), true);
    // Repopulate it, checking for the "ALL" special case
    if (isTreeRowSelected(scenelist, 0)) {
      this.sceneAllSelected = true;
      // If ALL is selected, make it the only selection
      scenelist.view.selection.selectEventsSupressed = true;
      scenelist.view.selection.select(0);
      scenelist.view.selection.selectEventsSupressed = false;
      var count = scenelist.view.rowCount;
      for (var i = 1; i < count; ++i) {
        var item = scenelist.view.getCellText(i, "report-scene-value-col");
        if (! item) {
          dump("*** null scene element at index " + i + "\n");
          break;
        }
        var res = svc.GetResource(item);
        this.scenes.AppendElement(res);
      }
    }
    else {
      this.sceneAllSelected = false;
      var seliter = new TreeSelectionIterator(scenelist);
      while (seliter.hasMore()) {
        var item = scenelist.view.getCellText(seliter.getNext(),
          "report-scene-value-col");
        var res = svc.GetResource(item);
        this.scenes.AppendElement(res);
      }
    }
    this.docview.itemlist.builder.rebuild();
    this.itemSelectionChanged();
  },
  
  // Major XUL template issue:
  // 1. The <member> tag is an iterator and cannot be used as a test instead.
  // 2. The <triple> and <binding> tags cannot use variables for predicate.
  // 3. There is no universal predicate to test for containment by an RDF
  //    container, only the rdf:_# predicates.
  // Hence there is no way to create a template condition for checking if a
  // resource is contained by a container.
  deptSelectionChanged: function () {
    var svc = getRDFService();
    var member = svc.GetResource(Cx.NS_CX + "member");
    var deptlist = this.docview.deptlist;
    // Check membership assertions, checking for the "ALL" special case
    if (isTreeRowSelected(deptlist, 0)) {
      // If ALL is selected, make it the only selection
      deptlist.view.selection.selectEventsSupressed = true;
      deptlist.view.selection.select(0);
      deptlist.view.selection.selectEventsSupressed = false;
      var count = deptlist.view.rowCount;
      for (var i = 1; i < count; ++i) {
        var item = deptlist.view.getCellText(i, "report-dept-value-col");
        var res = svc.GetResource(item);
        if (! this.selections.HasAssertion(this.depts, member, res, true))
          this.selections.Assert(this.depts, member, res, true);
      }
    }
    else {
      var count = deptlist.view.rowCount;
      for (var i = 1; i < count; i++) {
        var item = deptlist.view.getCellText(i, "report-dept-value-col");
        var res = svc.GetResource(item);
        if (isTreeRowSelected(deptlist, i)) {
          if (! this.selections.HasAssertion(this.depts, member, res, true))
            this.selections.Assert(this.depts, member, res, true);
        }
        else {
          if (this.selections.HasAssertion(this.depts, member, res, true))
            this.selections.Unassert(this.depts, member, res);
        }
      }
    }
    this.docview.itemlist.builder.rebuild();
    this.itemSelectionChanged();
  },

  itemSelectionChanged: function () {
    var svc = getRDFService();
    // Clear the initial selection list
    while (this.items.GetCount() > 0)
      this.items.RemoveElementAt(this.items.GetCount(), true);
    var itemlist = this.docview.itemlist;
    // Repopulate it, counting no selection as "ALL"
    if (itemlist.view.selection.count == 0) {
      var count = itemlist.view.rowCount;
      for (var i = 0; i < count; ++i) {
        var item = itemlist.view.getCellText(i, "report-item-value-col");
        var res = svc.GetResource(item);
        this.items.AppendElement(res);
      }
    }
    else {
      var seliter = new TreeSelectionIterator(itemlist);
      while (seliter.hasMore()) {
        var item = itemlist.view.getCellText(seliter.getNext(),
          "report-item-value-col");
        var res = svc.GetResource(item);
        this.items.AppendElement(res);
      }
    }
    // this.docview.medialist.builder.rebuild();
    try {
      this.createBreakdown();
    }
    catch (ex) {
      dump("*** createBreakdown: " + ex + "\n");
    }
  },

  createBreakdown: function () {
    if (this.scenes.GetCount() == 0)
      return;

    const IRes = Components.interfaces.nsIRDFResource;
    const ILit = Components.interfaces.nsIRDFLiteral;
    const IInt = Components.interfaces.nsIRDFInt;
  
    var svc = getRDFService();
    var cu = getRDFContainerUtils();
    var sceneds = this.sceneds;
    var projds = gProjWin.project.model.ds;
    var schema = svc.GetDataSourceBlocking("chrome://celtx/content/schema.rdf");
    var impl = document.implementation;
  
    var titleArc = svc.GetResource(Cx.NS_DC + "title");
    var descArc = svc.GetResource(Cx.NS_DC + "description");
    var labelArc = svc.GetResource(Cx.NS_RDFS + "label");
    var typeArc = svc.GetResource(Cx.NS_RDF + "type");
    var ordinalArc = svc.GetResource(Cx.NS_CX + "ordinal");
    var memberArc = svc.GetResource(Cx.NS_CX + "member");
    var membersArc = svc.GetResource(Cx.NS_CX + "members");
    var mediaArc = svc.GetResource(Cx.NS_CX + "media");
    var imgRsrc = svc.GetResource(Cx.NS_CX + "Image");
  
    // Create the result tree
    var tree = { order: [], scenes: {}, depts: {} };
    // Cache the scene order and details
    var scenes = this.scenes.GetElements();
    while (scenes.hasMoreElements()) {
      var scene = scenes.getNext().QueryInterface(IRes);
      var sceneOrdinal = sceneds.GetTarget(scene, ordinalArc, true);
      sceneOrdinal = sceneOrdinal.QueryInterface(IInt).Value;
      var sceneTitle = sceneds.GetTarget(scene, titleArc, true);
      sceneTitle = sceneTitle.QueryInterface(ILit).Value;
      var sceneDesc = sceneds.GetTarget(scene, descArc, true);
      if (sceneDesc)
        sceneDesc = sceneDesc.QueryInterface(ILit).Value;
      else
        sceneDesc = "";
      var members = sceneds.GetTarget(scene, membersArc, true);
      if (members)
        members = members.QueryInterface(IRes);
      tree.scenes[scene.Value] = {
        ordinal: sceneOrdinal,
        title: sceneTitle,
        description: sceneDesc,
        members: members,
        depts: {}
      };
      tree.order.push(scene.Value);
    }
    // Cache the department titles
    var depts = this.selections.GetTargets(this.depts, memberArc, true);
    while (depts.hasMoreElements()) {
      var dept = depts.getNext().QueryInterface(IRes);
      var deptTitle = schema.GetTarget(dept, labelArc, true);
      tree.depts[dept.Value] = deptTitle.QueryInterface(ILit).Value;
    }
    // Place the items in the tree
    var itemlist = this.docview.itemlist;
    var usemedia = this.docview.mediachecked;
    var count = itemlist.view.rowCount;
    for (var i = 0; i < count; ++i) {
      var listItem = itemlist.view.getCellText(i, "report-item-value-col");
      var item = svc.GetResource(listItem);
      var scene;
      for (scene in tree.scenes) {
        var node = tree.scenes[scene];
        if (! node.members )  
          continue;
        if (cu.indexOf(sceneds, node.members, item) < 0)
          continue;
        var type = projds.GetTarget(item, typeArc, true);
        type = type.QueryInterface(IRes).Value;
        if (! (type in node.depts))
          node.depts[type] = [];
        var itemDesc = projds.GetTarget(item, descArc, true);
        if (itemDesc)
          itemDesc = itemDesc.QueryInterface(ILit).Value;
        else
          itemDesc = "";
        var itemEntry = {
          title: itemlist.view.getCellText(i, "report-item-title-col"),
          description: itemDesc,
          media: []
        }
        node.depts[type].push(itemEntry);
        // Add media if necessary
        if (usemedia) {
          var media = projds.GetTarget(item, mediaArc, true);
          if (! media)
            continue;
          media = media.QueryInterface(IRes);
          if (! cu.IsSeq(projds, media))
            continue;
          var seq = getRDFContainer();
          seq.Init(projds, media);
          media = seq.GetElements();
          while (media.hasMoreElements()) {
            var image = media.getNext().QueryInterface(IRes);
            if (projds.HasAssertion(image, typeArc, imgRsrc, true)) {
              var path = gProjWin.project.localPath;
              var filename = image.Value.match(/([^\\\/]+)$/)[1];
              path.append(filename);
              var imgName = projds.GetTarget(image, titleArc, true);
              var imgDesc = projds.GetTarget(image, descArc, true);
              if (imgName)
                imgName = imgName.QueryInterface(ILit).Value;
              else
                imgName = filename;
              if (imgDesc)
                imgDesc = imgDesc.QueryInterface(ILit).Value;
              else
                imgDesc = "";
              itemEntry.media.push({ title: imgName, description: imgDesc,
                src: pathToFileURL(path.path) });
            }
          }
        }
      }
    }
  
    // Create the result DOM from the result tree
    var doc = impl.createDocument("", "breakdown", null);
    var root = doc.documentElement;
    root.setAttribute("title", gProjWin.project.title);
    root.setAttribute("date", (new Date()).toLocaleDateString());
    for (var i = 0; i < tree.order.length; ++i) {
      var scene = tree.scenes[tree.order[i]];
      var sceneNode = doc.createElement("scene");
      sceneNode.setAttribute("title", scene.title);
      sceneNode.setAttribute("ordinal", scene.ordinal);
      sceneNode.setAttribute("description", scene.description);
      root.appendChild(sceneNode);
      var dept;
      for (dept in scene.depts) {
        var deptNode = doc.createElement("department");
        deptNode.setAttribute("title", tree.depts[dept]);
        sceneNode.appendChild(deptNode);
        var items = scene.depts[dept];
        for (var j = 0; j < items.length; ++j) {
          var item = items[j];
          var itemNode = doc.createElement("item");
          itemNode.setAttribute("title", item.title);
          itemNode.setAttribute("description", item.description);
          deptNode.appendChild(itemNode);
          for (var k = 0; k < item.media.length; ++k) {
            var media = item.media[k];
            var mediaNode = doc.createElement("image");
            mediaNode.setAttribute("title", media.title);
            mediaNode.setAttribute("description", media.description);
            mediaNode.setAttribute("src", media.src);
            itemNode.appendChild(mediaNode);
          }
        }
      }
    }
  
    // Perform an XSL transformation on the result DOM
    var xslt = document.implementation.createDocument('', '', null);
    xslt.async = false;
    if (this.docview.mediachecked)
      xslt.load(Cx.TRANSFORM_PATH + "breakdown_media.xml");
    else
      xslt.load(Cx.TRANSFORM_PATH + "breakdown.xml");
  
    var proc = new XSLTProcessor();
    proc.importStylesheet(xslt);
    var reportTree = document.getAnonymousElementByAttribute(
      this.docview.navpanel, "anonid", "report-tree");
    if (reportTree.view.selection.currentIndex == 1)
      proc.setParameter(null, "show-description", 1);
    else
      proc.setParameter(null, "show-description", 0);
  
    var report = proc.transformToDocument(doc);
    var reportFile = tempFile(generateID() + ".html");
    if (serializeDOMtoFile(report, reportFile))
      this.docview.editor.webNavigation.loadURI(pathToFileURL(reportFile),
        Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE, null, null, null);
    else
      dump("*** createBreakdown: serializeDOMtoFile failed\n");
  }
};

