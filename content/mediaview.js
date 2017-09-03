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


var win =
{
    deck: null,
    img: null,
    embed: null,
    uri: null,
    sb: null
};

function display ()
{
    var suffix = win.uri.match(/.*\.(\w+)$/);
    if (!suffix)
    {
        dump("No suffix on " + win.uri + "\n");
        return;
    }
    suffix = suffix[1].toLowerCase();
    var type = typeForSuffix(suffix);
    if (type == 'video' || type == 'audio')
    {
        win.embed.src = win.uri;
        // Force a refresh
        var parent = win.embed.parentNode;
        parent.replaceChild(win.embed, win.embed);
    }
    else if (type == 'image')
    {
        win.deck.selectedIndex = 1;
        win.img.src = win.uri;
    }
    else
    {
        window.setTimeout("alert(win.sb.getFormattedString("
            + "'pluginNotFound', [ \"" + suffix + "\" ]));", 200);
        return;
    }
}

function loaded ()
{
    win.uri = window.arguments[0];
    win.deck = document.getElementById('media-deck');
    win.img = document.getElementById('media-image');
    win.embed = document.getElementById('media-embed');
    win.sb = document.getElementById('celtx-bundle');
    display();
}

