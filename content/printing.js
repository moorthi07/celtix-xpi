
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

var ScriptPrinting = {

  pageSetup: function () {
    try {
      PrintUtils.showPageSetup();
    }
    catch (ex) {
      dump("*** ScriptPrinting.pageSetup: " + ex + "\n");
    }
  },

  printPreview: function (script) {
    /*
    try {
      var uri = this.makePrintable(script);
      var svc = Components.classes['@mozilla.org/gfx/printsettings-service;1'].
        getService(Components.interfaces.nsIPrintSettingsService);
      var settings = svc.globalPrintSettings;
      settings.title = app.project.title;
      svc.savePrintSettingsToPrefs(settings, false, settings.kInitSaveAll);
      window.openDialog(Cx.CONTENT_PATH + 'printpreview.xul',
        'printpreview', Cx.NEW_WINDOW_FLAGS, uri);
    }
    catch (ex) {
      dump("*** ScriptPrinting.printPreview: " + ex + "\n");
    }
    */
    try {
      PrintUtils.printPreview(null, null);
    }
    catch (ex) {
      dump("*** ScriptPrinting.printPreview: " + ex + "\n");
    }
  },

  print: function (script) {
    try {
      /*
      var uri = this.makePrintable(script);
      var svc = Components.classes['@mozilla.org/gfx/printsettings-service;1'].
        getService(Components.interfaces.nsIPrintSettingsService);
      var settings = svc.globalPrintSettings;
      settings.title = app.project.title;
      svc.savePrintSettingsToPrefs(settings, false, settings.kInitSaveAll);
      window.openDialog(Cx.CONTENT_PATH + 'printscript.xul',
        'printscript', Cx.NEW_WINDOW_FLAGS, uri);
      */
      PrintUtils.print();
    }
    catch (ex) {
      dump("*** ScriptPrinting.print: " + ex + "\n");
    }
  },

  getGlobalPrintSettings: function () {
    var svc = Components.classes['@mozilla.org/gfx/printsettings-service;1'].
      getService(Components.interfaces.nsIPrintSettingsService);
    var settings = svc.globalPrintSettings;
    try {
      if (!settings.printerName)
        settings.printerName = svc.defaultPrinterName;
      svc.initPrintSettingsFromPrinter(settings.printerName, settings);
    } catch (ex) {}
    try {
      svc.initPrintSettingsFromPrefs(settings, true, settings.kInitSaveAll);
    } catch (ex) {}
    return settings;
  },

  setGlobalPrintSettings: function () {
    try
    {
      var svc = Components.classes['@mozilla.org/gfx/printsettings-service;1'].
        getService(Components.interfaces.nsIPrintSettingsService);
      var settings = ScriptPrinting.getGlobalPrintSettings();
      // Header/Footer special symbols:
      // &D - Current Date/Time
      // &PT - Page Number of Page Total
      // &P - Page Number Only
      // &T - Document Title
      // &U - Document URL
      settings.headerStrRight = '';
      settings.headerStrCenter = '';
      settings.headerStrLeft = '';
      settings.footerStrRight = '';
      settings.footerStrCenter = '';
      settings.footerStrLeft = '';
      settings.marginTop = 0.8;
      settings.marginRight = isWin() ? 0.6 : 0.8;
      settings.marginBottom = 0.8;
      settings.marginLeft = 0.8;
      settings.printBGColors = false;
      settings.printBGImages = false;
      settings.shrinkToFit = false;
      svc.savePrintSettingsToPrefs(settings, false,
        Components.interfaces.nsIPrintSettings.kInitSaveAll);
    }
    catch (ex)
    {
      dump("setGlobalPrintSettings: " + ex + "\n");
    }
  },

  // Private functions

  makePrintable: function (script)
  {
    app.saveScript();
    var xslFile = Cx.TRANSFORM_PATH + 'script.xml';
    try {
      var xsl = document.implementation.createDocument('', '', null);
      xsl.async = false;
      xsl.load(xslFile);

      // Serialize to temp file
      var proc = new XSLTProcessor();
      proc.importStylesheet(xsl);

      // TODO title page: set to '0' or '1' based on user preference
      proc.setParameter(null, 'show-title-page', '1');

      var dom = app.editor.editor.document;
      var doc = proc.transformToDocument(dom);

      // Convert newlines in div tags to <br /> elements
      var titlepage = null;
      var divs = doc.getElementsByTagName('div');
      for (var i = 0; i < divs.length; ++i) {
        if (divs[i].className == 'title-page') {
          titlepage = divs[i];
          break;
        }
      }
      if (titlepage) {
        divs = titlepage.getElementsByTagName('div');
        for (var i = 0; i < divs.length; ++i) {
          var div = divs[i];
          if (div.hasChildNodes() && div.firstChild.nodeType == div.TEXT_NODE)
            convertNewlinesInTextNode(div.firstChild);
        }
      }

      var path = tempFile(generateID() + '.html');
      if (serializeDOMtoFile(doc, path)) {
        return 'file://' + path;
      }
    }
    catch (ex) {
      dump("makePrintable: " + ex + "\n");
      throw ex;
    }
  }

};

