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

const CHUNK_DELAY = 100;
const CHUNK_COUNT = 20;
const CHUNK_MIN   = 50;
const CHUNK_MAX   = 200;

const MODE_UNDETERMINED = -1;
const MODE_SCREENPLAY = 0;
const MODE_STAGEPLAY = 1;
const MODE_FLUSH_SCREENPLAY = 2; // MODE_SCREENPLAY without left margins


function parse_script (txt, progressFn, completeFn) {

  var heap = {
    lines: [],
    state: new State(),
    lineparse: /^( *)(.*)$/,
    progress: progressFn,
    complete: completeFn,
    lmargin: -1,
    rmargin: 0,
    cmargin: 0,
    dmargin: 0,
    pmargin: 0,
    count: 0,
    limit: 0,
    chunkSize: 0,
    mode: MODE_UNDETERMINED
  };

  heap.lines = txt.split('\n');
  heap.limit = heap.lines.length;

  var n = Math.ceil(heap.limit / CHUNK_COUNT);
      n = Math.max(n, CHUNK_MIN);
      n = Math.min(n, CHUNK_MAX);
  heap.chunkSize = n;

  heap.progress(0.10);  // Arbitrary

  setTimeout(parse_script_chunk, CHUNK_DELAY, heap);
}


function is_heading (text, offset, heap) {
  if (heap.mode == MODE_SCREENPLAY) {
    return offset == heap.lmargin
        && text == text.toUpperCase();
  }
  else if (heap.mode == MODE_FLUSH_SCREENPLAY) {
    return (text == text.toUpperCase()
        &&  (text.match(/^[0-9 ]*INT/) || text.match(/^[0-9 ]*EXT/)));
  }
  else if (heap.mode == MODE_STAGEPLAY) {
    return text.match(/^SCENE [IVXLC]+/)
        || text.match(/^ACT [IVXLC]+/);
  }
  else { // MODE_UNDETERMINED
    // The scene heading tells us the most about the type of script
    if (text.match(/^ACT [IVXLC]+/) ||
        text.match(/^SCENE [IVXLC]+/)) {
      change_state(heap, MODE_STAGEPLAY);
      return true;
    }
    else if (text == text.toUpperCase())
      if (offset > 0 && offset < 20) {
        change_state(heap, MODE_SCREENPLAY);
        return true;
      }
      else if (offset == 0 && (text.match(/^[0-9 ]*INT/)
          || text.match(/^[0-9 ]*EXT/))) {
      change_state(heap, MODE_FLUSH_SCREENPLAY);
      return true;
    }
  }
  return false;
}


function is_action (text, offset, heap) {
  if (heap.mode == MODE_SCREENPLAY) {
    return (offset == heap.lmargin
        &&  text != text.toUpperCase()
        &&  ! text.match(/^\(.*\)/));
  }
  else if (heap.mode == MODE_FLUSH_SCREENPLAY) {
    return text != text.toUpperCase();
  }
  else if (heap.mode == MODE_STAGEPLAY) {
    return (offset == heap.lmargin
        &&  text.match(/^\[.*\]$/));
  }
  else {
    if (offset == heap.lmargin &&
        text.match(/^\[.*\]$/)) {
      change_state(heap, MODE_STAGEPLAY);
      return true;
    }
  }
  return false;
}


function is_character (text, offset, heap) {
  if (heap.mode == MODE_SCREENPLAY) {
    return (offset == heap.cmargin);
  }
  else if (heap.mode == MODE_FLUSH_SCREENPLAY) {
    return (text == text.toUpperCase()
        && ! (text.match(/^[0-9 ]*INT/) || text.match(/^[0-9 ]*EXT/)));
  }
  else if (heap.mode == MODE_STAGEPLAY) {
    return (offset == heap.lmargin
        &&  text.match(/^[A-Z ]+\.$/));
  }
  else { // MODE_UNDETERMINED
    if (text.match(/^[A-Z ]+\.$/) &&
        offset == heap.lmargin) {
      change_state(heap, MODE_STAGEPLAY);
      return true;
    }
    else if (text == text.toUpperCase()
        &&   offset == heap.cmargin
        &&   offset > heap.lmargin) {
      change_state(heap, MODE_SCREENPLAY);
      return true;
    }
  }
  return false;
}


function is_dialog (text, offset, heap) {
  if (heap.mode == MODE_SCREENPLAY) {
    return offset == heap.dmargin;
  }
  else if (heap.mode == MODE_FLUSH_SCREENPLAY) {
    return ((heap.state.state == "character" && text != text.toUpperCase()
                                             && ! text.match(/^\(/))
        ||  (heap.state.state == "paren" && ! text.match(/\)$/)));
  }
  else if (heap.mode == MODE_STAGEPLAY) {
    if (heap.state.state == 'character' ||
        (heap.state.state == 'dialog' && ! text.match(/^\[.*\]$/)))
      return true;
  }
  return false;
}


function is_parenthetical (text, offset, heap) {
  if (heap.mode == MODE_SCREENPLAY) {
    return offset == heap.pmargin;
  }
  else if (heap.mode == MODE_FLUSH_SCREENPLAY) {
    return text.match(/^\(.*\)$/);
  }
  else if (heap.mode == MODE_STAGEPLAY) {
    return false;
  }
  else { // MODE_UNDETERMINED
    if (text.match(/^\(.*\)$/)) {
      change_state(heap, offset > heap.lmargin ? MODE_SCREENPLAY
                                               : MODE_FLUSH_SCREENPLAY);
      return true;
    }
  }
  return false;
}


function change_state (heap, state) {
  heap.mode = state;
}


function parse_script_chunk (heap) {

  for (var i = 0; i < heap.chunkSize; i++) {
    if (heap.lines.length == 0) {
      heap.state.dispatch('ws', null);
      heap.complete(heap.state.dom);
      return;
    }

    heap.count++;

    var str    = heap.lines.shift();
    var m      = heap.lineparse.exec(str);
    var offset = m[1].length;
    var text   = m[2];

    text = cleanup(text);

    if (text == "")
      continue;

    // Margin determination
    if (heap.lmargin == -1) {
      if (offset == 0) {
        heap.lmargin = offset;
        if (text == text.toUpperCase() &&
            (text.match(/^[0-9 ]*INT/) || text.match(/^[0-9 ]*EXT/)))
          change_state(heap, MODE_FLUSH_SCREENPLAY);
        else
          change_state(heap, MODE_UNDETERMINED);
      }
      else if (offset > 0 && offset < 20) {
        heap.lmargin = offset;
        change_state(heap, MODE_SCREENPLAY);
      }
      else continue; // to skip leading whitespace
    }
    else if (heap.rmargin == 0 && offset > heap.lmargin
          && text == text.toUpperCase() && text.match(/:$/)) {
      heap.rmargin = m[0].length;
    }
    else if (heap.cmargin == 0 && offset > heap.lmargin && offset < 60
          && text == text.toUpperCase()) {
      heap.cmargin = offset;
    }
    else if (heap.pmargin == 0 && offset > heap.lmargin &&
             offset < heap.cmargin && text.match(/^\(/)) {
      heap.pmargin = offset;
    }
    else if (heap.dmargin == 0 && offset > heap.lmargin && offset < heap.cmargin) {
      heap.dmargin = offset;
    }

    // Event dispatch
    if (offset < heap.lmargin) {
      heap.state.dispatch('ws', null);
    }
    else if (offset >= 60) {
      // FIXME: temporary hack - need to check if right aligned, ends in colon
      if (text.match(/^\d+\.$/)) heap.state.dispatch('ws', null);
      else heap.state.dispatch('transition', text);
    }
    else if (is_heading(text, offset, heap)) {
      heap.state.dispatch('heading', text);
    }
    else if (is_character(text, offset, heap)) {
      heap.state.dispatch('character', text);
    }
    else if (is_dialog(text, offset, heap)) {
      if (heap.mode == MODE_STAGEPLAY && heap.state.state == "dialog")
        text = "\n" + text;
      heap.state.dispatch('dialog', text);
    }
    else if (is_parenthetical(text, offset, heap)) {
      if (heap.mode == MODE_STAGEPLAY && heap.state.state == "paren")
        text = "\n" + text;
      heap.state.dispatch('paren', text);
    }
    else if (is_action(text, offset, heap)) {
      if (heap.mode == MODE_STAGEPLAY && heap.state.state == "action")
        text = "\n" + text;
      heap.state.dispatch('action', text);
    }
    else {
      if (heap.mode == MODE_STAGEPLAY && heap.state.state == "text")
        text = "\n" + text;
      heap.state.dispatch('text', text);
    }
  }

  heap.progress(heap.count / heap.limit);
  setTimeout(parse_script_chunk, CHUNK_DELAY, heap);
}


var translate_chars = [
  { code: 8230, repl: '...' },
  { code: 8211, repl: '-'   },
  { code: 8212, repl: '--'  },
  { code: 8220, repl: '"'   },
  { code: 8221, repl: '"'   },
  { code: 8226, repl: '*'   },
  { code: 8216, repl: "'"   },
  { code: 8217, repl: "'"   }
];

var translate_str = '';

for (var i in translate_chars) {
  translate_chars[i].chr = String.fromCharCode(translate_chars[i].code);
  translate_chars[i].regex = new RegExp(translate_chars[i].chr, 'g');
  translate_str += translate_chars[i].chr;
}

var translate_test = new RegExp('[' + translate_str + ']');


function cleanup (str) {
  if (str == '') return '';

  if (translate_test.test(str)) {
    for (var i = 0; i < translate_chars.length; i++) {
      str = str.replace(translate_chars[i].regex, translate_chars[i].repl);
    }
  }

  return str;
}


function State () {
  this.dom = document.implementation.createDocument(null, 'scriptdoc', null);
  this.context = this.dom.documentElement;
  this.state = 'document';
  this.text = '';
  this.input = '';
}


State.prototype.dispatch = function (signal, value) {
  this.input = value;

  // dump("  signal: " + signal + "\n");
  
  switch (this.state) {

  case 'document':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.do_state('document');     break;
    }
    break;

  case 'action':
    switch (signal) {
    case 'action'    : this.do_state('action');       break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'character':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.do_state('character');    break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;
    
  case 'dialog':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.do_state('dialog');       break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'heading':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.do_state('heading');      break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'paren':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.do_state('paren');        break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'scene':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.do_state('scene');        break;
    }
    break;

  case 'shot':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.do_state('shot');         break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'transition':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('shot');       break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.do_state('transition');   break;
    case 'text'      : this.transition('text');       break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  case 'text':
    switch (signal) {
    case 'action'    : this.transition('action');     break;
    case 'character' : this.transition('character');  break;
    case 'dialog'    : this.transition('dialog');     break;
    case 'heading'   : this.transition('heading');    break;
    case 'paren'     : this.transition('paren');      break;
    case 'transition': this.transition('transition'); break;
    case 'text'      : this.do_state('text');         break;
    case 'ws'        : this.transition('scene');      break;
    }
    break;

  default:
    dump("unknown state: " + this.state + "\n");

  }
    
};    


State.prototype.transition = function (state) {
  this.on_exit(this.state);
  this.state = state;
  this.on_enter(this.state);
  this.do_state(this.state);
};


State.prototype.on_enter = function (state) {
  // dump("entering: " + state + "\n");

  switch (state) {

  case 'heading':
    // If we're coming from the document state we already have a scene
    if (this.last_state != 'document') {
      // Add a scene
      var scene = this.dom.createElement('scene');
      this.context.parentNode.appendChild(scene);
      this.context = scene;
    }
    break;

  case 'action':
  case 'character':
  case 'dialog':
  case 'paren':
  case 'scene':
  case 'shot':
  case 'transition':
  case 'text':
    break;

  }

};


State.prototype.add_element = function (name) {
  var elem = this.dom.createElement(name);
  // elem.appendChild(this.dom.createTextNode(this.text));
  var lines = this.text.split("\n");
  elem.appendChild(this.dom.createTextNode(lines.shift()));
  while (lines.length > 0) {
    elem.appendChild(this.dom.createElement("linebreak"));
    elem.appendChild(this.dom.createTextNode(lines.shift()));
  }
  this.context.appendChild(elem);
};


State.prototype.on_exit = function (state) {
  // dump("exiting: " + state + "\n");

  this.last_state = state;

  switch (state) {

  case 'document':
    // Add a scene
    var scene = this.dom.createElement('scene');
    this.context.appendChild(scene);
    this.context = scene;
    break;
  case 'heading':
    this.add_element('sceneheading');
    break;
  case 'action':
    this.add_element('action');
    break;
  case 'character':
    if (! this.text.match(/\(MORE|CONT\)/)) {
      this.add_element('character');
    }
    break;
  case 'dialog':
    this.add_element('dialog');
    break;
  case 'paren':
    this.add_element('paren');
    break;
  case 'transition':
    this.add_element('transition');
    break;
  case 'shot':
    this.add_element('shot');
    break;
  case 'text':
    this.add_element('text');
    break;
  case 'scene':
    break;
  default:
    dump("on_exit: unknown state: " + state + "\n");
  }

  this.text = '';
};


State.prototype.do_state = function (state) {
  // dump("doing: " + state + "\n");

  switch (state) {
  case 'document':
  case 'scene':
    // No-op
    break;
  case 'action':
  case 'character':
  case 'dialog':
  case 'heading':
  case 'paren':
  case 'shot':
  case 'transition':
  case 'text':
    this.text = this.text == '' ? this.input : this.text + ' ' + this.input;
    break;
  default:
    dump("do_state: unknown state: " + state + "\n");
  }

};
