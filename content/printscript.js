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

var win = { uri: null };

function getBrowser()
{
  return document.getElementById('content');
}

function loaded()
{
  if (window.arguments.length == 0 ||
    ! window.arguments[0])
  {
    dump("*** printscript.xul opened without any url\n");
//     window.setTimeout('window.close()', 100);
//     return;
  }
  win.uri = window.arguments[0];
  window.setTimeout('lowerWindowAndPrint()', 100);
}

function lowerWindow() {
  try {
    const lowestZ = 0;
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].
      getService(Components.interfaces.nsIWindowMediator);
    var printwin = wm.getXULWindowEnumerator('celtx:print').getNext();
    printwin = printwin.QueryInterface(Components.interfaces.nsIXULWindow);
    printwin.zLevel = lowestZ;
  }
  catch (ex) { dump("Couldn't lower window: " + ex + "\n"); }
}

function lowerWindowAndPrint()
{
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

      // Do this too early and the window will come back into focus, so it can't
      // be done until this point.
      lowerWindow();
      window.setTimeout('printContentsAndClose();', 100);
    }
  };

  var browser = document.getElementById('content');
  browser.addProgressListener(listener);
  browser.loadURI(win.uri, null, 'utf-8');
}

function printContentsAndClose()
{
  PrintUtils.print();
  // XXX: Linux prints asynchronously and Celtx will crash if the document to
  // be printed disappears before it has been spooled for printing.
  if (isMac() || isWin())
    window.setTimeout('window.close()', 100);
}

