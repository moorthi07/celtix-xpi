
var bd_win =
{
  initialized: false,
  kScenesURL: "http://celtx.com/selection/scenes",
  kDeptsURL: "http://celtx.com/selection/departments",
  kItemsURL: "http://celtx.com/selection/items",

  project: null,
  sceneds: null,
  selections: null,
  reportframe: null,
  listbox: null,
};

function BD_Destroy()
{
  try {
    bd_win.listbox.scene.database.RemoveDataSource(bd_win.sceneds);
  
    bd_win.listbox.dept.database.RemoveDataSource(bd_win.project.model.ds);
  
    bd_win.listbox.item.database.RemoveDataSource(bd_win.sceneds);
    bd_win.listbox.item.database.RemoveDataSource(bd_win.project.model.ds);
    bd_win.listbox.item.database.RemoveDataSource(bd_win.selections);
  
    bd_win.listbox.media.database.RemoveDataSource(bd_win.project.model.ds);
    bd_win.listbox.media.database.RemoveDataSource(bd_win.selections);

    bd_win.project = null;
    bd_win.sceneds = null;
    bd_win.selections = null;
    bd_win.reportframe.loadURI("about:blank", null, null);
    bd_win.listbox.scene.selectedIndex = -1;

    bd_win.initialized = false;
  }
  catch (ex) {
    dump("*** BD_Destroy: " + ex + "\n");
  }
}

function BD_RefreshScript() {
  var sceneds = ScriptToDatasource(app.editor.editorElement.contentDocument);

  bd_win.listbox.scene.database.RemoveDataSource(bd_win.sceneds);
  bd_win.listbox.scene.database.AddDataSource(sceneds);

  bd_win.listbox.item.database.RemoveDataSource(bd_win.sceneds);
  bd_win.listbox.item.database.AddDataSource(sceneds);

  bd_win.sceneds = sceneds;
}

function BD_Init()
{
  if (bd_win.initialized)
    return;
  try
  {
    bd_win.project = app.project;
    bd_win.sceneds = ScriptToDatasource(
      app.editor.editorElement.contentDocument);
    bd_win.listbox =
    {
      scene: document.getElementById("scene-listbox"),
      dept: document.getElementById("dept-listbox"),
      item: document.getElementById("item-listbox"),
      media: document.getElementById("media-listbox")
    };
    bd_win.checkbox =
    {
      media: document.getElementById("media-checkbox")
    };
    bd_win.reportframe = document.getElementById("reportframe");

    // Set the window title
    // setWindowTitle(bd_win.project.title + " - " + getWindowTitle());

    // Initialize the datasources
    var svc = getRDFService();
    var utils = getRDFContainerUtils();

    // Selections (intermediate datasources)
    bd_win.selections = getInMemoryDatasource();
    var sceneSeq = svc.GetResource(bd_win.kScenesURL);
    bd_win.scenes = utils.MakeSeq(bd_win.selections, sceneSeq);
    // bd_win.depts is not a sequence; it uses cx:member instead
    bd_win.depts = svc.GetResource(bd_win.kDeptsURL);
    var itemSeq = svc.GetResource(bd_win.kItemsURL);
    bd_win.items = utils.MakeSeq(bd_win.selections, itemSeq);

    // Scenes
    bd_win.listbox.scene.database.allowNegativeAssertions = false;
    bd_win.listbox.scene.database.AddDataSource(bd_win.sceneds);
    bd_win.listbox.scene.builder.rebuild();

    // Departments
    bd_win.listbox.dept.database.allowNegativeAssertions = false;
    bd_win.listbox.dept.database.AddDataSource(bd_win.project.model.ds);
    bd_win.listbox.dept.ref = bd_win.project.markupURL;
    // bd_win.listbox.dept.builder.rebuild();

    // Items
    bd_win.listbox.item.database.allowNegativeAssertions = false;
    bd_win.listbox.item.database.AddDataSource(bd_win.sceneds);
    bd_win.listbox.item.database.AddDataSource(bd_win.project.model.ds);
    bd_win.listbox.item.database.AddDataSource(bd_win.selections);

    // Media
    bd_win.listbox.media.database.allowNegativeAssertions = false;
    bd_win.listbox.media.database.AddDataSource(bd_win.project.model.ds);
    bd_win.listbox.media.database.AddDataSource(bd_win.selections);

    // Populate based on defaults
    BD_DeptSelectionChanged();
    window.setTimeout("bd_win.listbox.scene.selectedIndex = 0", 100);
    bd_win.initialized = true;
  }
  catch (ex)
  {
    dump("*** Loaded: " + ex + "\n");
  }
}

function BD_SceneSelectionChanged()
{
  var svc = getRDFService();
  // Clear the initial selection list
  while (bd_win.scenes.GetCount() > 0)
    bd_win.scenes.RemoveElementAt(bd_win.scenes.GetCount(), true);
  // Repopulate it, checking for the "ALL" special case
  if (bd_win.listbox.scene.getItemAtIndex(0).selected)
  {
    // If ALL is selected, make it the only selection
    bd_win.listbox.scene.selectedIndex = 0;
    for (var i = 1; i < bd_win.listbox.scene.getRowCount(); ++i)
    {
      var item = bd_win.listbox.scene.getItemAtIndex(i);
      var res = svc.GetResource(item.value);
      bd_win.scenes.AppendElement(res);
    }
  }
  else
  {
    for (var i = 0; i < bd_win.listbox.scene.selectedCount; ++i)
    {
      var item = bd_win.listbox.scene.getSelectedItem(i);
      var res = svc.GetResource(item.value);
      bd_win.scenes.AppendElement(res);
    }
  }
  bd_win.listbox.item.builder.rebuild();
  BD_ItemSelectionChanged();
}

// Major XUL template issue:
// 1. The <member> tag is an iterator and cannot be used as a test instead.
// 2. The <triple> and <binding> tags cannot use variables for predicate.
// 3. There is no universal predicate to test for containment by an RDF
//    container, only the rdf:_# predicates.
// Hence there is no way to create a template condition for checking if a
// resource is contained by a container.
function BD_DeptSelectionChanged()
{
  var svc = getRDFService();
  var member = svc.GetResource(Cx.NS_CX + "member");
  // Check membership assertions, checking for the "ALL" special case
  if (bd_win.listbox.dept.getItemAtIndex(0).selected)
  {
    // If ALL is selected, make it the only selection
    bd_win.listbox.dept.selectedIndex = 0;
    for (var i = 1; i < bd_win.listbox.dept.getRowCount(); ++i)
    {
      var item = bd_win.listbox.dept.getItemAtIndex(i);
      var res = svc.GetResource(item.value);
      if (! bd_win.selections.HasAssertion(bd_win.depts, member, res, true))
        bd_win.selections.Assert(bd_win.depts, member, res, true);
    }
  }
  else
  {
    for (var i = 1; i < bd_win.listbox.dept.getRowCount(); ++i)
    {
      var item = bd_win.listbox.dept.getItemAtIndex(i);
      var res = svc.GetResource(item.value);
      if (item.selected)
      {
        if (! bd_win.selections.HasAssertion(bd_win.depts, member, res, true))
          bd_win.selections.Assert(bd_win.depts, member, res, true);
      }
      else
      {
        if (bd_win.selections.HasAssertion(bd_win.depts, member, res, true))
          bd_win.selections.Unassert(bd_win.depts, member, res);
      }
    }
  }
  bd_win.listbox.item.builder.rebuild();
  BD_ItemSelectionChanged();
}

function BD_ItemSelectionChanged()
{
  var svc = getRDFService();
  // Clear the initial selection list
  while (bd_win.items.GetCount() > 0)
    bd_win.items.RemoveElementAt(bd_win.items.GetCount(), true);
  // Repopulate it, counting no selection as "ALL"
  if (bd_win.listbox.item.selectedCount == 0)
  {
    for (var i = 0; i < bd_win.listbox.item.getRowCount(); ++i)
    {
      var item = bd_win.listbox.item.getItemAtIndex(i);
      var res = svc.GetResource(item.value);
      bd_win.items.AppendElement(res);
    }
  }
  else
  {
    for (var i = 0; i < bd_win.listbox.item.selectedCount; ++i)
    {
      var item = bd_win.listbox.item.getSelectedItem(i);
      var res = svc.GetResource(item.value);
      bd_win.items.AppendElement(res);
    }
  }
  bd_win.listbox.media.builder.rebuild();
  try
  {
    BD_CreateBreakdown();
  }
  catch (ex)
  {
    dump("*** BD_CreateBreakdown3: " + ex + "\n");
  }
}

function BD_MediaCheckboxChanged()
{
  try
  {
    BD_CreateBreakdown();
  }
  catch (ex)
  {
    dump("*** BD_CreateBreakdown: " + ex + "\n");
  }
}

function BD_CreateBreakdown()
{
  if (bd_win.scenes.GetCount() == 0)
    return;

  const IRes = Components.interfaces.nsIRDFResource;
  const ILit = Components.interfaces.nsIRDFLiteral;
  const IInt = Components.interfaces.nsIRDFInt;

  var svc = getRDFService();
  var cu = getRDFContainerUtils();
  var sceneds = bd_win.sceneds;
  var projds = bd_win.project.model.ds;
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
  var scenes = bd_win.scenes.GetElements();
  while (scenes.hasMoreElements())
  {
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
    tree.scenes[scene.Value] =
    {
      ordinal: sceneOrdinal,
      title: sceneTitle,
      description: sceneDesc,
      members: members,
      depts: {}
    };
    tree.order.push(scene.Value);
  }
  // Cache the department titles
  var depts = bd_win.selections.GetTargets(bd_win.depts, memberArc, true);
  while (depts.hasMoreElements())
  {
    var dept = depts.getNext().QueryInterface(IRes);
    var deptTitle = schema.GetTarget(dept, labelArc, true);
    tree.depts[dept.Value] = deptTitle.QueryInterface(ILit).Value;
  }
  // Place the items in the tree
  for (var i = 0; i < bd_win.listbox.item.getRowCount(); ++i)
  {
    var listItem = bd_win.listbox.item.getItemAtIndex(i);
    var item = svc.GetResource(listItem.value);
    var scene;
    for (scene in tree.scenes)
    {
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
      var itemEntry =
      {
        title: listItem.label,
        description: itemDesc,
        media: []
      }
      node.depts[type].push(itemEntry);
      // Add media if necessary
      if (bd_win.checkbox.media.checked) {
        var media = projds.GetTarget(item, mediaArc, true);
        if (! media)
          continue;
        media = media.QueryInterface(IRes);
        if (! cu.IsSeq(projds, media))
          continue;
        var seq = getRDFContainer();
        seq.Init(projds, media);
        media = seq.GetElements();
        while (media.hasMoreElements())
        {
          var image = media.getNext().QueryInterface(IRes);
          if (projds.HasAssertion(image, typeArc, imgRsrc, true))
          {
            var path = bd_win.project.localPath.clone();
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
  root.setAttribute("title", bd_win.project.title);
  root.setAttribute("date", (new Date()).toLocaleDateString());
  for (var i = 0; i < tree.order.length; ++i)
  {
    var scene = tree.scenes[tree.order[i]];
    var sceneNode = doc.createElement("scene");
    sceneNode.setAttribute("title", scene.title);
    sceneNode.setAttribute("ordinal", scene.ordinal);
    sceneNode.setAttribute("description", scene.description);
    root.appendChild(sceneNode);
    var dept;
    for (dept in scene.depts)
    {
      var deptNode = doc.createElement("department");
      deptNode.setAttribute("title", tree.depts[dept]);
      sceneNode.appendChild(deptNode);
      var items = scene.depts[dept];
      for (var j = 0; j < items.length; ++j)
      {
        var item = items[j];
        var itemNode = doc.createElement("item");
        itemNode.setAttribute("title", item.title);
        itemNode.setAttribute("description", item.description);
        deptNode.appendChild(itemNode);
        for (var k = 0; k < item.media.length; ++k)
        {
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
  if (bd_win.checkbox.media.checked)
    xslt.load(Cx.TRANSFORM_PATH + "breakdown_media.xml");
  else
    xslt.load(Cx.TRANSFORM_PATH + "breakdown.xml");

  var proc = new XSLTProcessor();
  proc.importStylesheet(xslt);

  var report = proc.transformToDocument(doc);
  var reportFile = tempFile(generateID() + ".html");
  if (serializeDOMtoFile(report, reportFile))
    bd_win.reportframe.webNavigation.loadURI(pathToFileURL(reportFile),
      Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE, null, null, null);
  else
    dump("*** BD_CreateBreakdown: serializeDOMtoFile failed\n");
}

