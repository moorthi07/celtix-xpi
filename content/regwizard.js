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
  wizard.reg = window.arguments[0];

  wizard.win      = document.documentElement;
  wizard.sb       = document.getElementById('celtx-bundle');
  wizard.org      = document.getElementById('user-org');
  wizard.name     = document.getElementById('user-name');
  wizard.email    = document.getElementById('user-email');
  wizard.username = document.getElementById('user-id');
  wizard.password = document.getElementById('user-password');
  wizard.repeat   = document.getElementById('user-repeat');

  wizard.checkMessage = document.getElementById('check-message');
  wizard.checkResult  = document.getElementById('check-result');
  wizard.meter        = document.getElementById('check-meter');

  wizard.existingUsername = document.getElementById('existing-user-id');
  wizard.existingPassword = document.getElementById('existing-password');
  wizard.existing = false;

  wizard.reserved = '';
  wizard.rewinding = false;

  if (wizard.reg.name != '') wizard.name.value = wizard.reg.name;
  if (wizard.reg.email != '') wizard.email.value = wizard.reg.email;
}


function finished () {
  if (wizard.existing) {
    wizard.reg.username   = wizard.existingUsername.value;
    wizard.reg.password   = wizard.existingPassword.value;
  }
  else {
    wizard.reg.confirmURL = wizard.confirmURL;
    wizard.reg.username   = wizard.username.value;
    wizard.reg.password   = wizard.password.value;
    wizard.reg.name       = wizard.name.value;
    wizard.reg.org        = wizard.org.value;
    wizard.reg.email      = wizard.email.value;
  }
  wizard.reg.canceled     = false;
  wizard.reg.existing     = wizard.existing;
  return true;
}


function canceled () {
  wizard.reg.canceled = true;
  return true;
}


function showStart () {
  // Page appears to get load event before wizard does
  document.getElementById('registration-wizard').canAdvance = true;
  // wizard.win.focus();
  document.documentElement.focus();
}


function showIdentity () {
  wizard.existing = (document.getElementById('registration-mode-deck').
    selectedIndex > 0);
  checkIdentity();
  if (wizard.existing)
    wizard.existingUsername.focus();
  else {
    wizard.name.focus();
  }
}


function checkIdentity () {
  if (wizard.existing)
    wizard.win.canAdvance = (wizard.existingUsername.value != '' &&
                             wizard.existingPassword.value != '');
  else
    wizard.win.canAdvance = (wizard.name.value != '' &&
                             validEmail(wizard.email.value));
}


function toggleRegistrationMode (existing) {
  if (existing) {
    document.getElementById('registration-mode-deck').selectedIndex = 1;
    wizard.win.currentPage.next = 'check-account-page';
  }
  else {
    document.getElementById('registration-mode-deck').selectedIndex = 0;
    wizard.win.currentPage.next = 'show-account-page';
  }
  wizard.existing = existing;
  checkIdentity();
  if (wizard.existing)
    wizard.existingUsername.focus();
  else
    wizard.name.focus();
}


function validEmail (str) {
  if (str == '') return false;
  // TODO: better validation
  if (! str.match(/..*@..*/)) return false;
  return true;
}


function showAccount () {
  checkAccount();
  wizard.username.focus();
}


function checkAccount () {
  wizard.win.canAdvance = (validUsername(wizard.username.value) &&
                           validPassword(wizard.password.value) &&
                           wizard.password.value == wizard.repeat.value);
}


function validUsername (str) {
  if (str == '') return false;
  if (! str.match(/^\w{3,20}$/)) return false;
  if (str.match(/[^a-zA-Z0-9]/)) return false;
  return true;
}


function validPassword (str) {
  if (str == '' || str.length < 5) return false;
  if (str.match(/[^a-zA-Z0-9]/)) return false;
  // TODO: more checks
  return true;
}


function showCheckAccount () {
  setCheckMessage('');
  setCheckResult('');
  wizard.win.focus();
  wizard.meter.value = 0;

  if (wizard.rewinding) {
    // Rewound from Summary page -- skip over this page
    wizard.rewinding = false;
    wizard.win.rewind();
    return;
  }

  if (wizard.existing) {
    wizard.win.canAdvance = false;
    wizard.win.canRewind  = false;
    wizard.meter.value = 20;
    authenticateAs(wizard.existingUsername.value, wizard.existingPassword.value,
      'get-project', checkExistingDone);
    return;
  }
  if (wizard.reserved == wizard.username.value) {
    // Skip over this page
    wizard.win.advance();
  }
  else {
    setCheckMessage(wizard.sb.getFormattedString('usernameCheck',
                                                 [ wizard.username.value ]));
    wizard.win.canAdvance = false;
    wizard.win.canRewind  = false;

    // TODO: also need deadman timer in lieu of onerror

    wizard.meter.value = 20;
    wizard.req = new XMLHttpRequest();
    wizard.req.onload = checkDone;
    var url = wizard.reg.prefix + wizard.username.value;
    dump("POSTing to " + url + "\n");

    wizard.req.open('POST', url);
    wizard.req.send(null);
  }
}


function checkExistingDone (valid) {
  wizard.win.canRewind  = true;
  wizard.win.canAdvance = false;
  if (valid) {
    wizard.meter.value = 100;
    wizard.win.canAdvance = true;
    wizard.reg.username   = wizard.existingUsername.value;
    wizard.reg.password   = wizard.existingPassword.value;
    wizard.win.advance('complete-page');
  }
  else {
    wizard.meter.value = 0;
    wizard.existingPassword.value = null;
    setCheckResult(wizard.sb.getString('LoginFailed'));
  }
}

function checkDone () {
  wizard.meter.value = 100;

  if (wizard.req.status != 200) {
    setCheckMessage(wizard.sb.getFormattedString('usernameNotAvailable',
                                                 [ wizard.username.value ]));
    setCheckResult(wizard.sb.getFormattedString('usernameErrorGoBack',
                                                [ wizard.username.value ]));
    wizard.win.canRewind = true;
    return;
  }

  var resp = wizard.req.responseXML;
  if (resp) {
    wizard.confirmURL = resp.documentElement.firstChild.nodeValue;
    dump("confirmURL: " + wizard.confirmURL + "\n");
  }

  setCheckMessage(wizard.sb.getFormattedString('usernameAvailable',
                                               [ wizard.username.value ]));

  wizard.reserved = wizard.username.value;
  wizard.win.canAdvance = true;
  wizard.win.canRewind = true;
  wizard.win.advance();
}


function setCheckResult (msg) {
  if (wizard.checkResult.hasChildNodes()) {
    wizard.checkResult.removeChild(wizard.checkResult.firstChild);
  }
  if (msg != '') {
    wizard.checkResult.appendChild(document.createTextNode(msg));
  }
}


function setCheckMessage (msg) {
  wizard.checkMessage.value = msg;
}


function showSummary () {
  if (wizard.rewinding) {
    wizard.win.rewind();
    return;
  }
  var none = wizard.sb.getString('none');
  document.getElementById('summary-name').value   = wizard.name.value;
  document.getElementById('summary-email').value  = wizard.email.value;
  document.getElementById('summary-org').value    = wizard.org.value || none;
  document.getElementById('summary-id').value     = wizard.username.value;
}


function showExistingFailed() {
  wizard.win.canAdvance = false;
  wizard.win.canRewind = true;
}

// showSubmission and kin adapted from regdialog.js

var dialog = {};

function showSubmission() {
  wizard.win.canAdvance = false;
  wizard.win.canRewind = false;

  dialog.message = document.getElementById('submit-message');
  dialog.desc    = document.getElementById('submit-desc');
  dialog.meter   = document.getElementById('submit-meter');
  // dialog.close   = document.documentElement.getButton('cancel');

  dialog.registered = false;

  dialog.message.value = wizard.sb.getString('sendingRegInfo');
  dialog.meter.value = 15;

  setTimeout(sendRegistration, 500);
}

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
  reg.setAttribute('about', wizard.confirmURL);
  var FOAF_NS = 'http://xmlns.com/foaf/0.1/';
  var CX_NS = 'http://celtx.com/NS/v1/';
  var RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  reg.setAttributeNS(FOAF_NS, 'name', wizard.name.value);
  reg.setAttributeNS(CX_NS, 'organization', wizard.org.value);
  reg.setAttributeNS(CX_NS, 'password', wizard.password.value);

  var mbox = tmpl.createElementNS(FOAF_NS, 'mbox');
  mbox.setAttributeNS(RDF_NS, 'resource', 'mailto:' + wizard.email.value);
  reg.appendChild(mbox);

  var serializer = new XMLSerializer();  
  var payload = serializer.serializeToString(tmpl);
  // dump("reg payload:\n" + payload + "\n");

  dialog.req = new XMLHttpRequest();
  dialog.req.onload = responseLoaded;
  // dump("POSTing to " + dialog.reg.confirmURL + "\n");

  dialog.req.open('POST', wizard.confirmURL);
  dialog.req.send(payload);
}


function responseLoaded () {
  dialog.meter.value = 100;

  if (dialog.req.status == 200) {
    dialog.registered = true;
    dialog.message.value = wizard.sb.getString('regSuccessMsg');
    setDescription(wizard.sb.getString('regSuccessDesc'));
    wizard.win.canAdvance = true;
    wizard.win.advance();
  }
  else {
    dialog.message.value = wizard.sb.getString('regFailureMsg');
    setDescription(wizard.sb.getString('regFailureDesc'));
    wizard.win.canRewind = true;
  }
}

function showCompletion () {
  wizard.win.canAdvance = true;
  wizard.win.canRewind  = false;
}

