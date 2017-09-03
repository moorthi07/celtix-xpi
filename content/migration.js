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

var wizard = {};


function loaded () {
  wizard.arg = window.arguments[0];

  wizard.sb = document.getElementById('celtx-bundle');

  wizard.win       = document.documentElement;
  wizard.options   = document.getElementById('import-options');
  wizard.importMsg = document.getElementById('import-message');
  wizard.meter     = document.getElementById('import-meter');
  wizard.doneMsg   = document.getElementById('done-message');

  wizard.importCount = 0;
}


function finished () {
  wizard.arg.canceled = false;
  return true;
}


function canceled () {
  wizard.arg.canceled = true;
  return true;
}


function showStart () {
  wizard.win.canAdvance = true;
}


function showOptions () {
  wizard.win.canAdvance = wizard.options.selectedIndex != -1;
}


function optionSelected () {
  wizard.win.canAdvance = true;
}


function showMigrating () {
  if (wizard.options.value == '1') {
    migrateProjects();
  }
  else {
    wizard.win.advance();
  }
}


function showDone () {
  wizard.win.canRewind = false;

  var n = wizard.importCount;
  if (n == 0) {
    wizard.doneMsg.value = wizard.sb.getString('impNoProjects');
  }
  else {
    wizard.doneMsg.value = (
      n > 1 ? wizard.sb.getFormattedString('impManyProjects', [ n ])
            : wizard.sb.getString('impOneProject') );
  }
}



function migrateProjects () {
  wizard.win.canAdvance = false;
  wizard.win.canRewind = false;

  wizard.importMsg.value = wizard.sb.getString('startingImport');

  var transform = document.implementation.createDocument('', 'migrate', null);
  transform.async = false;
  transform.load(Cx.CONTENT_PATH + 'migrate.xml');
  wizard.transform = transform;
  
  var typeProp    = RES(Cx.NS_RDF + 'type');
  var projClass   = RES(Cx.NS_CX  + 'Project');
  var createdProp = RES(Cx.NS_DC  + 'created')
  var titleProp   = RES(Cx.NS_DC + 'title');
  var descProp    = RES(Cx.NS_DC + 'description');

  var pmModel = wizard.arg.manager.model;
  pmModel.reload();

  try {
    var projectsRes = RES(Cx.LOCAL_PROJECTS);
    var container   = null;
    if (pmModel.isContainer(projectsRes)) {
      container = pmModel.container(projectsRes);
    }
    else {
      container = pmModel.makeSeq(projectsRes);
    }

    var repos = new RDFModel(pathToFileURL(wizard.arg.file.path));

    var projects = repos.sources(typeProp, projClass);

    var proj;
    var meterIncr = projects.length ? Math.ceil(100 / projects.length) : 0;
    for (var i = 0; i < projects.length; i++) {
      if (proj = migrate(projects[i].value)) {
        dump("migrated project\n");
        pmModel.add(proj.res, typeProp, projClass);
        pmModel.add(proj.res, createdProp, LIT(isoDateTime()));
        pmModel.add(proj.res,
                    titleProp,
                    proj.title ? proj.title : wizard.sb.getString('untitled'));
        if (proj.description) pmModel.add(proj.res, descProp, proj.description);

        // Add project to local sequence
        container.append(proj.res);

        wizard.importCount++;
      }
      wizard.meter.value += meterIncr;
    }

    repos.destroy();
  }
  catch (ex) {
    dump("migrateProjects: " + ex + "\n");
  }

  pmModel.save();

  wizard.importMsg.value = wizard.sb.getString('importComplete');
  wizard.meter.value = 100;
  wizard.win.canAdvance = true;
  wizard.win.advance();
}


function migrate (uri) {
  dump("migrating: " + uri + "\n");

  var id = uri.replace(/^.*\//, '');

  var baseDir = wizard.arg.file.parent.clone();
  baseDir.append(id);

  dump("baseDir: " + baseDir.path + "\n");

  projFile = baseDir.clone();
  projFile.append(Cx.PROJECT_FILE);

  var model = new RDFModel(pathToFileURL(projFile.path));
  var title = model.target(RES(uri), RES(Cx.NS_DC + 'title'));
  dump("  title: " + title.value + "\n");

  wizard.importMsg.value = wizard.sb.getFormattedString('importingProject',
                                                        [ title.value ]);

  var scriptFile = baseDir.clone();
  scriptFile.append(Cx.SCRIPT_XML_FILE);
  if (! scriptFile.exists()) return null;

  dump("  script file: " + scriptFile.path + "\n");

  var scriptDoc = document.implementation.createDocument('', 'script', null);
  scriptDoc.async = false;
  scriptDoc.load(pathToFileURL(scriptFile.path));

  // Add notes to script DOM from RDF model
  var typeProp      = RES(Cx.NS_RDF  + 'type');
  var noteClass     = RES(Cx.NS_NOTE + 'Annotation');
  var contextProp   = RES(Cx.NS_NOTE + 'context');
  var bodyProp      = RES(Cx.NS_NOTE + 'body');

  var context, body, i, j;
  var notes = model.sources(typeProp, noteClass);
  for (i = 0; i < notes.length; i++) {
    context = model.target(notes[i], contextProp).value;
    body    = model.target(notes[i], bodyProp).value;
    if (context.match(/^xpath1\((.*)\)$/)) {
      addNote(scriptDoc, RegExp.$1, body);
    }
  }

  var proc = new XSLTProcessor();
  proc.importStylesheet(wizard.transform);

  var newScriptDoc = proc.transformToDocument(scriptDoc);

    // DEBUG - save to tmp file
//     var tmp = tempFile(generateID() + '.html');
//     dump("  html path is: " + tmp + "\n");
//     serializeDOMtoFile(newScriptDoc, tmp);

  // Init the new project directory
  var projDir = wizard.arg.manager.initProjectDir(id);

  // The new model
  var newProjFile = projDir.clone();
  newProjFile.append(Cx.PROJECT_FILE);
  
  dump("\nabout to create model\n");
  var projModel = new RDFModel(pathToFileURL(newProjFile.path),
                               RDFModel.prototype.LOAD_CREATE);

  // Copy base project metadata
  var projRes       = RES(uri);
  var projClass     = RES(Cx.NS_CX + 'Project');
  var locClass      = RES(Cx.NS_CX + 'Location');
  var sceneClass    = RES(Cx.NS_CX + 'Scene');
  var titleProp     = RES(Cx.NS_DC + 'title');
  var descProp      = RES(Cx.NS_DC + 'description');
  var locProp       = RES(Cx.NS_CX + 'location');
  var appearsInProp = RES(Cx.NS_CX + 'appearsIn');
  var memberProp    = RES(Cx.NS_CX + 'member');
  var picProp       = RES(Cx.NS_CX + 'localDepiction');
  var labelProp     = RES(Cx.NS_RDFS + 'label');
  var commentProp   = RES(Cx.NS_RDFS + 'comment');

  projModel.add(projRes, typeProp, projClass);

  var titleRes = model.target(projRes, titleProp);
  if (titleRes) projModel.add(projRes, titleProp, titleRes);

  var descRes  = model.target(projRes, descProp);
  if (descRes) projModel.add(projRes, descProp, descRes);

  var scenesRes = RES(uri + '/scenes/' + generateID());
  projModel.add(projRes, RES(Cx.NS_CX + 'scenes'), scenesRes);

  var scenesSeq = projModel.makeSeq(scenesRes);

  // Process the scenes in the script DOM
  var xpe  = new XPathEvaluator();
  var xset = xpe.evaluate('/html/body/div[@class="scene"]',
                          newScriptDoc, null, 0, null);
  var div;
  var ref, sceneRes, label, loc, locRes;
  while (div = xset.iterateNext()) {
    ref = div.getAttribute('ref');
    if (! ref) continue;

    dump("  processing scene " + ref + "\n");

    sceneRes = RES(ref);
    projModel.add(sceneRes, typeProp, sceneClass);

    label = div.getAttribute('label');
    if (label) {
      projModel.add(sceneRes, titleProp, LIT(label));
    }

    // Process the location for the scene
    loc = findLocation(div);
    if (loc) {
      locRes = RES(uri + '/location/' + generateID());
      projModel.add(locRes, typeProp, locClass);
      projModel.add(locRes, titleProp, LIT(loc));
      projModel.add(sceneRes, locProp, locRes);
    }
    
    // Process elements within scene
    var itemRes, itemType, labelRes, commentRes, picResList;
    var items = model.sources(appearsInProp, sceneRes);
    for (i = 0; i < items.length; i++) {
      itemRes = items[i];
      itemType = model.target(itemRes, typeProp);
      if (! itemType) continue;

      if (itemType.value != locClass.value) {
        projModel.add(itemRes, typeProp, itemType);
        projModel.add(sceneRes, memberProp, itemRes);

        labelRes = model.target(itemRes, labelProp);
        if (labelRes) projModel.add(itemRes, titleProp, labelRes);

        commentRes = model.target(itemRes, commentProp);
        if (commentRes) projModel.add(itemRes, descProp, commentRes);
      }
      
      picResList = model.targets(itemRes, picProp);
      if (! picResList) continue;

      for (j = 0; j < picResList.length; j++) {
        if (itemType.value == locClass.value) {
          // Depictions of locations are added to the scene
          projModel.add(sceneRes, picProp, picResList[j]);
        }
        else {
          projModel.add(itemRes, picProp, picResList[j]);
        }
      }

    }

    // Finally, add the scene to the container
    scenesSeq.append(sceneRes);
  }

  // Save the new script
  var newScriptFile = projDir.clone();
  newScriptFile.append(Cx.SCRIPT_FILE);
  serializeDOMtoFile(newScriptDoc, newScriptFile.path);

  // Copy depiction resources from old 'res' directory
  var resDir = baseDir.clone();
  resDir.append('res');
  if (resDir.exists()) {
    var picStmts = model.find(null, picProp, null);
    var pic;
    for (i = 0; i < picStmts.length; i++) {
      pic = picStmts[i][2].value;
      dump("  copying " + pic + "\n");
      var srcFile = resDir.clone();
      srcFile.append(pic);
      if (! copyFile(pathToFileURL(srcFile.path), projDir.path, pic)) {
        dump("Error copying image file: " + pic + "\n");
      }
    }
  }
  
  model.destroy();
  projModel.destroy();

  var proj = {
    res: projRes,
    title: titleRes,
    description: descRes
  };

  return proj;
}


function addNote (doc, xpath, text) {
  var xpe  = new XPathEvaluator();
  var xset = xpe.evaluate(xpath, doc, null, 0, null);
  var elem = xset.iterateNext();
  if (elem) {
    var note = doc.createElement('note');
    note.setAttribute('text', text);
    note.setAttribute('id', generateID());
    elem.appendChild(note);
  }
}


function findLocation (div) {
  var paras = div.getElementsByTagName('p');
  var p;
  for (var i = 0; i < paras.length; i++) {
    p = paras[i];
    if (p.getAttribute('class') == 'sceneheading') {
      return gatherTextUnder(p);
    }
  }
  return '';
};
