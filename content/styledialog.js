
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


const kMinMargin = new Measure(0.5, 'in');

var dialog =
{
  doc: null,
  templates: null,
  styles: [],
  userModel: null,
  lastStyle: null
};

function loaded()
{
  const CI = Components.interfaces;
  const CC = Components.classes;
  const kUserDSSource = 'file://' + currentProfileDir().path
    + '/celtx.d/userstyles.xml';
  const templatesRsrc = RES('http://celtx.com/style/templates');

  if (window.arguments == null || window.arguments.length == 0)
    throw "styledialog.xul requires a DOM document to examine";

  dialog.doc = window.arguments[0];
  dialog.templates = document.getElementById('template-list');

  dialog.styles.push(defaultScriptStyle());

  try
  {
    createDSIfNecessary(kUserDSSource);
    dialog.userModel = new RDFModel(kUserDSSource, RDFModel.LOAD_CREATE);
    styles = dialog.userModel.makeSeq(templatesRsrc).elements();
    for (var i = 0; i < styles.length; i++)
    {
      var style = styleFromRDF(dialog.userModel, styles[i].value);
      style.custom = true;
      dialog.styles.push(style);
    }
  }
  catch (ex)
  {
    dialog.userModel = null;
  }

  rebuildStyleList();
  window.setTimeout('matchSelectionToStyle()', 100);
}

function createListItemFromStyle(style)
{
  var item = document.createElement('listitem');
  var cell1 = document.createElement('listcell');
  var cell2 = document.createElement('listcell');
  cell1.setAttribute('label', style.name);
  if (style.custom)
    // *** LOCALISE ME ***
    cell2.setAttribute('label', 'User Defined');
  else
    // *** LOCALISE ME ***
    cell2.setAttribute('label', 'Built-In');
  item.setAttribute('value', style.uri);
  item.appendChild(cell1);
  item.appendChild(cell2);
  return item;
}

function rebuildStyleList()
{
  var list = dialog.templates;
  var index = list.selectedIndex;

  // Clear out the menu
  // XXX: See bug #236068 - removeItemAt for <listbox> removes wrong item...
  // for a patch if this clears out the list columns and/or headers. My
  // download of the Firefox 1.0.4 didn't incorporate the fix, despite it
  // having been checked in on 2004-08-30.
  while (list.getRowCount() > 0)
    list.removeItemAt(0);

  for (var i = 0; i < dialog.styles.length; i++)
    list.appendChild(createListItemFromStyle(dialog.styles[i]));

  dialog.templates.selectedIndex = index;
  styleChanged();
}

function createDSIfNecessary(dsURI)
{
  if (! dsURI.match(/file:\/\//))
    return;

  const CI = Components.interfaces;
  const CC = Components.classes;

  var rdfsvc = getRDFService();
  var util = getRDFContainerUtils();
  var atomsvc = getAtomService();

  var file = IFile(dsURI);
  if (file.exists())
    return;

  var ds = CC['@mozilla.org/rdf/datasource;1?name=in-memory-datasource'].
    createInstance(CI.nsIRDFDataSource);
  var seq = rdfsvc.GetResource('http://celtx.com/style/templates');
  util.MakeSeq(ds, seq);
  var serializer = CC['@mozilla.org/rdf/xml-serializer;1'].
    createInstance(CI.nsIRDFXMLSerializer);
  serializer.init(ds);
  serializer.addNameSpace(atomsvc.getAtom('cx'), Cx.NS_CX);
  serializer.addNameSpace(atomsvc.getAtom('rdf'), Cx.NS_RDF);
  serializer.addNameSpace(atomsvc.getAtom('dc'), Cx.NS_DC);
  serializer = serializer.QueryInterface(CI.nsIRDFXMLSource);
  var os = CC['@mozilla.org/network/file-output-stream;1'].
    createInstance(CI.nsIFileOutputStream);
  // RDWR | CREAT, -rw-r--r--
  os.init(file, 0x04 | 0x08, 0644, 0);
  serializer.Serialize(os);
  os.close();
}

function matchSelectionToStyle()
{
  const CI = Components.interfaces;
  var style = getDOMStyle(dialog.doc);
  if (!style)
  {
    dialog.templates.selectedIndex = 0;
    styleChanged();
    return;
  }

  // Check default styles
  for (var i = 0; i < dialog.styles.length; i++)
  {
    var cmpStyle = dialog.styles[i];
    if (style.equals(cmpStyle))
    {
      dialog.templates.selectedIndex = i;
      styleChanged();
      return;
    }
  }

  // Consider it a new style
  addStyle(style);
}

function updateBroadcasters()
{
  var selectedBC  = document.getElementById('format-selected');
  var editableBC  = document.getElementById('format-editable');

  var index = dialog.templates.selectedIndex;
  if (index < 0)
  {
    selectedBC.setAttribute('disabled', true);
    editableBC.setAttribute('disabled', true);
  }
  else
  {
    selectedBC.setAttribute('disabled', false);
    if (dialog.styles[index].custom)
      editableBC.setAttribute('disabled', false);
    else
      editableBC.setAttribute('disabled', true);
  }
}

function saveUserStyle(style)
{
  try { styleToRDF(dialog.userModel, style); }
  catch (ex) { dump("*** saveUserStyle: " + ex + "\n"); }
}

function styleChanged()
{
  updateBroadcasters();

  // kMarginNames is defined in scriptstyle.js
  if (dialog.lastStyle && dialog.lastStyle.custom)
  {
    for (var i = 0; i < kMarginNames.length; i++)
    {
      var name = kMarginNames[i];
      textBoxL  = document.getElementById(name + 'MarginLeft');
      textBoxR  = document.getElementById(name + 'MarginRight');
      dialog.lastStyle.leftMargins[name]  = parseMeasure(textBoxL.value);
      dialog.lastStyle.rightMargins[name] = parseMeasure(textBoxR.value);
    }
    saveUserStyle(dialog.lastStyle);
  }

  var index = dialog.templates.selectedIndex;
  if (index < 0)
    return;

  var style = dialog.styles[index];

  for (var i = 0; i < kMarginNames.length; i++)
  {
    var name = kMarginNames[i];
    textBoxL  = document.getElementById(name + 'MarginLeft');
    textBoxR  = document.getElementById(name + 'MarginRight');
    textBoxL.value  = style.leftMargins[name].toString();
    textBoxR.value  = style.rightMargins[name].toString();
  }

  dialog.lastStyle = style;
}

function createNewStyle()
{
  if (! dialog.userModel)
    throw "*** createNewStyle: dialog.userModel is undefined\n";

  var style = new ScriptStyle();
  // *** LOCALISE ME ***
  style.name = window.prompt('What would you like to call this template?');
  if (!style.name)
    return;
  addStyle(style);
}

function renameStyle()
{
  var style = dialog.styles[dialog.templates.selectedIndex];
  if (!style.custom)
    throw "renameStyle: Cannot rename a built-in style";
  // *** LOCALISE ME ***
  var name = window.prompt('What would you like to call this template?',
    style.name);
  if (!name)
    return;
  style.name = name;
  saveUserStyle(style);
  rebuildStyleList();
}

function deleteStyle()
{
  var index = dialog.templates.selectedIndex;
  var style = dialog.styles[index];
  if (!style.custom)
    throw "*** deleteStyle: Attempting to delete built-in style\n";

  // Remove from the listbox (and select the next, or the last if nothing next)
  dialog.templates.removeItemAt(index);
  if (dialog.templates.getRowCount() == index)
    dialog.templates.selectedIndex = index - 1;
  else
    dialog.templates.selectedIndex = index;

  updateBroadcasters();

  // Remove from the cache
  dialog.styles.splice(index, 1);

  // Remove from the RDF model
  try
  {
    var templatesRsrc = RES('http://celtx.com/style/templates');
    var seq = dialog.userModel.makeSeq(templatesRsrc);
    // XXX: No remove function in RDFSequence?
    var cont = getRDFContainer();
    cont.Init(seq.ds, seq.res);
    cont.RemoveElementAt(seq.indexOf(RES(style.uri)), true);
  }
  catch (ex)
  {
    dump("*** deleteStyle: " + ex + "\n");
  }

  styleChanged();
}

function addStyle(style)
{
  // Add to the RDF model
  try
  {
    // Create as an anonymous node
    var styleURI = styleToRDF(dialog.userModel, style);
    var templatesRsrc = RES('http://celtx.com/style/templates');
    var seq = dialog.userModel.makeSeq(templatesRsrc);
    seq.append(RES(styleURI));
  }
  catch (ex)
  {
    dump("*** addStyle: " + ex + "\n");
  }

  // Add to the cache
  style.custom = true;
  dialog.styles.push(style);

  // Add to the listbox (and select it)
  dialog.templates.appendChild(createListItemFromStyle(style));
  dialog.templates.selectedIndex = dialog.templates.getRowCount() - 1;
  styleChanged();
}

function validate()
{
  for (var i = 0; i < kMarginNames.length; i++)
  {
    var name = kMarginNames[i];
    var textBoxL  = document.getElementById(name + 'MarginLeft');
    var textBoxR  = document.getElementById(name + 'MarginRight');
    var valueL    = parseMeasure(textBoxL.value);
    var valueR    = parseMeasure(textBoxR.value);
    if (!valueL || valueL.toMillimeters() < kMinMargin.toMillimeters())
      textBoxL.value = kMinMargin.toString();
    if (!valueR || valueR.toMillimeters() < kMinMargin.toMillimeters())
      textBoxR.value = kMinMargin.toString();
  }
}

function accepted()
{
  styleChanged();
  setDOMStyle(dialog.doc, dialog.lastStyle);
  if (dialog.userModel)
    dialog.userModel.save();
  return true;
}

function canceled()
{
  if (dialog.userModel)
    dialog.userModel.save();
  return true;
}

