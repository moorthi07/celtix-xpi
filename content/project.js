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

// ProjectManager --------------------------------------------------------------

// dir is nsIFile
function ProjectManager (dir) {
  this.root = dir.clone();
  this.init();
}


ProjectManager.prototype.init = function () {
  this.pendingDownloads = {};

  var d = this.root.clone();
  d.append(Cx.PROJECTS_DIR);
  if (! d.exists()) {
    dump("projects directory doesn't exist, rectifying\n");
    this.initFolder(d);
  }

  var f = this.root.clone();
  f.append(Cx.PROJECTS_FILE);
  if (! f.exists()) {
    dump("projects file not found, rectifying\n");
    this.initProjectsFile(f);
  }

  this.model = new RDFModel(pathToFileURL(f.path));
};


ProjectManager.prototype.destroy = function () {
  if (this.model) {
    this.model.destroy();
  }
};


ProjectManager.prototype.initFolder = function (dir) {
  if (! dir.exists()) {
    try {
      dir.create(0x1, Cx.DIR_PERMS);  // 0x1 for directory
    }
    catch (ex) {
      dump("Can't create projects folder: " + ex + "\n");
      throw Components.results.ERR_FAILURE;
    }
  }

  if (! dir.isDirectory()) {
    dump("Projects folder is not a directory\n");
    throw Components.results.ERR_FAILURE;
  }

  if (! dir.isWritable()) {
    dump("Projects folder is not writable\n");
    throw Components.results.ERR_FAILURE;
  }
};


ProjectManager.prototype.initProjectsFile = function (file) {
  try {
    var skel = document.implementation.createDocument('', 'project', null);
    skel.async = false;
    skel.load(Cx.CONTENT_PATH + 'project-rdf.xml');

    if (! serializeDOMtoFile(skel, file.path)) {
      throw new Error("Can't save skeleton doc");
    }
  }
  catch (ex) {
    dump("Error creating project file: " + file.path + ": " + ex + "\n");
    throw Components.results.ERR_FAILURE;
  }
};


ProjectManager.prototype.initProjectFile = function (file, res, title) {
  try {
    var skel = document.implementation.createDocument('', 'project', null);
    skel.async = false;
    skel.load(Cx.CONTENT_PATH + 'project-rdf.xml');

    var projElem = skel.createElementNS(Cx.NS_CX, 'Project');
    projElem.setAttributeNS(Cx.NS_RDF, 'about', res.value);
    projElem.setAttributeNS(Cx.NS_CX, 'fileVersion', Cx.FILE_VERSION);
    projElem.setAttributeNS(Cx.NS_DC, 'title', title);
    skel.documentElement.appendChild(projElem);

    if (! serializeDOMtoFile(skel, file.path)) {
      throw new Error("Can't save skeleton doc");
    }
  }
  catch (ex) {
    dump("Error creating project file: " + file.path + ": " + ex + "\n");
    throw Components.results.ERR_FAILURE;
  }
};


ProjectManager.prototype.initScriptFile = function (file) {
  try {
    var skel = document.implementation.createDocument('', 'script', null);
    skel.async = false;
    skel.load(Cx.CONTENT_PATH + 'new-script.xml');

    if (! serializeDOMtoFile(skel, file.path)) {
      throw new Error("Can't save script skeleton doc");
    }
  }
  catch (ex) {
    dump("Error creating script file: " + file.path + ": " + ex + "\n");
    throw Components.results.ERR_FAILURE;
  }
};



ProjectManager.prototype.dsURI getter = function () {
  var f = this.root.clone();
  f.append(Cx.PROJECTS_FILE);
  return pathToFileURL(f.path);
};


ProjectManager.prototype.project = function (uri) {
  var proj = new Project(uri);

  proj.manager = this;

  return proj;
};


// Returns URI of new project
ProjectManager.prototype.createProject = function (projDir) {
  if (! projDir)
    throw "No project directory specified";
  var id  = generateID();
  var res = RES(Cx.PROJECTS_URL + '/' + id);

  this.model.add(res, RES(Cx.NS_RDF + 'type'), RES(Cx.NS_CX + 'Project'));
  this.model.add(res, RES(Cx.NS_DC  + 'title'), LIT(projDir.leafName));
  this.model.add(res, RES(Cx.NS_DC  + 'created'), LIT(isoDateTime()));
  this.model.add(res, RES(Cx.NS_CX  + 'temporary'), LIT('true'));

  // Add project to local sequence
  var projectsRes = RES(Cx.LOCAL_PROJECTS);
  var container   = null;
  if (this.model.isContainer(projectsRes)) {
    container = this.model.container(projectsRes);
  }
  else {
    container = this.model.makeSeq(projectsRes);
  }
  container.append(res);

  try {
    const kDirType = 1;
    if (! projDir.exists())
      projDir.create(kDirType, projDir.parent.permissions);
    this.model.add(res, RES(Cx.NS_CX + 'path'), LIT(projDir.path));

    var projFile = projDir.clone();
    projFile.append(Cx.PROJECT_FILE);
    this.initProjectFile(projFile, res, projDir.leafName);

    var scriptFile = projDir.clone();
    scriptFile.append(Cx.SCRIPT_FILE);
    this.initScriptFile(scriptFile);
    this.model.save();
  }
  catch (ex) {
    dump("Error creating project: " + ex + "\n");
    container.remove(res);
    throw Components.results.ERR_FAILURE;
  }

  return res.value;
};


ProjectManager.prototype.initProjectDir = function (id) {
  var ds = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIDirectoryServiceProvider);
  var persist = {};
  var dir = ds.getFile('TmpD', persist);
  dir.append("Celtx_Project");
  dir.createUnique(1, Cx.DIR_PERMS);
  return dir;
};


ProjectManager.prototype.copyProject = function (proj, dir) {
  var uri = null;

  try {
    uri = this.createProject(dir);
    var newProj = this.project(uri);

    newProj.copyFrom(proj);
    newProj.open();
    newProj.title = dir.leafName;
    newProj.author = proj.author;
    newProj.source = proj.source;
    newProj.rights = proj.rights;
    newProj.contact = proj.contact;
    // Other attributes like creation date, creator, etc?
    newProj.save();
    newProj = null;
  }
  catch (ex) {
    dump("copyProject: " + ex + "\n");
  }

  return uri;
};



// Called when a managed project undergoes a top-level property change
ProjectManager.prototype.notify = function (op, proj, prop, val1, val2) {

//   dump("notify: " + op + ": " + proj.value + "\n" +
//        "  prop: " + prop.value + "\n" +
//        "  val1: " + val1.value + "\n" +
//        (val2 ? "  val2: " + val2.value + "\n" : ""));

  this.model.reload();

  switch (op) {
    case 'add':
      this.model.add(proj, prop, val1);
      break;
    case 'change':
      if (this.model.contains(proj, prop, val1)) {
        this.model.change(proj, prop, val1, val2);
      }
      else {
        this.model.add(proj, prop, val2);
      }
      break;
    case 'remove':
      this.model.remove(proj, prop, val1);
      break;
    default:
      dump("ProjectManager.notify: unknown operation: " + op + "\n");
      break;
  }

  this.model.save();
};


ProjectManager.prototype.deleteProject = function (uri) {
  // TODO: backup and/or purge files
  if (! uri) return;

  try {
    // Get the path to the project and remove the offending directory
    var proj = this.project(uri);
    var projDir = proj.localPath;
    if (projDir.exists() && projDir.isDirectory())
      projDir.remove(true);
  } catch (ex) {
    dump("*** Couldn't delete project directory: " + ex + "\n");
  }

  try {
    this.model.reload();

    var res = RES(uri);

    // Delete it from the sequence before removing all associated RDF
    // statements to ensure the integrity of the local-projects sequence.
    var projectsRes = RES(Cx.LOCAL_PROJECTS);
    var container   = this.model.makeSeq(projectsRes);
    container.remove(res);
    
    var list, i;

    // All statements where res is the object
    list = this.model.find(null, null, res);
    for (i = 0; i < list.length; i++) {
      this.model.remove(list[i][0], list[i][1], list[i][2]);
    }

    // All statements where res is the subject
    list = this.model.find(res, null, null);
    for (i = 0; i < list.length; i++) {
      this.model.remove(list[i][0], list[i][1], list[i][2]);
    }

    this.model.save();
  }
  catch (ex) {
    dump("failed to delete project " + res.value + "\n");
  }

};


ProjectManager.prototype.initDownload = function (uri, projDir) {
  var ios = getIOService();
  var url = ios.newURI(uri, null, null);
  // Turn uri -> url so we can get filename
  url = url.QueryInterface(Components.interfaces.nsIURL);

  var id = url.fileName;  // The leaf directory
  dump("initDownload: project ID: " + id + "\n");

  // TODO: other tests  - check for directory type, is writable
if (! projDir.exists()) {
    try {
      projDir.create(0x1, Cx.DIR_PERMS);
    }
    catch (ex) {
      dump("initDownload: unable to create directory: " + ex + "\n");
      return;
    }
  }

  var fileURL = pathToFileURL(projDir.path);

  this.pendingDownloads[uri] = { id: id, dir: fileURL };

  // Or could return an nsIFile...
  return fileURL;
};


ProjectManager.prototype.notifyDownload = function (uri) {
  var titleProp    = RES(Cx.NS_DC + 'title');
  var descProp     = RES(Cx.NS_DC + 'description');
  var createdProp  = RES(Cx.NS_DC + 'created');
  var modifiedProp = RES(Cx.NS_DC + 'modified');
  var authorProp   = RES(Cx.NS_CX + 'author');
  var sourceProp   = RES(Cx.NS_DC + 'source');
  var rightsProp   = RES(Cx.NS_DC + 'rights');
  var contactProp  = RES(Cx.NS_CX + 'contact');

  dump("notifyDownload: " + uri + "\n");

  var download = this.pendingDownloads[uri];
  if (! download) {
    dump("no pending download: " + uri + "\n");
    return;
  }

  var f = IFile(download.dir);
  f.append(Cx.PROJECT_FILE);
  if (! f.exists()) {
    dump("notifyDownload: no project file: " + f.path + "\n");
    return;
  }

  // XXX check for script, too?

  // Add or update the project metadata
  var res = RES(Cx.PROJECTS_URL + '/' + download.id);
  var projModel = new RDFModel('file://' + f.path);

  var titleRes    = projModel.target(res, titleProp);
  var descRes     = projModel.target(res, descProp);
  var createdRes  = projModel.target(res, createdProp);
  var modifiedRes = projModel.target(res, modifiedProp);
  var authorRes   = projModel.target(res, authorProp);
  var sourceRes   = projModel.target(res, sourceProp);
  var rightsRes   = projModel.target(res, rightsProp);
  var contactRes   = projModel.target(res, contactProp);

  this.model.reload();

  var typeProp  = RES(Cx.NS_RDF + 'type');
  var projClass = RES(Cx.NS_CX + 'Project');

  if (! this.model.contains(res, typeProp, projClass)) {
    // New project XXX refactor with createProject?
    this.model.add(res, typeProp, projClass);

    // Add project to local sequence
    var projectsRes = RES(Cx.LOCAL_PROJECTS);
    var container   = null;
    if (this.model.isContainer(projectsRes)) {
      container = this.model.container(projectsRes);
    }
    else {
      container = this.model.makeSeq(projectsRes);
    }
    container.append(res);
  }

  // Add or update metadata
  setLiteralProp(this.model, res, titleProp,    titleRes);
  setLiteralProp(this.model, res, descProp,     descRes);
  setLiteralProp(this.model, res, createdProp,  createdRes);
  setLiteralProp(this.model, res, modifiedProp, modifiedRes);
  if (authorRes)
    setLiteralProp(this.model, res, authorProp, authorRes);
  if (sourceRes)
    setLiteralProp(this.model, res, sourceProp, sourceRes);
  if (rightsRes)
    setLiteralProp(this.model, res, rightsProp, rightsRes);
  if (contactRes)
    setLiteralProp(this.model, res, contactProp, contactRes);

  this.model.save();

  delete this.pendingDownloads[uri];
};


// TODO: change test to look for cx:Project type statement
ProjectManager.prototype.addExternalProject = function (projDir) {
  var rdfFile = projDir.clone();
  rdfFile.append(Cx.PROJECT_FILE);
  if (!(rdfFile.exists() && rdfFile.isFile()))
    throw rdfFile.path + " is not a file";

  // Peek at the project's notion of its own project URI
  var model = new RDFModel(pathToFileURL(rdfFile.path));
  var res = model.source(RES(Cx.NS_RDF + "type"), RES(Cx.NS_CX + "Project"));

  // If no explicit cx:Project type, try searching for the old scenes list
  if (! res) {
    var scenes = new RDFResource(Cx.NS_CX + "scenes");
    var triples = model.find(null, scenes, null);
    if (triples.length == 1)
      res = triples[0][0]; // project is the subject of that triple
  }

  // Still nothing? I think we accidentally dropped the cx:Project type
  // in one of the releases. Try the cx:fileVersion arc for a subject.
  if (! res) {
    var fileVersion = new RDFResource(Cx.NS_CX + "fileVersion");
    var triples = model.find(null, fileVersion, null);
    if (triples.length == 1) {
      res = triples[0][0]; // project is the subject of that triple
      // Add the missing cx:Project statement
      model.add(res, RES(Cx.NS_RDF + "type"), RES(Cx.NS_CX + "Project"));
    }
  }

  // Still nothing, then it's a lost cause
  if (! res)
      throw "Invalid project file: " + rdfFile.path;

  // Add project to local sequence
  var projectsRes = RES(Cx.LOCAL_PROJECTS);
  var container;
  if (this.model.isContainer(projectsRes))
    container = this.model.container(projectsRes);
  else
    container = this.model.makeSeq(projectsRes);
  container.append(res);

  this.model.add(res, RES(Cx.NS_RDF + 'type'), RES(Cx.NS_CX + 'Project'));
  this.model.add(res, RES(Cx.NS_DC + 'title'),
    model.target(res, RES(Cx.NS_DC + 'title')));
  this.model.add(res, RES(Cx.NS_DC + 'created'), LIT(isoDateTime()));
  this.model.add(res, RES(Cx.NS_CX + 'path'), LIT(projDir.path));

  this.model.save();
  return res.value;
};



// Project ---------------------------------------------------------------------

function Project (uri) {
  this.uri = uri;
  this.res = new RDFResource(this.uri);
  this.manager = null;
  this.model = null;
  this.schema = null;  // The schema model
  this.propertyListeners = [];
}


Project.prototype.open = function () {
  try {
    this.model  = new RDFModel(this.dsURL);
    this.schema = new RDFModel(Cx.SCHEMA_URL);
    this.checkVersion();
  } catch (ex) {
    dump("*** Project.open: " + ex + "\n");
  }
};


Project.prototype.localPath getter = function () {
  var localpath = new RDFResource(Cx.NS_CX + 'path');
  var path = this.manager.model.target(this.res, localpath);
  var dir = null;
  if (path) {
    dir = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsILocalFile);
    dir.initWithPath(path.value);
  }
  else {
    dir = this.manager.root.clone()
    dir.append(Cx.PROJECTS_DIR);
    dir.append(this.id);
  }
  return dir;
};


Project.prototype.temporary getter = function () {
  var temparc = new RDFResource(Cx.NS_CX + 'temporary');
  var istemp = this.manager.model.target(this.res, temparc);
  return (istemp != null);
};


Project.prototype.temporary setter = function(val) {
  var temparc = new RDFResource(Cx.NS_CX + 'temporary');
  var istemp = this.manager.model.target(this.res, temparc);
  if (istemp && !val)
    this.manager.model.remove(this.res, temparc, istemp);
  else if (!istemp && val)
    this.manager.model.add(this.res, temparc, LIT('true'));
  this.manager.model.save();
};


Project.prototype.managed getter = function () {
  var localpath = new RDFResource(Cx.NS_CX + 'path');
  var path = this.manager.model.target(this.res, localpath);
  return (path != null);
};


Project.prototype.hasScript getter = function () {
  var f = this.localPath;
  f.append(Cx.SCRIPT_FILE);
  return f.exists();
};


Project.prototype.scriptURL getter = function () {
  var f = this.localPath;
  f.append(Cx.SCRIPT_FILE);
  return pathToFileURL(f.path);
};


Project.prototype.boneyardURL getter = function () {
  var f = this.localPath;
  f.append(Cx.BONEYARD_FILE);
  return pathToFileURL(f.path);
};


Project.prototype.hasTempScript getter = function () {
  var f = this.localPath;
  f.append(Cx.SCRIPT_TEMP_FILE);
  return f.exists();
};


Project.prototype.createTempScript = function () {
  var orig = this.localPath;
  orig.append(Cx.SCRIPT_FILE);
  var dest = this.localPath;
  dest.append(Cx.SCRIPT_TEMP_FILE);
  try {
    if (dest.exists())
      dest.remove(false);
    orig.copyTo(null, Cx.SCRIPT_TEMP_FILE);
  }
  catch (ex) { dump("*** Project.createTempScript: " + ex + "\n"); }
};


Project.prototype.tempScriptURL getter = function () {
  var f = this.localPath;
  f.append(Cx.SCRIPT_TEMP_FILE);
  return pathToFileURL(f.path);
};


Project.prototype.dsURL getter = function () {
  var f = this.localPath;
  f.append(Cx.PROJECT_FILE);
  return pathToFileURL(f.path);
};


Project.prototype.formURL = function (name) {
  var f = this.localPath;
  f.append(name + '.html');
  if (! f.exists()) return Cx.LOCALE_PATH + name + '.html'; 
  return pathToFileURL(f.path);
};


Project.prototype.id getter = function () {
  return this.uri.replace(/^.*\//, '');
};


// Do we really want this?
Project.prototype.ds getter = function () {
  return this.model.ds;
};


Project.prototype.sceneNumbering getter = function () {
  var numberProp = RES(Cx.NS_DC + 'showSceneNumbers');
  var show = this.model.target(this.res, numberProp);
  if (!show)
    return this.sceneNumbering = 'none';
  if (show.value == 'true')
    return this.sceneNumbering = 'both';
  return show.value;
};


Project.prototype.sceneNumbering setter = function (val) {
  var numberProp = RES(Cx.NS_DC + 'showSceneNumbers');
  var numberRes  = this.model.target(this.res, numberProp);
  var newVal     = val ? LIT(val) : LIT('none');

  if (numberRes) {
    this.model.change(this.res, numberProp, numberRes, newVal);
    this.manager.notify('change', this.res, numberProp, numberRes, newVal);
  }
  else {
    this.model.add(this.res, numberProp, newVal);
    this.manager.notify('add', this.res, numberProp, newVal);
  }
};


Project.prototype.add = function (obj) {
  if (! obj) return;

  try {
    // TODO: handle unspecified type

    if (! obj.uri) {
      // Mint a uri
      obj.uri = this.mintURI(obj.type);
    }
    
    var res = RES(obj.uri);

    this.model.add(res, RES(Cx.NS_RDF + 'type'), RES(obj.type));

    if (obj.title && obj.title != '') {
      this.model.add(res, RES(Cx.NS_DC + 'title'), LIT(obj.title));
    }

    if (obj.desc && obj.desc != '') {
      this.model.add(res, RES(Cx.NS_DC + 'description'), LIT(obj.desc));
    }

    return res.value;

  } catch (ex) {
    dump("Project.add: " + ex + "\n");
  }
};


Project.prototype.updateResource = function (obj) {
  if (! obj || ! obj.uri) return;

  var res = RES(obj.uri);

  if ('title' in obj) {
    setLiteralProp(this.model, res, RES(Cx.NS_DC + 'title'), LIT(obj.title));
  }
  
  if ('desc' in obj) {
    setLiteralProp(this.model, res, RES(Cx.NS_DC + 'description'), LIT(obj.desc));
  }

  if ('custom' in obj) {
    for (var p in obj.custom) {
      setCustomPropValues(this.model, res, RES(p), obj.custom[p]);
    }
  }

};


Project.prototype.mintURI = function (type) {
  var id  = generateID();
  var tag = 'res';
  return this.uri + '/' + tag + '/' + id;
};


Project.prototype.customPropertyURI = function (type, name) {
  return this.uri + '/' + type + '/' + name;
};


Project.prototype.sceneURIPrefix getter = function () {
  return this.uri + '/scene/';
};


Project.prototype.fileURLOf = function (relPath) {
  // dump("fileURLOf: " + relPath + "\n");
  try {
    var f = this.localPath;
    f.append(relPath);
    // dump("fileURLOf: -> file://" + f.path + "\n");
    return 'file://' + f.path;
  }
  catch (ex) {
    dump("fileURLOf: " + ex + "\n");
    return '';
  }
};


Project.prototype.mediaFileURLOf = function (mediaURI) {
  var fileName = this.getResourceID(RES(mediaURI));
  return this.fileURLOf(fileName);
};


// Can the specified nsIFile be added to the project?
Project.prototype.canAddFile = function (file) {
  var supported = { image: 1, audio: 1, video: 1 };

  if (! file) return false;
  var mimeType = getMIMEService().getTypeFromFile(file);
  var type = mimeType.split('/').shift();
  return supported[type];
};


Project.prototype.save = function () {
  if (this.model) this.model.save();
  var scratch = this.localPath;
  scratch.append(Cx.SCRIPT_TEMP_FILE);
  if (scratch.exists()) {
    var oldScript = this.localPath;
    oldScript.append(Cx.SCRIPT_FILE);
    oldScript.remove(false);
    scratch.copyTo(null, Cx.SCRIPT_FILE);
  }
  return true;
};


Project.prototype.close = function () {
};


// Add an image resource to the project repository. Returns an RDFLiteral
// of the local repository filename.
// TODO: handle http or other remote resources.
Project.prototype.addImage = function (url) {
  dump("Project.addImage: " + url + "\n");
  if (! url || ! url.match(/^file:\/\//)) {
    dump("Project.addImage: bad url: " + url + "\n");
    return;
  }

  var file = null;

  try {
    var resDir = this.localPath;

    var ext = url.match(/\.(jpg|jpeg|png|gif)$/i);
    if (! ext) throw new Error("Invalid image type");

    var name = generateID() + ext[0].toLowerCase();

    if (! copyFile(url, resDir.path, name)) {
      throw new Error("Error copying file");
    }

    resDir.append(name);
    file = resDir.path;
  }
  catch (ex) {
    dump("Project.addImage: " + ex + "\n");
    window.alert("Project.addImage: " + src + " to " + file + "\n" + ex);
    file = null;
  }
  
  if (! file) return;

  var img = LIT(name);
  // this.model.add(imgRes, RDF_TYPE, FOAF_IMAGE);
  // TODO: store the original source as, say, the cx:originalSource prop?

  return img;
};


Project.prototype.initMedia = function (uri, type, id, title) {
  var subject   = RES(uri);
  var mediaProp = RES(Cx.NS_CX + 'media');
  var mediaRes  = this.model.target(subject, mediaProp);
  if (! mediaRes) {
    mediaRes = RES(uri + '/media');
    this.model.add(subject, mediaProp, mediaRes);
  }

  var container = null;
  if (this.model.isContainer(mediaRes)) {
    container = this.model.container(mediaRes);
  }
  else {
    container = this.model.makeSeq(mediaRes);
  }

  var mediaURI = this.uri + '/media/' + id;
  var res = RES(mediaURI);
  this.model.add(res, RES(Cx.NS_RDF + 'type'),  RES(type));
  this.model.add(res, RES(Cx.NS_DC  + 'title'), LIT(title));
  this.model.add(res, RES(Cx.NS_CX  + 'state'), LIT('downloading'));
  container.append(res);

  return mediaURI;
};


Project.prototype.removeMedia = function (uri, mediaURI) {


};


// Returns the ID for a resource
Project.prototype.getResourceID = function (res) {
  if (! res) return null;

  var uri = res.value;
  return uri.replace(/^.*\//, '');
};


// Completely removes a resource
Project.prototype.deleteResource = function (uri) {
  if (! uri) return false;

  var res = RES(uri);
  var list, i;

  // All statements where res is the object
  list = this.model.find(null, null, res);
  for (i = 0; i < list.length; i++) {
    this.model.remove(list[i][0], list[i][1], list[i][2]);
  }

  // All statements where res is the subject
  list = this.model.find(res, null, null);
  for (i = 0; i < list.length; i++) {
    this.model.remove(list[i][0], list[i][1], list[i][2]);
  }

  return true;
};


Project.prototype.addPropertyListener = function (listener) {
  for (var i = 0; i < this.propertyListeners.length; i++) {
    if (this.propertyListeners[i] == listener)
      return;
  }
  this.propertyListeners.push(listener);
};


Project.prototype.removePropertyListener = function (listener) {
  for (var i = 0; i < this.propertyListeners.length; i++) {
    if (this.propertyListeners[i] == listener) {
      this.propertyListeners.splice(i, 1);
      return;
    }
  }
};


Project.prototype.dispatchPropertyChange = function (property) {
  for (var i = 0; i < this.propertyListeners.length; i++) {
    var listener = this.propertyListeners[i];
    try {
      listener.propertyChanged(this, property);
    }
    catch (ex) {
      dump("*** dispatchPropertyChange: " + ex + "\n");
    }
  }
};


// Accessors for title and description
Project.prototype.title getter = function () {
  var title = this.model.target(this.res, RES(Cx.NS_DC + 'title'));
  return title ? title.value : '';
};

Project.prototype.title setter = function (str) {
  if (str == '') return;

  var titleProp = RES(Cx.NS_DC + 'title');
  var titleRes  = this.model.target(this.res, titleProp);
  var newTitle  = LIT(str);

  if (titleRes) {
    this.model.change(this.res, titleProp, titleRes, newTitle);
    this.manager.notify('change', this.res, titleProp, titleRes, newTitle);
  }
  else {
    this.model.add(this.res, titleProp, newTitle);
    this.manager.notify('add', this.res, titleProp, newTitle);
  }
  this.dispatchPropertyChange("title");

  return str;
};


Project.prototype.description getter = function () {
  var desc = this.model.target(this.res, RES(Cx.NS_DC + 'description'));
  return desc ? desc.value : '';
};


Project.prototype.description setter = function (str) {
  var descProp = RES(Cx.NS_DC + 'description');
  var descRes  = this.model.target(this.res, descProp);
  var newDesc  = LIT(str);

  if (descRes) {
    if (str == '') {
      this.model.remove(this.res, descProp, descRes);
      this.manager.notify('remove', this.res, descProp, descRes);
    }
    else {
      this.model.change(this.res, descProp, descRes, newDesc);
      this.manager.notify('change', this.res, descProp, descRes, newDesc);
    }
  }
  else if (str != '') {
    this.model.add(this.res, descProp, newDesc);
    this.manager.notify('add', this.res, descProp, newDesc);
  }
  this.dispatchPropertyChange("description");

  return str;
};


Project.prototype.author getter = function () {
  // TODO: This should be DC.creator, but we already use that for owner
  var authProp = RES(Cx.NS_CX + 'author');
  var authRes  = this.model.target(this.res, authProp);
  return authRes ? authRes.value : '';
};


Project.prototype.author setter = function (str) {
  var authProp = RES(Cx.NS_CX + 'author');
  var authRes  = this.model.target(this.res, authProp);
  var newAuth  = LIT(str);

  if (authRes) {
    if (str == '') {
      this.model.remove(this.res, authProp, authRes);
      this.manager.notify('remove', this.res, authProp, authRes);
    }
    else {
      this.model.change(this.res, authProp, authRes, newAuth);
      this.manager.notify('change', this.res, authProp, authRes, newAuth);
    }
  }
  else if (str != '') {
    this.model.add(this.res, authProp, newAuth);
    this.manager.notify('add', this.res, authProp, newAuth);
  }
  this.dispatchPropertyChange("author");

  return str;
};


Project.prototype.source getter = function () {
  var srcProp = RES(Cx.NS_DC + 'source');
  var srcRes  = this.model.target(this.res, srcProp);
  return srcRes ? srcRes.value : '';
};


Project.prototype.source setter = function (str) {
  var srcProp = RES(Cx.NS_DC + 'source');
  var srcRes  = this.model.target(this.res, srcProp);
  var newSrc  = LIT(str);

  if (srcRes) {
    if (str == '') {
      this.model.remove(this.res, srcProp, srcRes);
      this.manager.notify('remove', this.res, srcProp, srcRes);
    }
    else {
      this.model.change(this.res, srcProp, srcRes, newSrc);
      this.manager.notify('change', this.res, srcProp, srcRes, newSrc);
    }
  }
  else if (str != '') {
    this.model.add(this.res, srcProp, newSrc);
    this.manager.notify('add', this.res, srcProp, newSrc);
  }
  this.dispatchPropertyChange("source");

  return str;
};


Project.prototype.rights getter = function () {
  var rightsProp = RES(Cx.NS_DC + 'rights');
  var rightsRes  = this.model.target(this.res, rightsProp);
  return rightsRes ? rightsRes.value : '';
};


Project.prototype.rights setter = function (str) {
  var rightsProp = RES(Cx.NS_DC + 'rights');
  var rightsRes  = this.model.target(this.res, rightsProp);
  var newRights  = LIT(str);

  if (rightsRes) {
    if (str == '') {
      this.model.remove(this.res, rightsProp, rightsRes);
      this.manager.notify('remove', this.res, rightsProp, rightsRes);
    }
    else {
      this.model.change(this.res, rightsProp, rightsRes, newRights);
      this.manager.notify('change', this.res, rightsProp, rightsRes, newRights);
    }
  }
  else if (str != '') {
    this.model.add(this.res, rightsProp, newRights);
    this.manager.notify('add', this.res, rightsProp, newRights);
  }
  this.dispatchPropertyChange("rights");

  return str;
};


Project.prototype.contact getter = function () {
  var contactProp = RES(Cx.NS_CX + 'contact');
  var contactRes  = this.model.target(this.res, contactProp);
  return contactRes ? contactRes.value : '';
};


Project.prototype.contact setter = function (str) {
  var contactProp = RES(Cx.NS_CX + 'contact');
  var contactRes  = this.model.target(this.res, contactProp);
  var newContact  = LIT(str);

  if (contactRes) {
    if (str == '') {
      this.model.remove(this.res, contactProp, contactRes);
      this.manager.notify('remove', this.res, contactProp, contactRes);
    }
    else {
      this.model.change(this.res, contactProp, contactRes, newContact);
      this.manager.notify('change', this.res, contactProp, contactRes, newContact);
    }
  }
  else if (str != '') {
    this.model.add(this.res, contactProp, newContact);
    this.manager.notify('add', this.res, contactProp, newContact);
  }
  this.dispatchPropertyChange("contact");

  return str;
};


// TODO: refactor report-related code into Report objects, or somesuch
Project.prototype.toXML = function () {
  // TODO - reimplement
};


// Copy from a 'src' project (that must be open)
Project.prototype.copyFrom = function (src) {
  dump("Project.copyFrom\n");

  var f = this.localPath;

  // Remove the blank script and project files before attempting copyTo
  // (otherwise fails under OS X)
  // TODO: check if this is still necessary, maybe have an overwrite flag
  // on copyFile in util.js
  var sf = IFile(this.scriptURL);
  if (sf.exists()) {
    sf.remove(false);
  }
  var bf = IFile(this.boneyardURL);
  if (bf.exists()) {
    bf.remove(false);
  }
  var pf = IFile(this.dsURL);
  if (pf.exists()) {
    pf.remove(false);
  }

  // Copy the various pieces

  if (! copyFile(src.scriptURL, f.path, Cx.SCRIPT_FILE)) {
    throw new Error("Error copying script file");
  }

  if (! copyFile(src.boneyardURL, f.path, Cx.BONEYARD_FILE)) {
    throw new Error("Error copying boneyard file");
  }

  if (! copyFile(src.dsURL, f.path, Cx.PROJECT_FILE)) {
    throw new Error("Error copying project file");
  }

  if (! this.copyMediaFrom(src)) {
    throw new Error("Error copying project media");
  }

  var oldID = src.getResourceID(src.res);
  var newID = this.getResourceID(this.res);

  // XXX FIXME: use brute force and ignorance to convert paths
  var oldPrefix = new RegExp(Cx.PROJECTS_URL + '/' + oldID, 'g');
  var newPrefix = Cx.PROJECTS_URL + '/' + newID;

  var scriptStr = readFile(this.scriptURL);
  scriptStr = scriptStr.replace(oldPrefix, newPrefix);
  if (! writeFile(scriptStr, this.scriptURL)) {
    throw new Error("Error writing script file");
  }

  var projStr = readFile(this.dsURL);
  projStr = projStr.replace(oldPrefix, newPrefix);
  if (! writeFile(projStr, this.dsURL)) {
    throw new Error("Error writing project file");
  }

};


Project.prototype.copyMediaFrom = function (src) {
  var i, source, file, fileURL, persist;

  var ios   = getIOService();
  var files = src.uploadableFiles;

  for (i = 0; i < files.length; i++) {
    source = IFile(files[i]);
    if (! source.exists()) {
      dump("copyMediaFrom: not found: " + source.path + "\n");
      continue;
    }

    dump("copying: " + source.path);
    file = this.localPath;
    file.append(source.leafName);
    dump(" to: " + file.path + "\n");

    fileURL = ios.newURI(files[i], null, null);
    fileURL = fileURL.QueryInterface(Components.interfaces.nsIURL);

    persist = getWebBrowserPersist();
    persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
    persist.saveURI(fileURL, null, null, null, null, file);
  }
  
  return true;
};


Project.prototype.publishSettings getter = function () {
  var pubModeProp = RES(Cx.NS_CX + 'publishMode');
  var usersProp   = RES(Cx.NS_CX + 'sharedUsers');

  var settings = { project: this, mode: 'private', users: '' };

  var m = this.model;

  var pubMode = m.target(this.res, pubModeProp);
  if (pubMode) settings.mode = pubMode.value;

  var users = m.target(this.res, usersProp);
  if (users) settings.users = users.value;

  return settings;
};


Project.prototype.savePublishSettings = function (settings) {
  dump("Project.savePublishSettings\n");

  var pubModeProp = RES(Cx.NS_CX + 'publishMode');
  var usersProp   = RES(Cx.NS_CX + 'sharedUsers');

  var pubModeVal  = LIT(settings.mode);
  var usersVal    = LIT(settings.users);

  setLiteralProp(this.model, this.res, pubModeProp, pubModeVal);
  setLiteralProp(this.model, this.res, usersProp, usersVal);

  // XXX ensure project URI has rdf type set properly, since the backend
  // needs this to find the project uri reliably. This should ideally be
  // set when the project is created.
  try {
    var typeProp  = RES(Cx.NS_RDF + 'type');
    var projClass = RES(Cx.NS_CX + 'Project');
    if (! this.model.contains(this.res, typeProp, projClass)) {
      dump("Project.savePublishSettings: adding rdf:type of cx:Project\n");
      this.model.add(this.res, typeProp, projClass);
    }
  } catch (ex) { dump(ex) }
};


Project.prototype.setPublishedVersion = function (ver) {
  dump("Project.setPublishedVersion: " + ver + "\n");

  var pubVerProp = RES(Cx.NS_CX + 'publishedVersion');
  var pubVerVal  = LIT(ver);

  setLiteralProp(this.model, this.res, pubVerProp, pubVerVal);
};


// Returns a list of file urlstrings for media associated with the project
Project.prototype.mediaFiles getter = function () {
  var mediaTypes = [ RES(Cx.NS_CX + 'Image'),
                     RES(Cx.NS_CX + 'Video'),
                     RES(Cx.NS_CX + 'Audio') ];
  var typeProp = RES(Cx.NS_RDF + 'type');

  var files = [];
  var i, j, items, id;
  for (i = 0; i < mediaTypes.length; i++) {
    items = this.model.sources(typeProp, mediaTypes[i]);
    for (j = 0; j < items.length; j++) {
      id = this.getResourceID(items[j]);  // leaf name
      files.push(this.fileURLOf(id));
    }
  }

  return files;
};


Project.prototype.uploadableFiles getter = function () {
  var files = this.mediaFiles;
  var forms = ['character', 'scenedet'];
  for (var i in forms) {
    var url = this.formURL(forms[i]);
    if (url.indexOf('file:') == 0) files.push(url);
  }
  files.push(this.boneyardURL, this.scriptURL);

  return files;
};


// Self-test
Project.prototype.checkVersion = function () {
  dump("Project.checkVersion\n");

  var versionProp = RES(Cx.NS_CX + 'fileVersion');
  var version = this.model.target(this.res, versionProp);
  var typeProp = RES(Cx.NS_RDF + 'type');
  var memberProp = RES(Cx.NS_CX + 'member');
  var titleProp = RES(Cx.NS_DC + 'title');
  var descProp = RES(Cx.NS_DC + 'description');
  var i, id, subject;

  if (! version) {
    // Version 'zero', or unversioned file
    
    // Convert localDepictions to typed members of media Seq's
    var picProp   = RES(Cx.NS_CX  + 'localDepiction');
    var mediaProp = RES(Cx.NS_CX  + 'media');
    var imgClass  = RES(Cx.NS_CX  + 'Image');

    var picStmts = this.model.find(null, picProp, null);
    var media, mediaCont, mediaRes;
    for (i = 0; i < picStmts.length; i++) {
      id = picStmts[i][2].value;
      dump("converting localDepiction: " + id + "\n");
      mediaRes = RES(this.uri + '/media/' + id);
      dump("new media uri is: " + mediaRes.value + "\n");

      this.model.add(mediaRes, typeProp, imgClass);

      subject = picStmts[i][0];
      media = this.model.target(subject, mediaProp);
      if (! media) {
        media = RES(subject.value + '/media');
        this.model.add(subject, mediaProp, media);
      }

      if (this.model.isContainer(media)) {
        mediaCont = this.model.container(media);
      }
      else {
        mediaCont = this.model.makeSeq(media);
      }
          
      mediaCont.append(mediaRes);
    }
    
    this.model.add(this.res, versionProp, LIT(Cx.FILE_VERSION));
  }
  else if (version.value == '1.0') {
    dump("version 1.0 detected\n");

    var typeMap = {
      'Character'    : 'Cast',
      'SetDecoration': 'SetDressing',
      'Extra'        : 'Extras',
      'Prop'         : 'Props'
    };

    // Convert types
    var cls;
    var typeStmts = this.model.find(null, typeProp, null);
    for (i = 0; i < typeStmts.length; i++) {
      cls = typeStmts[i][2].value.replace(/^.*\//, '');
      if (typeMap[cls]) {
        dump("changing class " + cls + " to " + typeMap[cls] + "\n");
        this.model.change(typeStmts[i][0],
                          typeProp,
                          typeStmts[i][2],
                          RES(Cx.NS_CX + typeMap[cls]));
      }
    }

    // Process member statements
    var sceneURI, itemURI;
    var itemMap = {};
    var memberStmts = this.model.find(null, memberProp, null);
    for (i = 0; i < memberStmts.length; i++) {
      sceneURI = memberStmts[i][0].value;
      itemURI  = memberStmts[i][2].value;
      if (! itemMap[sceneURI]) itemMap[sceneURI] = [];
      itemMap[sceneURI].push(itemURI);
    }

    var descMap = {};
    var titleRes, descRes;
    var sceneClass = RES(Cx.NS_CX  + 'Scene');
    var sceneStmts = this.model.find(null, typeProp, sceneClass);
    for (i = 0; i < sceneStmts.length; i++) {
      subject  = sceneStmts[i][0];
      titleRes = this.model.target(subject, titleProp);
      descRes  = this.model.target(subject, descProp);
      if (titleRes || descRes) {
        descMap[subject.value] = {
          title: titleRes ? titleRes.value : '',
          desc:  descRes  ? descRes.value  : ''
        };
      }
    }
    
    // XXX KLUDGE for script conversion
    // This modal dialog closes itself when the conversion is finished
    window.openDialog(Cx.CONTENT_PATH + 'convertdialog.xul',
                      '_blank',
                      Cx.MODAL_DIALOG_FLAGS,
                      this.scriptURL,
                      itemMap,
                      descMap,
                      version.value);

    // Tag with new version number
    setLiteralProp(this.model, this.res, versionProp, LIT(Cx.FILE_VERSION));
  }

  // etc...
};


Project.prototype.markupURL getter = function () {
  var markup = this.model.target(this.res, new RDFResource(Cx.NS_CX + 'markup'));
  if (! markup) return Cx.SCHEMA_URL + '#default-markup';
  return markup.value;
};
