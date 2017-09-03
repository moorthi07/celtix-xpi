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


function RDFModel (uri, flags) {
  // We only handle local models
  if (uri.search(/^(file|chrome):/) == -1) {
    throw Components.results.ERR_FAILURE;
  }

  this._uri   = uri;
  this._flags = flags;
  this.valid  = false;

  this.RDF = getRDFService();

  this.initFromStorage();
}


RDFModel.prototype.LOAD_ASYNC    getter = function () { return 0x1 };
RDFModel.prototype.LOAD_READONLY getter = function () { return 0x2 };
RDFModel.prototype.LOAD_CREATE   getter = function () { return 0x4 };

RDFModel.prototype.RDF_NS getter = function ()
  { return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' };
RDFModel.prototype.RDFS_NS getter = function ()
  { return 'http://www.w3.org/2000/01/rdf-schema#' };
RDFModel.prototype.RDF_EMPTY_XML getter = function ()
  { return '<?xml version="1.0"?>\n<rdf:RDF xmlns:rdf="' + this.RDF_NS + '"/>'; };



RDFModel.prototype.initFromStorage = function () {
  var s = new RDFStorage(this);
  this.storage = s;
  this.ds = s.dsource;  // Just a shortcut
};


RDFModel.prototype.add = function (subject, predicate, object) {
  if (! this.valid) return;

  try {
    var rv = this.ds.Assert(subject.resource(this.RDF),
                            predicate.resource(this.RDF),
                            object.resource(this.RDF),
                            true);
  }
  catch (ex) {
    dump("add failed: " + ex + "\n");
    return false;
  }
  return true;
};


RDFModel.prototype.remove = function (subject, predicate, object) {
  if (! this.valid) return false;

  try {
    var rv = this.ds.Unassert(subject.resource(this.RDF),
                              predicate.resource(this.RDF),
                              object.resource(this.RDF));
  }
  catch (ex) {
    dump("add failed: " + ex + "\n");
    return false;
  }
  return true;
};


RDFModel.prototype.change = function (subject, predicate, object, newobj) {
  if (! this.valid) return;

  // nsIRDFDataSource::Change doesn't care if the statement exists, but we do
  if (! this.contains(subject, predicate, object)) return false;

  try {
    this.ds.Change(subject.resource(this.RDF),
                   predicate.resource(this.RDF),
                   object.resource(this.RDF),
                   newobj.resource(this.RDF));
  }
  catch (ex) {
    dump("change failed: " + ex + "\n");
    return false;
  }
  return true;
};


RDFModel.prototype.contains = function (subject, predicate, object) {
  if (! this.valid) return;

  try {
    var rv = this.ds.HasAssertion(subject.resource(this.RDF),
                                  predicate.resource(this.RDF),
                                  object.resource(this.RDF),
                                  true);
  }
  catch (ex) {
    dump("contains failed: " + ex + "\n");
    return false;
  }
  return rv;
};


RDFModel.prototype.targets = function (source, arc) {
  if (! this.valid) return;

  return this.makeList(this.ds.GetTargets(source.resource(this.RDF),
                                          arc.resource(this.RDF),
                                          true));
};


RDFModel.prototype.sources = function (arc, target) {
  if (! this.valid) return;

  return this.makeList(this.ds.GetSources(arc.resource(this.RDF),
                                          target.resource(this.RDF),
                                          true));
};


RDFModel.prototype.arcs = function (source, target) {
  const nsIRDFResource = Components.interfaces.nsIRDFResource;

  if (! this.valid) return;

  var list = new Array();
  var iter = this.ds.ArcLabelsOut(source.resource(this.RDF));
  while (iter.hasMoreElements()) {
    var arc = iter.getNext();
    arc = arc.QueryInterface(nsIRDFResource);
    if (this.ds.HasAssertion(source.resource(this.RDF),
                             arc,
                             target.resource(this.RDF),
                             true)) {
      list.push(new RDFResource(arc.Value));
    }
  }

  return list;
};


RDFModel.prototype.target = function (source, arc) {
  var list = this.targets(source, arc);
  return list.length > 0 ? list[0] : null;
};


RDFModel.prototype.source = function (arc, target) {
  var list = this.sources(arc, target);
  return list.length > 0 ? list[0] : null;
};


RDFModel.prototype.arc = function (source, target) {
  var list = this.arcs(source, target);
  return list.length > 0 ? list[0] : null;
};


// Find statements
RDFModel.prototype.find = function (subject, predicate, object) {
  const nsIRDFResource = Components.interfaces.nsIRDFResource;
  const nsIRDFLiteral  = Components.interfaces.nsIRDFLiteral;

  if (! this.valid) return;

  if (subject == null && predicate == null && object == null) return;
  var list = new Array();

  if (subject && predicate && object) {
    if (this.contains(subject, predicate, object)) {
      list.push([subject, predicate, object]);
    }
  }
  else if (subject && predicate) {
    var targets = this.targets(subject, predicate);
    for (var i = 0; i < targets.length; i++) {
      list.push([subject, predicate, targets[i]]);
    }
  }
  else if (predicate && object) {
    var sources = this.sources(predicate, object);
    for (var i = 0; i < sources.length; i++) {
      list.push([sources[i], predicate, object]);
    }
  }
  else if (subject && object) {
    var arcs = this.arcs(subject, object);
    for (var i = 0; i < arcs.length; i++) {
      list.push([subject, arcs[i], object]);
    }
  }
  else if (subject) {
    var iter = this.ds.ArcLabelsOut(subject.resource(this.RDF));
    while (iter.hasMoreElements()) {
      var p = iter.getNext();
      p = p.QueryInterface(nsIRDFResource);
      var arc = new RDFResource(p.Value);
      var targets = this.targets(subject, arc);
      for (var i = 0; i < targets.length; i++) {
        list.push([subject, arc, targets[i]]);
      }
    }
  }
  else if (object) {
    var iter = this.ds.ArcLabelsIn(object.resource(this.RDF));
    while (iter.hasMoreElements()) {
      var p = iter.getNext();
      p = p.QueryInterface(nsIRDFResource);
      var arc = new RDFResource(p.Value);
      var sources = this.sources(arc, object);
      for (var i = 0; i < sources.length; i++) {
        list.push([sources[i], arc, object]);
      }
    }
  }
  else if (predicate) {
    var sources = this.makeList(this.ds.GetAllResources());
    for (var i = 0; i < sources.length; i++) {
      var targets = this.targets(sources[i], predicate);
      for (var j = 0; j < targets.length; j++) {
        list.push([sources[i], predicate, targets[j]]);
      }
    }
  }

  return list;
};


RDFModel.prototype.makeList = function (iter) {
  const nsIRDFResource = Components.interfaces.nsIRDFResource;
  const nsIRDFLiteral  = Components.interfaces.nsIRDFLiteral;

  var list = new Array();
  while (iter.hasMoreElements()) {
    var t = iter.getNext();
    if (!t) continue;
    try {
      t = t.QueryInterface(nsIRDFLiteral);
      list.push(new RDFLiteral(t.Value));
    }
    catch (e) {
      t = t.QueryInterface(nsIRDFResource);
      list.push(new RDFResource(t.Value));
    }
  }
  return list;
};


RDFModel.prototype.dump = function () {
  var iter = this.ds.GetAllResources();
  while (iter.hasMoreElements()) {
    var r = iter.getNext();
    if (!r) continue;
    r = r.QueryInterface(Components.interfaces.nsIRDFResource);
    var list = this.find(new RDFResource(r.Value), null, null);
    for (var i = 0; i < list.length; i++) {
      dump('{' +
           '[' + list[i][0].value + '],' +
           '[' + list[i][1].value + '],' +
           '[' + list[i][2].value + ']}\n');
    }
  }
};


// Typically no need to save explicitly
RDFModel.prototype.save = function () {
  if (this.storage) this.storage.save();
};


RDFModel.prototype.reload = function () {
  if (this.storage) this.storage.reload();
};


RDFModel.prototype.destroy = function () {
  if (this.storage) this.storage.destroy();
};


// Container handling
RDFModel.prototype.isContainer = function (res) {
  var cu = getRDFContainerUtils();
  return cu.IsContainer(this.ds, res.resource(this.RDF));
};


RDFModel.prototype.makeSeq = function (res) {
  var cu = getRDFContainerUtils();
  cu.MakeSeq(this.ds, res.resource(this.RDF));

  return new RDFSequence(this.RDF, this.ds, res.resource(this.RDF));
};


RDFModel.prototype.container = function (res) {
  if (! this.isContainer(res)) return null;

  return new RDFSequence(this.RDF, this.ds, res.resource(this.RDF));
};



// STORAGE ---------------------------------------------------------

function RDFStorage (model) {
  this.model = model;
  this.init();
}


RDFStorage.prototype.init = function () {
  const INIT_ERROR = Components.results.ERR_FAILURE;

  var ios = getIOService();
  if (!ios) throw INIT_ERROR;

  var uri = this.model._uri;

  if (uri.search(/^file:/) == 0) {
    var f = IFile(uri);
    if (!f) throw INIT_ERROR;

    if (f.exists()) {
      if (this.model._flags & this.model.LOAD_READONLY) {
        if (! f.isReadable()) throw INIT_ERROR;
      }
      else {
        if (! f.isWritable()) throw INIT_ERROR;
      }

    }
    else {
      if (this.model._flags & this.model.LOAD_CREATE) {
        if (! this.createFile(f.path)) throw INIT_ERROR;
      }
      else {
        dump("RDFStorage.init: no such file: " + f.path + "\n");
        throw INIT_ERROR;
      }
    }

    uri = ios.newFileURI(f).spec;
  }

  this.initDataSource(uri);
};


RDFStorage.prototype.createFile = function (path) {
  return writeFile(this.model.RDF_EMPTY_XML, path);
};


RDFStorage.prototype.initDataSource = function (src) {
  try {
    this.dsource = this.model.RDF.GetDataSourceBlocking(src);
  }
  catch (ex) {
    dump("RDFStorage.initDataSource: error loading " + src + ": " + ex + "\n");
    return;
  }
  
  this.loaded = true;
  this.model.valid = true;
};


RDFStorage.prototype.save = function () {
  const nsIRDFRemoteDataSource = Components.interfaces.nsIRDFRemoteDataSource;

  var rds = this.dsource.QueryInterface(nsIRDFRemoteDataSource);
  rds.Flush();
};


RDFStorage.prototype.reload = function () {
  // This seems to be causing problems when the datasource contains empty
  // rdf:Seq elements. Specifically, they end up having an rdf:instanceOf arc
  // pointing to rdf:Seq, but no rdf:nextVal arc, effectively making containers
  // that don't know if they have any elements. As far as I can tell, the RDF
  // service shares datasource instances with the same URI, so there is no need
  // to reload the datasource anyway, but I could be wrong.
  dump("*** Ignoring request for RDFStorage.reload\n");
  return;

  const nsIRDFRemoteDataSource = Components.interfaces.nsIRDFRemoteDataSource;

  var rds = this.dsource.QueryInterface(nsIRDFRemoteDataSource);
  var blocking = true;
  rds.Refresh(blocking);
};


RDFStorage.prototype.destroy = function () {
  this.save();
};


// Node ----------------------------------------------------------------
// includes resource, property, literal


function RDFNode () {
  this._value = null;
}

RDFNode.prototype.value getter = function () {
  return this._value;
};


function RDFResource (uri) {
  this._value = uri;
}

RDFResource.prototype = new RDFNode();

RDFResource.prototype.resource = function (rdf) {
  if (this._value == null) {
    var result = rdf.GetAnonymousResource();
    this._value = result.Value;
    return result;
  }
  else
    return rdf.GetResource(this._value);
/*
  return this._value == null ? rdf.GetAnonymousResource()
                             : rdf.GetResource(this._value);
 */
}


function RDFLiteral (str) {
  this._value = str;
}

RDFLiteral.prototype = new RDFNode();

RDFLiteral.prototype.resource = function (rdf) {
  return rdf.GetLiteral(this._value);
};


function RDFSequence (rdf, ds, res) {
  this.RDF = rdf;
  this.ds  = ds;
  this.res = res;
}


// Indices are one-based
RDFSequence.prototype.insertAt = function (res, idx) {
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);
  cont.InsertElementAt(res.resource(this.RDF), idx, true);
};


RDFSequence.prototype.append = function (res) {
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);
  cont.AppendElement(res.resource(this.RDF));
};


RDFSequence.prototype.remove = function (res) {
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);
  cont.RemoveElement(res.resource(this.RDF), true);
};


RDFSequence.prototype.elements = function () {
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);
  var iter = cont.GetElements();
  var list = RDFModel.prototype.makeList(iter);
  return list;
};


RDFSequence.prototype.indexOf = function (res) {
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);
  var idx = cont.IndexOf(res.resource(this.RDF));
  return idx;
};


RDFSequence.prototype.swap = function (idx1, idx2) {
  if (idx1 == idx2) return;
  
  var cont = getRDFContainer();
  cont.Init(this.ds, this.res);

  var node1 = cont.RemoveElementAt(idx1, false);
  if (! node1) return;
  var node2 = cont.RemoveElementAt(idx2, false);
  if (! node2) return;
  cont.InsertElementAt(node2, idx1, false);
  cont.InsertElementAt(node1, idx2, false);
};


// Convenience functions

function RES (uri) { return new RDFResource(uri); }
function LIT (str) { return new RDFLiteral(str);  }

// Attempts to sensibly add, update, or remove a literal property
function setLiteralProp (model, res, prop, lit) {
  var cur = model.target(res, prop);

  if (! lit || lit.value == '') {
    if (cur) {
      model.remove(res, prop, cur);
    }
  }
  else {
    if (cur) {
      model.change(res, prop, cur, lit);
    }
    else {
      model.add(res, prop, lit);
    }
  }
}


// Removes the specified resource's property, regardless of value
function removeProp (model, res, prop) {
  var cur = model.target(res, prop);
  if (cur) {
    model.remove(res, prop, cur);
  }
}


// Set a list of literal values for a resource's property
function setCustomPropValues (model, res, prop, values) {
  var i, e;
  var valMap = {};
  for (i = 0; i < values.length; i++) {
    valMap[values[i]] = LIT(values[i]);
  }

  var targets = model.targets(res, prop);
  for (i = 0; i < targets.length; i++) {
    e = targets[i];
    if (e.value in valMap) {
      dump("ignoring value " + e.value + "\n");
      delete valMap[e.value];
    }
    else {
      dump("removing value " + e.value + "\n");
      model.remove(res, prop, e);
    }
  }

  // Remaining valMap items need to be added
  for (e in valMap) {
    dump("adding value " + e + "\n");
    model.add(res, prop, valMap[e]);
  }
}
