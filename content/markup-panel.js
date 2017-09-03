var panel = {
  currentItem: null,
  itemName: null,
  itemDesc: null,
  deptList: null,
  itemList: null,
  itemFilter: null,
  mediaView: null,
  newElem: null,
  strBundle: null,
  project: null,
  commands: null
};


panel.init = function () {
  try {
    this.commands = {
      tag:  el('cmd-tag-item'),
      del:  el('cmd-delete-item'),
      add:  el('cmd-add-media'),
      rem:  el('cmd-remove-media'),
      gis:  el('cmd-img-search')
    };

    this.itemName   = el('item-name');
    this.itemDesc   = el('item-desc');
    this.deptList   = el('dept-list');
    this.itemList   = el('item-list');
    this.itemFilter = el('item-list-filter');
    this.mediaView  = el('media-view');
    this.newElem    = el('new-item');
    this.strBundle  = el('celtx-bundle');

    this.project = top.gProjWin.project;

    this.deptList.ref = this.project.markupURL;

    this.itemList.database.AddDataSource(this.project.model.ds);
    this.itemList.database.AddDataSource(top.instanceMapper.mapping);
    this.itemList.ref = top.instanceMapper.refURL;

    this.mediaView.database.AddDataSource(this.project.model.ds);

    this.deptList.selectedIndex = 0;

    this.update();
  }
  catch (ex) {
    dump("panel.init: " + ex + "\n");
  }
};


panel.destroy = function () {

};


panel.update = function () {
  if (this.currentItem) {
    this.itemName.disabled = false;
    this.itemDesc.disabled = false;
    this.itemName.assign(this.currentItem.label);
    this.itemDesc.assign(this.currentItem.desc);
    this.mediaView.ref = this.currentItem.res;
  }
  else {
    this.itemName.disabled = true;
    this.itemDesc.disabled = true;
    this.itemName.assign('');
    this.itemDesc.assign('');
    this.mediaView.ref = '';
  }
  this.updateCommands();
};


panel.updateCommands = function () {
  if (this.currentItem) {

    this.commands.tag.removeAttribute('disabled');

    if (this.currentItem.res) {
      this.commands.del.removeAttribute('disabled');
      this.commands.add.removeAttribute('disabled');
      this.commands.gis.removeAttribute('disabled');
    }
    else {
      this.commands.del.setAttribute('disabled', true);
      this.commands.add.setAttribute('disabled', true);
      this.commands.gis.setAttribute('disabled', true);
    }

    if (this.mediaView.selected) {
      this.commands.rem.removeAttribute('disabled');
    }
    else {
      this.commands.rem.setAttribute('disabled', true);
    }

  }
  else {
    this.commands.tag.setAttribute('disabled', true);
    this.commands.del.setAttribute('disabled', true);
    this.commands.add.setAttribute('disabled', true);
    this.commands.gis.setAttribute('disabled', true);
    this.commands.rem.setAttribute('disabled', true);
  }
};


panel.tagItem = function () {
  if (! this.currentItem) return;

  var obj = {
    uri:   this.currentItem.res,
    type:  this.currentItem.type,
    title: this.itemName.value,
    desc:  this.itemDesc.value,
    elem:  this.currentItem.elem
  };

  if (! obj.uri) {
    this.project.add(obj);
    this.selectItem(obj.uri);
  }

  // TODO: Add notification
  if ("markup" in top.gProjWin.currentDocumentView)
    top.gProjWin.currentDocumentView.markup(obj);
  top._content.focus();
};


panel.saveItem = function () {
  if (! this.currentItem) return;

  var obj = {
    uri:   this.currentItem.res,
    type:  this.currentItem.type,
    title: this.itemName.value,
    desc:  this.itemDesc.value
  };

  if (obj.uri) {
    this.project.updateResource(obj);
  }
  else {
    this.project.add(obj);
  }

  this.selectItem(obj.uri);
  // this.itemList.focus();
};


panel.deleteItem = function () {
  if (! this.currentItem || ! this.currentItem.res) return;
  if (! window.confirm(top.app.text('ConfirmDeleteItem'))) return;

  var uri = this.currentItem.res;
  top.deleteResource(uri);
  this.clearItem();
  this.update();
  this.itemList.focus();
};


panel.deptSelected = function () {
  this.clearItem();
  var dept = this.deptList.selectedItem;
  this.newElem.label = top.app.textf('newMarkupItem', [ dept.label ]);
  this.setFilter(dept ? dept.id : Cx.NS_CX + 'Any');
  this.update();
};


panel.clearItem = function () {
  // Kludge - blur not always received in time otherwise
  if (this.currentItem) {
    this.itemName.inputField.blur();
    this.itemDesc.inputField.blur();
  }

  this.currentItem = null;
  this.itemList.clearSelection();
};


panel.setItem = function (item) {
  if (item.id == 'new-item') {
    this.currentItem = {
      type:     this.deptList.selectedItem.id,
      label:    this.defaultLabel(),
      desc:     '',
      elem:     this.deptList.selectedItem.getAttribute('cxelement'),
      res:      null,
    };
  }
  else {
    this.currentItem = {
      type:     this.deptList.selectedItem.id,
      label:    item.label,
      desc:     item.getAttribute('dcdesc'),
      elem:     this.deptList.selectedItem.getAttribute('cxelement'),
      res:      item.id,
    };
  }

  this.update();
};


panel.selectItem = function (id) {
  return this.selectListItem(this.itemList, id);
};


panel.selectDept = function (id) {
  return this.selectListItem(this.deptList, id);
};


panel.selectListItem = function (list, id) {
  try {
    var item, el;
    var cnt = list.getRowCount();
    for (var i = 0; i < cnt; i++) {
      el = list.getItemAtIndex(i);
      if (el.id == id) {
        item = el;
        break;
      }
    }
    if (! item) throw "not found " + id;
    list.ensureElementIsVisible(item);
    list.selectItem(item);
    return true;
  }
  catch (ex) {
    dump("selectListItem: " + ex + "\n");
    return false;
  }
};


panel.defaultLabel = function () {
  var view = top.gProjWin.currentDocumentView;
  if (view.doc == "urn:celtx:document:script")
    var str = view.scripteditor.selection.toString();
  else
    str = "";
  return str == "" ? "Untitled" : str;  // TODO: i18n
};


panel.setFilter = function (uri) {
  // TODO: perhaps should check if attr is changing and avoid rebuild if not
  this.itemFilter.setAttribute('object',
                               uri == Cx.NS_CX + 'Any' ? '?unused' : uri);
  this.itemList.builder.rebuild();
};


panel.itemSelected = function () {
  var item = this.itemList.selectedItem;
  if (! item) return;
  this.setItem(item);
  if (item.id == 'new-item') setTimeout(focusNameField, 0);
};


panel.nameChanged = function () {
  this.saveItem();
};


panel.descChanged = function () {
  this.saveItem();
};


panel.addMedia = function () {
  if (! this.currentItem || ! this.currentItem.res) return;

  top.gProjWin.addResourceMedia(this.currentItem.res);
};


panel.removeMedia = function () {
  if (this.mediaView.selected) {
    top.gProjWin.removeResourceMedia(this.mediaView.selected.id);
  }
};


panel.mediaDoubleClick = function (event) {
  if (! event.target.id || ! this.mediaView.selected) return;

  var fileURL = this.project.mediaFileURLOf(event.target.id);
  window.openDialog(Cx.CONTENT_PATH + 'mediaview.xul',
                    '_blank',
                    'chrome,centerscreen,dialog=no',
                    fileURL);
};


panel.mediaItemChanged = function (elem) {
  this.project.updateResource({ uri: elem.id, title: elem.title });
};


panel.mediaDragOver = function (event) {
  nsDragAndDrop.dragOver(event, this.mediaDragObserver);
};


panel.mediaDragDrop = function (event) {
  if (! this.currentItem || ! this.currentItem.res) return;
  nsDragAndDrop.drop(event, this.mediaDragObserver);
};


panel.mediaDragObserver = {

  getSupportedFlavours: function () {
    var flavours = new FlavourSet();
    flavours.appendFlavour('text/unicode');
    return flavours;
  },

  onDragOver: function (event, flavour, session) { },

  onDrop: function (event, data, session) {
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
      var nsIStandardURL = Components.interfaces.nsIStandardURL;
      var url = Components.classes["@mozilla.org/network/standard-url;1"]
        .createInstance(nsIStandardURL);
      url.init(nsIStandardURL.URLTYPE_STANDARD, 0, imgURL, null, null);
      url = url.QueryInterface(Components.interfaces.nsIURL);
      top.gProjWin.addMediaFile(panel.currentItem.res, url);
    }
    catch (ex) {
      dump("panel.mediaDragObserver.onDrop error: " + ex + "\n");
    }
  }

};


// XXX KLUDGE
panel.imageSearch = function () {
  if (! this.currentItem || ! this.currentItem.res) return;

  var prefix = 'http://images.google.com/images?q=';
  var suffix = '&btnG=Google+Search';

  var term = encodeURIComponent(this.itemName.value);
  var browser = window.openDialog('chrome://browser/content/',
                                  '_blank',
                                  Cx.NEW_WINDOW_FLAGS + ',width=640,height=480',
                                  prefix + term + suffix);
};


panel.selectDeptItem = function (deptURI, itemURI) {
  if (this.selectDept(deptURI)) {
    this.selectItem(itemURI);
  }
};


function focusNameField () {
  panel.itemName.inputField.select();
  panel.itemName.inputField.focus();
}
