
var win = {};

function ValidateLocation(location)
{
  return (location != null && location.exists() && location.isDirectory());
}

function Loaded()
{
  win.pm        = window.arguments[0];
  win.result    = window.arguments[1];
  setWindowTitle(window.arguments[2]);
  win.okbutton  = document.documentElement.getButton("accept");
  win.name      = document.getElementById("name-textbox");
  win.location  = document.getElementById("location-textbox");
  win.warndeck  = document.getElementById("warning-deck");
  win.strings   = document.getElementById("celtx-stringbundle");
  win.folderimg = document.getElementById("location-image");
  try
  {
    var svc = getPrefService();
    try
    {
      win.locfile = IFile(svc.getCharPref("celtx.projectsdirectory"));
    }
    catch (ex)
    {
      win.locfile = userDocsDir();
    }
    if (! ValidateLocation(win.locfile))
      throw win.locfile.path + " is not a directory";
    win.location.value = win.locfile.leafName;
    win.location.setAttribute("tooltiptext", win.locfile.path);
  }
  catch (ex)
  {
    dump("*** Loaded: " + ex + "\n");
    win.locfile = null;
    win.folderimg.setAttribute("disabled", true);
  }
  if (window.arguments.length > 3 && window.arguments[3])
    win.name.value = sanitizeFilename(window.arguments[3]);

  ValidateInput();
}

function Accepted()
{
  const kDirType = 1;
  if (ValidateLocation(win.locfile) &&
      document.getElementById("savedircheckbox").checked)
    getPrefService().setCharPref("celtx.projectsdirectory", win.locfile.path);
  try
  {
    var destdir = win.locfile.clone();
    destdir.normalize();
    destdir.append(win.name.value);
    // Confirm replacement of existing directories
    if (destdir.exists())
    {
      // TODO: Prevent replacement of open projects.
      var title = win.strings.getString("ReplaceDirectory");
      var msg = win.strings.getString("ConfirmReplaceDirectory");
      var result = confirmOKCancel(title, msg);
      if (result == kConfirmCancel)
        return false;

      var projfile = destdir.clone();
      projfile.append(Cx.PROJECT_FILE);
      if (projfile.exists())
      {
        var res = null;
        try
        {
          var projmodel = new RDFModel(pathToFileURL(projfile.path));
          res = projmodel.source(RES(Cx.NS_RDF + "type"),
            RES(Cx.NS_CX + "Project"));
          if (! res) {
            var scenes = new RDFResource(Cx.NS_CX + 'scenes');
            var triples = projmodel.find(null, scenes, null);
            if (triples.length != 1)
              throw "Invalid project file: " + projfile.path;
            res = triples[0][0];
          }
          win.pm.deleteProject(res.value);
        }
        catch (ex)
        {
          dump("*** Accepted: " + ex + "\n");
          if (res)
          {
            var projectsRes = RES(Cx.LOCAL_PROJECTS);
            var container   = win.pm.model.makeSeq(projectsRes);
            container.remove(res);
          }
          destdir.remove(true);
        }
      }
      else
        destdir.remove(true);
    }
    win.result.canceled = false;
    win.result.projdir = destdir;
    return true;
  }
  catch (ex)
  {
    dump("*** Accepted: " + ex + "\n");
    return false;
  }
}

function Canceled()
{
  win.result.canceled = true;
  win.result.projdir = null;
  return true;
}

function Browse()
{
  const IFP = Components.interfaces.nsIFilePicker;
  var fp = getFilePicker();
  fp.init(window, null, IFP.modeGetFolder);
  fp.appendFilters(IFP.filterAll);
  if (win.locfile && win.locfile.exists() && win.locfile.isDirectory())
    fp.displayDirectory = win.locfile;
  if (fp.show() == IFP.returnCancel)
    return;
  win.locfile = fp.file;
  win.location.value = win.locfile.leafName;
  win.location.tooltiptext = win.locfile.path;
  if (ValidateLocation(win.locfile))
    win.folderimg.removeAttribute("disabled");
  else
    win.folderimg.setAttribute("disabled", true);
  ValidateInput();
}

function ValidateInput()
{
  if (win.name.value == "")
  {
    win.okbutton.setAttribute("disabled", "true");
    win.warndeck.selectedIndex = 0;
  }
  else
  {
    try
    {
      if (! isValidFilename(win.name.value))
        throw "Invalid filename";
      var destdir = win.locfile.clone();
      destdir.normalize();
      destdir.append(win.name.value);
      win.okbutton.removeAttribute("disabled");
      win.warndeck.selectedIndex = 0;
    }
    catch (ex)
    {
      win.okbutton.setAttribute("disabled", "true");
      win.warndeck.selectedIndex = 1;
    }
  }
}

function RevealLocation()
{
  if (win.folderimg.getAttribute("disabled") == "true")
    return;
  win.locfile.reveal();
}

