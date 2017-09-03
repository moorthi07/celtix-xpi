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

function FormPanel () {
  this.frame = null;
  this.deck = null;
  this.media = null;
  this.label = null;
  this.title = null;
  this.desc = null;
  this.project = null;
  this.navPanel = null;
  this.currentItem = null;
  this.typeURI = null;
  this.formName = null;
  this.nameSet = null;
  this.instanceDS = null;
  this.mediaController = null;
  this.noRecsMsg = null;
  this.nameFilter = null;
  this.changedFields = {};
}


FormPanel.prototype.init = function () {
  this.frame = el('frame');
  this.deck  = el('deck');
  this.label = el('label');
  this.title = el('title');
  this.desc  = el('desc');
  this.media = el('panel-media-view');

  this.delMediaCmd = el('cmd-remove-media');

  this.mediaDragObserver = new FormPanelDragObserver(this);

  // I changed panel-loaded to panelloaded because I was getting
  // debug messages about non-alphabetic event names.
  this.fireEvent('panelloaded');
};


FormPanel.prototype.destroy = function () { };


FormPanel.prototype.fireEvent = function (name) {
  var e = document.createEvent('Events');
  e.initEvent(name, false, true);
  window.document.documentElement.dispatchEvent(e);
};


FormPanel.prototype.attach = function (project, navPanel) {
  this.project = project;
  this.navPanel = navPanel;

  this.frame.setAttribute('src', project.formURL(this.formName));
  setTimeout(this.checkLoad, 100, this);
};


FormPanel.prototype.checkLoad = function (self) {
  if (self.frame.docShell.busyFlags) {
    setTimeout(self.checkLoad, 100, self);
  }
  else {
    self.ready();
  }
};


FormPanel.prototype.ready = function () {
  try {
    this.resizeFrame();
    this.findProperties();
    this.sync();
  }
  catch (ex) {
    dump(ex);
  }

  var list = this.navPanel.list;
  list.database.AddDataSource(this.instanceDS);
  var formClass = document.documentElement.getAttribute('class');
  // XXX HACK
  if (formClass != 'scenedet-page') {
    list.database.AddDataSource(this.project.model.ds);
  }
  list.builder.rebuild();

  this.media.database.AddDataSource(this.project.model.ds);
  this.media.builder.rebuild();

  var self = this;
  this.navPanel.onSelect = function () { self.update() };

  this.checkSelect();
};


FormPanel.prototype.checkSelect = function () {
  var list = this.navPanel.list;
  if (list.selectedIndex != -1) return;

  if (list.getRowCount()) {
    // Select the first item
    list.selectedIndex = 0;
  }
  else {
    var msg = el('msg');
    msg.value = this.noRecsMsg;
  }
};


FormPanel.prototype.focused = function () {
  this.sync();
  this.checkSelect();
};


FormPanel.prototype.update = function () {
  this.forceSave();

  var item = this.navPanel.list.selectedItem;
  if (item) {
    if (this.deck.selectedIndex == 0) this.deck.selectedIndex = 1;
    this.label.value = item.hasAttribute('title') ? item.getAttribute('title')
                                                  : item.label;

    try {
      var rec = this.fetch(item.id, this.props);
      this.title.value = rec[Cx.NS_DC + 'title'];
      this.desc.value  = rec[Cx.NS_DC + 'description'];
      this.media.ref = item.id;

      this.currentItem = { rec: rec, uri: item.id };
      this.fillInForm();
    }
    catch (ex) {
      dump(ex);
    }
  }
  else {
    var msg = el('msg');
    msg.value = this.noRecsMsg;
    this.deck.selectedIndex = 0;
    this.label.value = '';
    this.title.value = '';
    this.desc.value = '';
    this.media.ref = null;
    this.currentItem = null;
  }

  this.delMediaCmd.setAttribute('disabled', true);
};


FormPanel.prototype.forceSave = function () {
  if (! this.currentItem) return;

  if (this.title.modified) this.title.fieldChange();
  if (this.desc.modified) this.desc.fieldChange();

  for (var e in this.changedFields) {
    this.form[e].blur();
  }
  this.changedFields = {};
};


FormPanel.prototype.fetch = function (uri, props) {
  var rec = {};
  var res = RES(uri);
  var e, i, p, targets;
          
  for (e in props) {
    p = props[e];
    rec[p] = [];
    targets = this.project.model.targets(res, RES(p));
    for (i = 0; i < targets.length; i++) {
      rec[p].push(targets[i].value);
    }
  }
          
  return rec;
};


FormPanel.prototype.findProperties = function () {
    this.props = [ 'http://purl.org/dc/elements/1.1/title',
                   'http://purl.org/dc/elements/1.1/description' ];
    this.propMap = {};
    this.nameMap = {};

    try {
      var doc = this.frame.contentDocument;
      if (doc.forms.length == 0) return;

      var form = doc.forms[0];
      form.setAttribute('onsubmit', 'return false;');
      form.removeAttribute('action');

      var self = this;
      function _change (evt) { self.formChanged(evt) };
      function _input  (evt) { self.formInput(evt)   };

      form.addEventListener('change', _change, true);
      form.addEventListener('input',  _input,  true);
      this.form = form;

      for (var i = 0; i < form.elements.length; i++) {
        var elem = form.elements[i];
        if (! elem.name) continue;
        var prop = this.project.customPropertyURI(this.formName, elem.name);
        if (! this.propMap[prop]) {
          this.propMap[prop] = { name: elem.name, type: elem.type };
          this.nameMap[elem.name] = prop;
          this.props.push(prop);
        }
      }

    }
    catch (ex) {
      dump("findProperties: " + ex + "\n");
    }
};


FormPanel.prototype.fillInForm = function () {
  var rec = this.currentItem.rec;

  for (var p in this.propMap) {
    var elem = this.form.elements[this.propMap[p].name];
    var type = this.propMap[p].type;
    var i, val, vals;

    if (type == 'text' || type == 'textarea') {
      elem.value = rec[p].length ? rec[p][0] : '';
    }
    else if (type == 'radio') {
      val = rec[p].length ? rec[p][0] : '';
      for (i = 0; i < elem.length; i++) {
        elem[i].checked = elem[i].value == val;
      }
    }
    else if (type == 'checkbox') {
      if (elem.length) {
        vals = this.arrayToSet(rec[p]);
        for (i = 0; i < elem.length; i++) {
          elem[i].checked = vals[elem[i].value] == 1;
        }
      }
      else {
        val = rec[p].length ? rec[p][0] : '';
        elem.checked = elem.value == val;
      }
    }
    else if (type == 'select-one' || type == 'select-multiple') {
      vals = this.arrayToSet(rec[p]);
      for (i = 0; i < elem.options.length; i++) {
        elem.options[i].selected = vals[elem.options[i].value] == 1;
      }
    }
  }

};


FormPanel.prototype.titleChanged = function () {
  this.project.updateResource({ uri: this.currentItem.uri,
                                title: this.title.value });
};


FormPanel.prototype.descChanged = function () {
  this.project.updateResource({ uri: this.currentItem.uri,
                                desc: this.desc.value });
};


FormPanel.prototype.formChanged = function (evt) {
  var elem = evt.target;
  var prop = this.nameMap[elem.name];
  dump("changed: " + elem.name + " (" + prop + ")\n");
  var uri = this.currentItem.uri;
  var custom = {};
  custom[prop] = this.getFormValues(prop);
  
  this.project.updateResource({ uri: uri, custom: custom });
  delete this.changedFields[elem.name];
};


FormPanel.prototype.formInput = function (evt) {
  var elem = evt.target;
  this.changedFields[elem.name] = 1;
};


FormPanel.prototype.getFormValues = function (prop) {
  var elem = this.form[this.propMap[prop].name];
  var type = this.propMap[prop].type;
  var i;

  var values = [];
  if (type == 'text' || type == 'textarea') {
    if (elem.value != '') values.push(elem.value);
  }
  else if (type == 'radio') {
    for (i = 0; i < elem.length; i++) {
      if (elem[i].checked) values.push(elem[i].value);
    }
  }
  else if (type == 'checkbox') {
    if (elem.length) {
      for (i = 0; i < elem.length; i++) {
        if (elem[i].checked) values.push(elem[i].value);
      }
    }
    else {
      if (elem.checked) values.push(elem.value);
    }
  }
  else if (type == 'select-one' || type == 'select-multiple') {
    for (i = 0; i < elem.options.length; i++) {
      if (elem.options[i].selected) values.push(elem.options[i].value);
    }
  }

  return values;
};


FormPanel.prototype.sync = function () {
  var model  = this.project.model;
  var editor = top.getScriptEditor();

  var nameProp  = RES(Cx.NS_CX  + 'scriptName');
  var res, uri, name;

  var cast = editor.findCastRefs();
  for (var e in cast) {
    dump("sync: processing " + e + "\n");
    name = LIT(e);
    res = model.source(nameProp, name);
    if (res) {
      // TODO: check that cast[e] ref matches res?
      dump("  --> found scriptName\n");
      continue;
    }

    // No scriptName for this cast
    uri = cast[e];
    if (! uri) {
      dump("  --> not found, creating\n");
      uri = this.project.add({ type: this.typeURI, title: e });
    }

    // Add scriptName
    dump("  --> adding scriptName\n");
    model.add(RES(uri), nameProp, name);
  }
};


FormPanel.prototype.arrayToSet = function (a) {
  var s = {};
  for (var i = 0; i < a.length; i++) {
    s[a[i]] = 1;
  }
  return s;
};


FormPanel.prototype.resizeFrame = function () {
  var doc = this.frame.contentDocument;
  var h = doc.body.clientHeight + 50;
  this.frame.style.setProperty('min-height', h + 'px', '');
};


FormPanel.prototype.updateCommands = function () {
  try {
    dump("FormPanel.updateCommands\n");
    var remCmd = el('cmd-remove-media');
    if (this.media.selected) {
      remCmd.removeAttribute('disabled');
    }
    else {
      remCmd.setAttribute('disabled', true);
    }
  }
  catch (ex) { dump(ex) }
};


// === TODO: refactor with media panel ==========================

FormPanel.prototype.addMedia = function () {
  if (! this.currentItem || ! this.currentItem.uri) return;

  this.mediaController.addResourceMedia(this.currentItem.uri);
};


FormPanel.prototype.removeMedia = function () {
  if (this.media.selected) {
    this.mediaController.removeResourceMedia(this.media.selected.id);
    this.delMediaCmd.setAttribute('disabled', true);
  }
};


FormPanel.prototype.mediaDoubleClick = function (event) {
  if (! event.target.id || ! this.media.selected) return;

  var fileURL = this.project.mediaFileURLOf(event.target.id);
  window.openDialog(Cx.CONTENT_PATH + 'mediaview.xul',
                    '_blank',
                    'chrome,centerscreen,dialog=no',
                    fileURL);
};


FormPanel.prototype.mediaItemChanged = function (elem) {
  this.project.updateResource({ uri: elem.id, title: elem.title });
};


FormPanel.prototype.mediaDragOver = function (event) {
  nsDragAndDrop.dragOver(event, this.mediaDragObserver);
};


FormPanel.prototype.mediaDragDrop = function (event) {
  if (! this.currentItem || ! this.currentItem.uri) return;
  nsDragAndDrop.drop(event, this.mediaDragObserver);
};



function FormPanelDragObserver (panel) {
  this.panel = panel;
}


FormPanelDragObserver.prototype.getSupportedFlavours = function () {
  var flavours = new FlavourSet();
  flavours.appendFlavour('text/unicode');
  return flavours;
};


FormPanelDragObserver.prototype.onDragOver = function (event, flavour, session) { };


FormPanelDragObserver.prototype.onDrop = function (event, data, session) {
  if (! data.data) return;

  var imgURL = data.data;
  if (imgURL.match(/^http/)) {
    // Check for GIS searches
    var gis;
    if (gis = imgURL.match(/imgurl=([^&]+)/)) {
      imgURL = unescape(gis[1]);
    }
  }

  if (! imgURL) {
    dump("Couldn't match " + imgURL + " to anything meaningful.\n");
    return;
  }

  try {
    var url = strToURL(imgURL);
    this.panel.mediaController.addMediaFile(this.panel.currentItem.uri, url);
  }
  catch (ex) {
    dump("panel.mediaDragObserver.onDrop error: " + ex + "\n");
  }
};


// ==========================
