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

var dialog = {};


function loaded () {
  dialog.pm    = window.arguments[0];
  dialog.proj  = window.arguments[1];

  dialog.sb = document.getElementById('celtx-bundle');
  dialog.dsb = document.getElementById('dialog-bundle');
  dialog.selectedBC = document.getElementById('project-selected');

  dialog.tree = document.getElementById('projects-tree');
  dialog.accept = document.documentElement.getButton('accept');
  dialog.accept.disabled = true;
  dialog.accept.label = dialog.sb.getString('Open');
  dialog.cancel = document.documentElement.getButton('cancel');
  dialog.cancel.label = dialog.dsb.getString('button-cancel');

  try {
    dialog.tree.database.AddDataSource(
      new DateTransformerDS(dialog.pm.model.ds));
    dialog.tree.builder.rebuild();
  }
  catch (ex) {
    dump("error loading: " + ex + "\n");
  }

  dialog.tree.focus();

  // Unused
  // window.setTimeout("markMissingProjects()", 100);
}


function markMissingProjects () {
  dump("--- markMissingProjects\n");
  var missingArc = new RDFResource(Cx.NS_CX + "missing");
  var trueLit = new RDFLiteral("true");
  var count = dialog.tree.view.rowCount;
  dialog.tree.database.beginUpdateBatch();
  for (var i = 0; i < count; ++i) {
    var id = dialog.tree.view.getResourceAtIndex(i).Value;
    var proj = dialog.pm.project(id);
    var projdir = proj.localPath;
    if (! (projdir.exists() && projdir.isDirectory())) {
      if (! dialog.pm.model.contains(proj.res, missingArc, trueLit))
        dialog.pm.model.add(proj.res, missingArc, trueLit);
    }
    else {
      if (dialog.pm.model.contains(proj.res, missingArc, trueLit))
        dialog.pm.model.remove(proj.res, missingArc, trueLit);
    }
  }
  dialog.tree.database.endUpdateBatch();
}


function selected () {
  var i = dialog.tree.currentIndex;
  if (i < 0) {
    dialog.selectedBC.setAttribute('disabled', true);
    dialog.accept.disabled = true;
  }
  else {
    dialog.selectedBC.removeAttribute('disabled');
    dialog.accept.disabled = false;
  }
}


function doubleClicked () {
  if (dialog.tree.currentIndex >= 0)
    document.documentElement.acceptDialog();
}


function deleteProject () {
  var i = dialog.tree.currentIndex;
  if (i == -1) return;
  if (! window.confirm(dialog.sb.getString("ConfirmDeleteProject")))
    return;
  var id = dialog.tree.view.getResourceAtIndex(i).Value;
  try {
    dialog.pm.deleteProject(id);
    dialog.accept.disabled = true;
    dialog.selectedBC.setAttribute('disabled', true);
    dialog.tree.builder.rebuild();
  }
  catch (ex) {
    dump("deleteProject: " + ex + "\n");
  }
}


function browseForProject () {
  var fp = getFilePicker();
  const kReturnCancel = 1;
  const kGetFolder = 2;
  fp.init(window, dialog.sb.getString("Open"), kGetFolder);
  try {
    var svc = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    var dir = svc.getCharPref("celtx.projectsdirectory");
    if (dir) {
      dir = IFile(dir);
      if (dir.exists() && dir.isDirectory())
        fp.displayDirectory = dir;
    }
  }
  catch (ex) {
    dump("*** browseForProject: " + ex + "\n");
  }
  if (fp.show() == kReturnCancel)
    return false;
  var dir = fp.file;
  if (!dir.exists()) {
    alert(dialog.sb.getString("ProjectNoLongerExists"));
    return false;
  }
  if (!dir.isDirectory()) {
    alert(dialog.sb.getString("NotAValidProject"));
    return false;
  }
  else {
    var rdfFile = dir.clone();
    rdfFile.append(Cx.PROJECT_FILE);
    if (!(rdfFile.exists() && rdfFile.isFile())) {
      alert(dialog.sb.getString("NotAValidProject"));
      return false;
    }
  }
  try {
    var uri = dialog.pm.addExternalProject(dir);
    dialog.proj.uri = uri;
    dialog.proj.canceled = false;
    return true;
  }
  catch (ex) {
    dump("*** browseForProject: " + ex + "\n");
    alert(dialog.sb.getString("UnableToAddProject"));
    return false;
  }
}


function accepted () {
  var i = dialog.tree.currentIndex;
  if (i != -1) {
    var id = dialog.tree.view.getResourceAtIndex(i).Value;
    var proj = dialog.pm.project(id);
    var projdir = proj.localPath;
    if (! (projdir.exists() && projdir.isDirectory()))
      return browseForProject();

    dialog.proj.uri = id;
    dialog.proj.canceled = false;
    return true;
  }
}


function canceled () {
  dialog.proj.canceled = true;
  return true;
}

