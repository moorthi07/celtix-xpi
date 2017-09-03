
function ScriptToDatasource(doc)
{
  const IRes = Components.interfaces.nsIRDFResource;
  const ILit = Components.interfaces.nsIRDFLiteral;
  const IHTMLDoc = Components.interfaces.nsIDOMHTMLDocument;
  const IHTMLElem = Components.interfaces.nsIDOMHTMLElement;
  const IHTMLPElem = Components.interfaces.nsIDOMHTMLParagraphElement;

  var svc = getRDFService();
  var cu = getRDFContainerUtils();
  var ds = getInMemoryDatasource();

  var typeArc = svc.GetResource(Cx.NS_RDF + "type");
  var titleArc = svc.GetResource(Cx.NS_DC + "title");
  var descArc = svc.GetResource(Cx.NS_DC + "description");
  var ordArc = svc.GetResource(Cx.NS_CX + "ordinal");
  var membersArc = svc.GetResource(Cx.NS_CX + "members");

  var sceneType = svc.GetResource(Cx.NS_CX + "Scene");

  var scenes = svc.GetResource("urn:celtx:scenes");
  scenes = cu.MakeSeq(ds, scenes);
  // Create the bogus "ALL" scene
  var allScene = svc.GetResource("urn:celtx:scene:all");
  ds.Assert(allScene, typeArc, sceneType, true);
  ds.Assert(allScene, ordArc, svc.GetIntLiteral(0), true);
  ds.Assert(allScene, titleArc, svc.GetLiteral("ALL"), true);
  scenes.AppendElement(allScene);
  var sceneRsrc = null;
  var membersRsrc = null; // Refers to the scene's cx:members sequence
  var sceneCount = 0;

  var doc = doc.QueryInterface(IHTMLDoc);
  var paras = doc.body.childNodes;
  var seen = {};
  for (var i = 0; i < paras.length; ++i)
  {
    var para = paras[i];
    try { para = para.QueryInterface(IHTMLPElem); }
    catch (ex) { continue; }
    if (para.className == "sceneheading")
    {
      sceneRsrc = svc.GetResource(gProjWin.project.sceneURIPrefix + para.id);
      scenes.AppendElement(sceneRsrc);

      ds.Assert(sceneRsrc, typeArc, sceneType, true);
      var ordLit = svc.GetIntLiteral(++sceneCount);
      ds.Assert(sceneRsrc, ordArc, ordLit, true);
      var titleLit = svc.GetLiteral(stringify(para));
      ds.Assert(sceneRsrc, titleArc, titleLit, true);

      var desc = gProjWin.project.model.target(RES(sceneRsrc.Value),
                                               RES(Cx.NS_DC + 'description'));
      if (desc) {
        ds.Assert(sceneRsrc, descArc, svc.GetLiteral(desc.value), true);
      }

      membersRsrc = svc.GetAnonymousResource();
      ds.Assert(sceneRsrc, membersArc, membersRsrc, true);
      membersRsrc = cu.MakeSeq(ds, membersRsrc);
      seen = {};
    }

    // Can't assert membership without a valid context
    if (! sceneRsrc)
      continue;

    var spans = para.getElementsByTagName("span");
    for (var j = 0; j < spans.length; ++j)
    {
      var span = spans[j].QueryInterface(IHTMLElem);
      if (span.hasAttribute('ref')) {
        var ref = span.getAttribute('ref');
        if (! seen[ref]) {
          membersRsrc.AppendElement(svc.GetResource(ref));
          seen[ref] = 1;
        }
        if (span.className == 'cast') {
          var charName = stringify(span).toUpperCase();
          charName = charName.replace(/\s*\(.*\)/, '');
          _resolveExplicitMap[charName] = ref;
        }
      }
    }

    if (para.className == 'character') {
      var uri = resolveCharacterElem(para);
      if (uri && ! seen[uri]) {
        membersRsrc.AppendElement(svc.GetResource(uri));
        seen[uri] = 1;
      }
    }

  }

  return ds;
}


var _resolveMap = {};
var _resolveExplicitMap = {};

function resolveCharacterElem (elem) {
  var str = stringify(elem).toUpperCase();
  str = str.replace(/\s*\(.*\)/, '');   // Trim parenthesized chunks
  if (str == '') return;

  // Check the map
  if (_resolveMap[str]) return _resolveMap[str];

  // Not in the map, grovel through the model
  var nameProp  = RES(Cx.NS_CX  + 'scriptName');
  var titleProp = RES(Cx.NS_DC  + 'title');
  var typeProp  = RES(Cx.NS_RDF + 'type');
  var classURI  = Cx.NS_CX  + 'Cast';
  var classRes  = RES(classURI);
  var name      = LIT(str);

  var model = gProjWin.project.model;
  var res = model.source(nameProp, name);

  if (! res) {
    // Try to locate via title
    var matches = model.sources(titleProp, name);
    for (var j = 0; j < matches.length; j++) {
      // Make sure we have the right type
      if (model.contains(matches[j], typeProp, classRes)) {
        // dump("    found via title - adding scriptName\n");
        res = matches[j];
        model.add(res, nameProp, name);
        break;
      }
    }
  }

  if (! res && _resolveExplicitMap[str]) {
    // dump("  found via explicit markup - adding scriptName\n");
    res = RES(_resolveExplicitMap[str]);
    model.add(res, nameProp, name);
  }

  if (! res) {
    // Add them in ourselves
    // dump("  not found - creating character\n");
    var uri = gProjWin.project.add({ type: classURI, title: str });
    res = RES(uri);
    model.add(res, nameProp, name);
  }

  if (res) {
    _resolveMap[str] = res.value;
    return res.value;
  }
}
