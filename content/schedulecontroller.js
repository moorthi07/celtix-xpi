function ScheduleController(docview) {
  this.docview = docview;
  var calview = document.getElementById("calendar-view");
  this.subwin = calview.contentWindow;
  this.subdoc = calview.contentDocument;
}

ScheduleController.prototype = {
  // Observed commands
  observedCommands: [
    "day_view_command",
    "week_view_command",
    "multiweek_view_command",
    "month_view_command",
    // Directly modified menu items
    "menu-numberofweeks-inview"
  ],

  // Overrides
  commands: {
    "change_numberofweeks": 1,
    "toggle_display_todo": 1,
    "toggle_only_workday": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  supportsCommand: function (cmd) {
    if (this.commands[cmd] == 1) {
      return true;
    }

    var elem = this.subdoc.getElementById(cmd);
    if (elem)
      return true;

    var ctrl = this.subwin.controllers.getControllerForCommand(cmd);
    if (ctrl)
      return ctrl.supportsCommand(cmd);

    return false;
  },


  isCommandEnabled: function (cmd) {
    if (this.commands[cmd] == 1) {
      switch (cmd) {
        case "change_numberofweeks":
          var src = this.subdoc.getElementById("menu-numberofweeks-inview");
          return src.getAttribute("disabled") != "true";
        case "cmd-print":
          return ! isMac();
          break;
        case "cmd-print-preview":
          return false;
        default:
          return true;
      }
    }

    var elem = this.subdoc.getElementById(cmd);
    if (elem)
      return elem.getAttribute("disabled") != "true";

    var ctrl = this.subwin.controllers.getControllerForCommand(cmd);
    if (ctrl)
      return ctrl.isCommandEnabled(cmd);

    return false;
  },


  doCommand: function (cmd) {
    if (this.commands[cmd] == 1) {
      switch (cmd) {
        case "toggle_only_workday":
          this.subwin.setTimeout("changeOnlyWorkdayCheckbox(1)", 0);
          break;
        case "toggle_display_todo":
          this.subwin.setTimeout("changeDisplayToDoInViewCheckbox(1)", 0);
          break;
        case "change_numberofweeks":
          var menu = document.getElementById("menu.numberofweeks-inview");
          var items = menu.getElementsByTagName("menuitem");
          for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute("checked") == "true") {
              this.subwin.setTimeout("gCalendarWindow.currentView."
                + "changeNumberOfWeeksCount(" + items[i].value + ")", 0);
              break;
            }
          }
          break;
        case "cmd-print":
          this.subwin.setTimeout("print()", 0);
          break;
      }
      return;
    }

    // This is where the hack gets ugly...
    var elem = this.subdoc.getElementById(cmd);
    if (elem) {
      var cmdstr = elem.getAttribute("oncommand");
      this.subwin.setTimeout(cmdstr, 0);
      return;
    }

    var ctrl = this.subwin.controllers.getControllerForCommand(cmd);
    if (ctrl)
      ctrl.doCommand(cmd);
  },


  updateCommands: function () {
    goUpdateCommand("day_view_command");
    goUpdateCommand("week_view_command");
    goUpdateCommand("multiweek_view_command");
    goUpdateCommand("month_view_command");
    goUpdateCommand("toggle_only_workday");
    goUpdateCommand("toggle_display_todo");
    goUpdateCommand("change_numberofweeks");
    goUpdateCommand("cmd-print");
  },


  handleEvent: function (event) {
    switch (event.target.id) {
      case "menu-numberofweeks-inview":
        goUpdateCommand("change_numberofweeks");
        break;
      default:
        goUpdateCommand(event.target.id);
    }
  },


  setMenusVisible: function (visible) {
    var hidden = ! visible;
    document.getElementById("calendar-menuseparator").hidden = hidden;
    document.getElementById("calendar-view-menu-day").hidden = hidden;
    document.getElementById("calendar-view-menu-week").hidden = hidden;
    document.getElementById("calendar-view-menu-multiweek").hidden = hidden;
    document.getElementById("calendar-view-menu-month").hidden = hidden;
    document.getElementById("calendar-menuseparator2").hidden = hidden;
    document.getElementById("only-workday-checkbox-1").hidden = hidden;
    document.getElementById("display-todo-inview-checkbox-1").hidden = hidden;
    document.getElementById("menu-numberofweeks-inview").hidden = hidden;
  },


  showMenus: function () {
    this.setMenusVisible(true);
  },


  hideMenus: function () {
    this.setMenusVisible(false);
  },


  open: function () {
    for (var i = 0; i < this.observedCommands.length; i++) {
      var cmd = this.subdoc.getElementById(this.observedCommands[i]);
      if (cmd)
        cmd.addEventListener("DOMAttrModified", this, false);
      else
        dump("*** Missing command in Calendar: " + cmd + "\n");
    }
  },


  close: function () {
    for (var i = 0; i < this.observedCommands.length; i++) {
      var cmd = this.subdoc.getElementById(this.observedCommands[i]);
      if (cmd) {
        cmd.removeEventListener("DOMAttrModified", this, false);
      }
      else
        dump("*** Missing command in Calendar: " + cmd + "\n");
    }
  },


  focus: function () {
    // Synchronize document listbox
    var doclist = this.subdoc.getElementById("calendar-doclist");
    var origlist = document.getElementById("doclist");
    var docitem = getItemByValue(doclist, origlist.selectedItem.value);
    if (docitem)
      doclist.selectedItem = docitem;

    // Synchronize document tabbox
    var tabbox = this.subdoc.getElementById("cal-document-tabbox");
    var tabs = tabbox.firstChild.firstChild;
    while (tabs.childNodes.length > 0)
      tabs.removeItemAt(0);
    var origbox = document.getElementById("document-deck");
    var origtabs = origbox.firstChild.firstChild;
    for (var i = 0; i < origtabs.childNodes.length; i++) {
      var origtab = origtabs.childNodes[i];
      var tab = this.subdoc.createElement("tab");
      tab.setAttribute("class", "tabbrowser-tab");
      tab.setAttribute("label", origtab.getAttribute("label"));
      tab.setAttribute("image", origtab.getAttribute("image"));
      tab.setAttribute("crop", "end");
      tab.setAttribute("value", origtab.getAttribute("value"));
      tab.maxWidth = 200;
      tab.minWidth = 30;
      tab.width = 0;
      tab.setAttribute("flex", "100");
      tabs.appendChild(tab);
      if (tab.getAttribute("value") == "urn:celtx:document:schedule")
        tabs.selectedItem = tab;
    }

    // Synchronize the left splitter's width (from Celtx to Calendar)
    var calLeftBox = this.subdoc.getElementById("left-hand-content");
    var projLeftBox = document.getElementById("nav-sidebar");
    calLeftBox.width = projLeftBox.width;

    // Show calendar-specific menus
    this.showMenus();
    this.updateCommands();
  },


  blur: function () {
    // Synchronize the left splitter's width (from Calendar to Celtx)
    var calLeftBox = this.subdoc.getElementById("left-hand-content");
    var projLeftBox = document.getElementById("nav-sidebar");
    projLeftBox.width = calLeftBox.width;

    this.updateCommands();
    this.hideMenus();
  },


  print: function () {
    // Calendar printing seems to be dysfunctional, at least on Mac
  },


  printPreview: function () {
  }
};

