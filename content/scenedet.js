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
 * Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

var panel;

function init () {

  panel = new FormPanel();

  panel.formName        = 'scenedet';
  panel.typeURI         = Cx.NS_CX + 'Location';
  panel.nameSet         = top.autotext.headings;
  //  panel.instanceDS      = top.instanceMapper.mapping;
  panel.instanceDS      = top.gProjWin.sceneTreeDS;
  panel.mediaController = top.gProjWin;
  panel.noRecsMsg       = document.getElementById("celtx-bundle").
                            getString("NoScenesFound");

  panel.nameFilter = function (str) {
    if (str == 'INT.' || str == 'EXT.') return null;
    str = str.replace(/\s+[-:]\s*(DAY|NIGHT)/i, '');
    return str;
  };

  panel.sync = function () {
    dump("panel sync disabled\n");
  };

  el('title-label').value = document.getElementById("celtx-bundle").
                              getString("AlternateName");

  panel.init();
}


function destroy () {
  panel.destroy();
}