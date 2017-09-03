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

var dlg =
{
  kProjsDirPrefName: "projectsdirectory"
};

function Loaded()
{
  dlg.categoryBox = document.getElementById("prefs-categories");
  dlg.categoryDeck = document.getElementById("prefs-deck");
  dlg.projsdirTextbox = document.getElementById("prefs-projsdir-textbox");
  try
  {
    var svc = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService);
    dlg.pref = svc.getBranch("celtx.");
    if (! dlg.pref.prefHasUserValue(dlg.kProjsDirPrefName))
      dlg.pref.setCharPref(dlg.kProjsDirPrefName, userDocsDir().path);
    dlg.projsdirTextbox.value = dlg.pref.getCharPref(dlg.kProjsDirPrefName);
  }
  catch (ex)
  {
    dump("*** Loaded: " + ex + "\n");
  }
}

function Accepted()
{
  try
  {
    dlg.pref.setCharPref(dlg.kProjsDirPrefName, dlg.projsdirTextbox.value);
  }
  catch (ex)
  {
    dump("*** Accepted: " + ex + "\n");
  }
  return true;
}

function Canceled()
{
  return true;
}

function SwitchPanel(buttonid)
{
  var button = document.getElementById(buttonid);
  if (! button) return;
  var panelid = button.getAttribute("panel");
  if (! panelid) return;
  var panel = document.getElementById(panelid);
  if (! panel) return;
  dlg.categoryDeck.selectedPanel = panel;
}

function ChooseProjDir()
{
  const kModeGetFolder  = 2;
  const kFilterAll      = 1;
  const kReturnCancel   = 1;
  var fp = getFilePicker();
  fp.init(window, "*** Choose a folder ***", kModeGetFolder)
  fp.appendFilters(kFilterAll);
  if (fp.show() == kReturnCancel)
    return;
  dlg.projsdirTextbox.value = fp.file.path;
}

