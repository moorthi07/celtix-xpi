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


// TODO: i18n of messages & status

var dialog = {};


function loaded () {
  dialog.reg     = window.arguments[0];
  dialog.sb      = document.getElementById('celtx-bundle');

  dialog.message = document.getElementById('message');
  dialog.desc    = document.getElementById('desc');
  dialog.meter   = document.getElementById('meter');
  dialog.close   = document.documentElement.getButton('cancel');

  dialog.registered = false;

  msg(dialog.sb.getString('sendingRegInfo'));
  dialog.meter.value = 15;

  setTimeout(sendRegistration, 500);
}


function closed () {
  if (! dialog.registered) dialog.reg.canceled = true;
}


function msg (s) { dialog.message.value = s; }


function setDescription (msg) {
  if (dialog.desc.hasChildNodes()) {
    dialog.desc.removeChild(dialog.desc.firstChild);
  }
  if (msg != '') {
    dialog.desc.appendChild(document.createTextNode(msg));
  }
}


// TODO: deadman timer since onerror doesn't work yet

function sendRegistration () {
  // TODO: build a proper RDF model

  // Registration payload template
  var tmpl = document.implementation.createDocument('', 'register', null);
  tmpl.async = false;
  tmpl.load(Cx.CONTENT_PATH + 'register-rdf.xml');

  var reg = tmpl.documentElement.firstChild;
  reg.setAttribute('about', dialog.reg.confirmURL);
  var FOAF_NS = 'http://xmlns.com/foaf/0.1/';
  var CX_NS = 'http://celtx.com/NS/v1/';
  var RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  reg.setAttributeNS(FOAF_NS, 'name', dialog.reg.name);
  reg.setAttributeNS(CX_NS, 'organization', dialog.reg.org);
  reg.setAttributeNS(CX_NS, 'password', dialog.reg.password);

  var mbox = tmpl.createElementNS(FOAF_NS, 'mbox');
  mbox.setAttributeNS(RDF_NS, 'resource', 'mailto:' + dialog.reg.email);
  reg.appendChild(mbox);

  var serializer = new XMLSerializer();  
  var payload = serializer.serializeToString(tmpl);
  // dump("reg payload:\n" + payload + "\n");

  dialog.req = new XMLHttpRequest();
  dialog.req.onload = responseLoaded;
  // dump("POSTing to " + dialog.reg.confirmURL + "\n");

  dialog.req.open('POST', dialog.reg.confirmURL);
  dialog.req.send(payload);
}


function responseLoaded () {
  dialog.meter.value = 100;

  if (dialog.req.status == 200) {
    dialog.registered = true;
    msg(dialog.sb.getString('regSuccessMsg'));
    setDescription(dialog.sb.getString('regSuccessDesc'));
  }
  else {
    msg(dialog.sb.getString('regFailureMsg'));
    setDescription(dialog.sb.getString('regFailureDesc'));
  }

  dialog.close.label = dialog.sb.getString('Close');
}
