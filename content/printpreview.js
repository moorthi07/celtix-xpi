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

var win = { numPages: null };

function getBrowser()
{
  return document.getElementById('content');
}

function loaded()
{
  if (window.arguments.length == 0)
  {
    dump("*** printpreview.xul opened without any url\n");
    return;
  }
  var uri = window.arguments[0];
  if (!uri)
    return;

  if (window.arguments.length > 1)
    win.numPages = window.arguments[1];
  else
    win.numPages = { value: -1 };

  var listener =
  {
    haveResponded: false,
    QueryInterface: function(iid)
    {
      if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
          iid.equals(Components.interfaces.nsISupportsWeakReference) ||
          iid.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },
    onLocationChange: function(a, b, c) {},
    onProgressChange: function(a, b, c, d, e, f) {},
    onSecurityChange: function(a, b, c) {},
    onStatusChange: function(a, b, c, d) {},
    onStateChange: function(progress, request, flags, status)
    {
      // dump("onStateChange(flags == " + flags + ", status == " + status + ")\n");
      if (this.haveResponded)
        return;
      // FIXME: I've had it fail to set the STATE_IN_WINDOW flag before.
      const WindowStopFlags = 0x00080000 | 0x00000010;
      if ((flags & WindowStopFlags) != WindowStopFlags)
        return;
      if (status != 0)
      // TODO: Signal error condition
        return;
      this.haveResponded = true;
      window.setTimeout('createPreview();', 100);
    }
  };
  var browser = document.getElementById('content');
  browser.addProgressListener(listener);
  browser.loadURI(uri, null, 'utf-8');
}

function createPreview()
{
  var listener =
  {
    QueryInterface: function(iid)
    {
      if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
          iid.equals(Components.interfaces.nsISupportsWeakReference) ||
          iid.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_NOINTERFACE;
    },
    onLocationChange: function(a, b, c) {},
    onProgressChange: function(a, b, c, d, e, f) {},
    onSecurityChange: function(a, b, c) {},
    onStatusChange: function(a, b, c, d) {},
    onStateChange: function(progress, request, flags, status)
    {
      dump("onStateChange(flags == " + flags + ", status == " + status + ")\n");

      const DocumentStopFlags = 0x00020000 | 0x00000010;
      if ((flags & DocumentStopFlags) == DocumentStopFlags)
        window.setTimeout('previewLoaded()', 100);
    }
  };

  PrintUtils.printPreview(null, function () { window.close(); } );
}

function previewLoaded()
{
  try
  {
    var browser = document.getElementById('content');
    var viewer = browser.docShell.contentViewer;
    var print = viewer.QueryInterface(Components.interfaces.nsIWebBrowserPrint);

    win.numPages.value = print.printPreviewNumPages;
    dump("*** numPages.value == " + win.numPages.value + "\n");
  }
  catch (ex)
  {
    dump("*** previewLoaded: " + ex + "\n");
  }
}

