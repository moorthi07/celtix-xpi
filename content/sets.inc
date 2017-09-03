# ***** BEGIN LICENCE BLOCK *****
# Version: CePL 1.1
# 
# The contents of this file are subject to the Celtx Public License
# Version 1.1 (the "License"); you may not use this file except in
# compliance with the License. You may obtain a copy of the License at
# http://www.celtx.com/CePL/
# 
# Software distributed under the License is distributed on an "AS IS"
# basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
# the License for the specific language governing rights and limitations
# under the License.
# 
# The Original Code is Celtx Script Manager.
# 
# The Initial Developer of the Original Code is Chad House and 4067479
# Canada Inc. t/a CELTX.
# 
# Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
# parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
# Reserved.
# 
# Contributor(s):
#
# ***** END LICENCE BLOCK *****

  <stringbundleset>
    <stringbundle id="celtx-bundle"
                  src="chrome://celtx/locale/celtx.properties"/>
  </stringbundleset>

  <popupset id="popups">

    <popup id="editor-context">
      <menuitem id="editor-popup-cut"
                label="&cutCmd.label;"
                command="cmd_cut"/>
      <menuitem id="editor-popup-copy"
                label="&copyCmd.label;"
                command="cmd_copy"/>
      <menuitem id="editor-popup-paste"
                label="&pasteCmd.label;"
                command="cmd_paste"/>
      <menuseparator/>
      <menuitem id="editor-popup-recycle"
                class="menuitem-iconic"
                label="&recycleCmd.label;"
                image="chrome://celtx/content/res/recycle-16.png"
                command="cmd-recycle-selection"/>
    </popup>

    <popup id="boneyard-context">
      <menuitem id="editor-popup-cut"
                label="&cutCmd.label;"
                command="cmd_cut"/>
      <menuitem id="editor-popup-copy"
                label="&copyCmd.label;"
                command="cmd_copy"/>
      <menuitem id="editor-popup-paste"
                label="&pasteCmd.label;"
                command="cmd_paste"/>
    </popup>

    <popup id="tree-popup">
      <menuitem id="tree-goto-item"
                label="&gotoResCmd.label;"
                command="cmd-treeitem-goto"/>
      <menuseparator/>
      <menuitem id="tree-recycle-item"
                class="menuitem-iconic"
                label="&recycleCmd.label;"
                image="chrome://celtx/content/res/recycle-16.png"
                command="cmd-recycle-scene"/>
      <menuitem id="tree-delete-item"
                class="menuitem-iconic nav-item-delete-menuitem"
                label="&delItemCmd.label;"
                command="cmd-treeitem-delete"/>
    </popup>

    <popup id="note-popup" onclick="this.hidePopup()"
        onpopupshown="this.setAttribute('showing', true)"
        onpopuphidden="this.removeAttribute('showing')">
      <vbox id="note-vbox" flex="1">
        <!-- kludge -->
        <label class="edit-note" value="Edit"
         onclick="gProjWin.currentDocumentView.controller.editNotePopup(this)"/>
        <description id="note-popup-text" flex="1"/>
      </vbox>
    </popup>

    <popup id="autotext-popup" type="autotext" hidden="true"/>

    <popup id="markup-popup" onclick="this.hidePopup()">
      <vbox id="markup-popup-vbox" flex="1">
        <description id="markup-popup-text" flex="1"/>
      </vbox>
    </popup>

  </popupset>

  <broadcasterset id="main-broadcaster-set">
    <!-- TODO: purge unused -->
    <broadcaster id="project" label="(no item)"/>
    <broadcaster id="script-selection" disabled="true"/>
    <broadcaster id="script-visible" hidden="true"/>
    <broadcaster id="script-enabled" disabled="true"/>
    <broadcaster id="view-sidebar" type="checkbox"
                 autocheck="false" autoCheck="false"
                 checked="false" command="cmd-toggle-sidebar"/>
    <broadcaster id="scrapbook-enabled"
                 disabled="true"
                 hidden="true"/>
    <broadcaster id="small-icons"
                 iconsize="large"/>
  </broadcasterset>

  <!-- Hack for recalcitrant generated elements that won't otherwise update -->
  <vbox hidden="true">
    <observes element="script-selection"
              attribute="disabled"
              onbroadcast="scriptSelectionChanged()"/>
  </vbox>


  <commandset commandupdater="true"
              events="focus"
              oncommandupdate="updateGlobalEditCommands()"/>
  <commandset commandupdater="true"
              events="select"
              oncommandupdate="updateSelectEditCommands()"/>
  <commandset commandupdater="true"
              events="undo"
              oncommandupdate="updateUndoEditCommands()"/>
  <commandset commandupdater="true"
              events="clipboard"
              oncommandupdate="updatePasteCommands()"/>
  <commandset commandupdater="true"
              events="richview-select"
              oncommandupdate="gProjWin.updateMediaCommands()"/>
  <commandset commandupdater="true"
              events="document-changed"
              oncommandupdate="gProjWin.updateDocumentCommands()"/>

  <commandset id="main-command-set">
    <command id="cmd-new-project" oncommand="goDoCommand('cmd-new-project')"/>
    <command id="cmd-open-project" oncommand="goDoCommand('cmd-open-project')"/>
    <command id="cmd-close" oncommand="goDoCommand('cmd-close')"/>
    <command id="cmd-quit"         oncommand="app.quit()"/>

    <command id="minimizeWindow"    oncommand="window.minimize()"/>
    <command id="zoomWindow"        oncommand="zoomWindow()"/>

    <command id="cmd-help-about"      oncommand="app.helpAbout()"/>
    <command id="cmd-help-support"    oncommand="app.helpSupport()"/>
    <command id="cmd-help-report-bug" oncommand="app.helpReportBug()"/>
    <command id="cmd-help-account"
             oncommand="goDoCommand('cmd-help-account')"/>
    <command id="cmd-toggle-sidebar"
             oncommand="goDoCommand('cmd-toggle-sidebar')"
             disabled="true"/>
  </commandset>

  <commandset id="project-command-set">
    <command id="cmd-project-properties"
             oncommand="goDoCommand('cmd-project-properties')"
             disabled="true"/>
    <command id="cmd-treeitem-down"
             oncommand="goDoCommand('cmd-treeitem-down')"
             disabled="true"/>
    <command id="cmd-treeitem-up"
             oncommand="goDoCommand('cmd-treeitem-up')"
             disabled="true"/>
    <command id="cmd-treeitem-delete"
             oncommand="goDoCommand('cmd-treeitem-delete')"
             disabled="true"/>
    <command id="cmd-import"
             oncommand="goDoCommand('cmd-import')"
             disabled="true"/>
    <command id="cmd-export-script"
             oncommand="goDoCommand('cmd-export-script')"
             disabled="true"/>
    <command id="cmd-copy-project"
             oncommand="goDoCommand('cmd-copy-project')"
             disabled="true"/>
    <command id="cmd-publish-project"
             oncommand="goDoCommand('cmd-publish-project')"
             disabled="true"/>
    <command id="cmd-download-project"
             oncommand="goDoCommand('cmd-download-project')"/>
    <command id="cmd-save-project"
             oncommand="goDoCommand('cmd-save-project')"
             disabled="true"/>
    <command id="cmd-save-project-as"
             oncommand="goDoCommand('cmd-save-project-as')"
             disabled="true"/>
    <command id="cmd-page-setup"
             oncommand="goDoCommand('cmd-page-setup')"
             disabled="true"/>
    <command id="cmd-print-preview"
             oncommand="goDoCommand('cmd-print-preview')"
             disabled="true"/>
    <command id="cmd-print"
             oncommand="goDoCommand('cmd-print')"
             disabled="true"/>
    <command id="cmd-generate-pdf"
             oncommand="goDoCommand('cmd-generate-pdf')"
             disabled="true"/>
    <command id="cmd-style-settings"
             oncommand="goDoCommand('cmd-style-settings')"
             disabled="true"/>
    <command id="cmd-breakdown"
             oncommand="goDoCommand('cmd-breakdown')"
             disabled="true"/>
  </commandset>

  <commandset id="resource-command-set">
    <command id="cmd-treeitem-goto"
             oncommand="goDoCommand('cmd-treeitem-goto')"
             disabled="true"/>
    <command id="cmd-show-resource"
             oncommand="goDoCommand('cmd-show-resource')"
             disabled="true"/>
    <command id="cmd-media-search"
             oncommand="goDoCommand('cmd-media-search')"
             disabled="true"/>
  </commandset>

  <commandset id="editor-command-set">
    <command id="cmd-bold"
             oncommand="goDoCommand('cmd-bold')"
             disabled="true"/>
    <command id="cmd-italic"
             oncommand="goDoCommand('cmd-italic')"
             disabled="true"/>
    <command id="cmd-underline"
             oncommand="goDoCommand('cmd-underline')"
             disabled="true"/>
    <command id="cmd-insert-note"
             oncommand="goDoCommand('cmd-insert-note')"/>
    <command id="cmd-check-spelling" observes="script-enabled"
             oncommand="goDoCommand('cmd-check-spelling')"/>
    <command id="cmd-open-scrapbook"
             oncommand="goDoCommand('cmd-open-scrapbook')"
             observes="scrapbook-enabled"/>
    <command id="cmd-toggle-boneyard"
             oncommand="goDoCommand('cmd-toggle-boneyard')"
             checked="false"/>
    <command id="cmd-recycle-selection"
             oncommand="goDoCommand('cmd-recycle-selection')">
      <observes element="cmd_cut" attribute="disabled"/>
    </command>
    <command id="cmd-recycle-scene"
             oncommand="goDoCommand('cmd-recycle-scene')"
             disabled="true"/>
  </commandset>

  <commandset id="browser-command-set">
    <command id="cmd-back"
             oncommand="goDoCommand('cmd-back')"
             disabled="true"/>
    <command id="cmd-forward"
             oncommand="goDoCommand('cmd-forward')"
             disabled="true"/>
    <command id="cmd-go"
             oncommand="goDoCommand('cmd-go')"
             disabled="true"/>
    <command id="cmd-reload"
             oncommand="goDoCommand('cmd-reload')"
             disabled="true"/>
    <command id="cmd-stop"
             oncommand="goDoCommand('cmd-stop')"
             disabled="true"/>
    <command id="cmd_bm_open"
             oncommand="goDoCommand('cmd_bm_open');"/>
    <command id="cmd_bm_openinnewwindow"
             oncommand="goDoCommand('cmd_bm_openinnewwindow');"/>
    <command id="cmd_bm_openinnewtab"
             oncommand="goDoCommand('cmd_bm_openinnewtab');"/>
    <command id="cmd_bm_expandfolder"
             oncommand="goDoCommand('cmd_bm_expandfolder');"/>
    <command id="cmd_bm_openfolder"
             oncommand="goDoCommand('cmd_bm_openfolder');"/>
    <command id="cmd_bm_managefolder"
             oncommand="goDoCommand('cmd_bm_managefolder');"/>
    <command id="cmd_bm_newfolder"
             oncommand="goDoCommand('cmd_bm_newfolder');"/>
    <command id="cmd_bm_newbookmark"
             oncommand="goDoCommand('cmd_bm_newbookmark');"/>
    <command id="cmd_bm_newseparator"
             oncommand="goDoCommand('cmd_bm_newseparator');"/>
    <command id="cmd_bm_find"
             oncommand="goDoCommand('cmd_bm_find');"/>
    <command id="cmd_bm_properties"
             oncommand="goDoCommand('cmd_bm_properties');"/>
    <command id="cmd_bm_refreshlivemark"
             oncommand="goDoCommand('cmd_bm_refreshlivemark');"/>
    <command id="cmd_bm_sortbyname"
             oncommand="goDoCommand('cmd_bm_sortbyname');"/>
  </commandset>

  <commandset id="calendar-command-set">
    <command id="day_view_command"
             oncommand="goDoCommand('day_view_command')"
             disabled="true"/>
    <command id="week_view_command"
             oncommand="goDoCommand('week_view_command')"
             disabled="true"/>
    <command id="multiweek_view_command"
             oncommand="goDoCommand('multiweek_view_command')"
             disabled="true"/>
    <command id="month_view_command"
             oncommand="goDoCommand('month_view_command')"
             disabled="true"/>
    <command id="toggle_only_workday"
             oncommand="goDoCommand('toggle_only_workday')"
             disabled="true"/>
    <command id="toggle_display_todo"
             oncommand="goDoCommand('toggle_display_todo')"/>
    <command id="change_numberofweeks"
             oncommand="goDoCommand('change_numberofweeks')"
             disabled="true"/>
  </commandset>

  <commandset id="debug-command-set">
    <!-- XXX -->
    <command id="cmd-debug-dump"   oncommand=""/>
  </commandset>

  <commandset id="goto-command-set">
    <command id="cmd-goto-projcentral"
             oncommand="goDoCommand('cmd-goto-projcentral')"/>
    <command id="cmd-goto-walkthru"
             oncommand="goDoCommand('cmd-goto-walkthru')"/>
    <command id="cmd-goto-guide"
             oncommand="goDoCommand('cmd-goto-guide')"/>
    <command id="cmd-goto-forums"
             oncommand="goDoCommand('cmd-goto-forums')"/>
  </commandset>

  <commandset id="edit-command-set">
    <!-- XXX make a command updater? -->
    <command id="cmd_undo"
             oncommand="goDoCommand('cmd_undo')"
             disabled="true"/>
    <command id="cmd_redo"
             oncommand="goDoCommand('cmd_redo')"
             disabled="true"/>
    <command id="cmd_cut"
             oncommand="goDoCommand('cmd_cut')"
             disabled="true"/>
    <command id="cmd_copy"
             oncommand="goDoCommand('cmd_copy')"
             disabled="true"/>
    <command id="cmd_paste"
             oncommand="goDoCommand('cmd_paste')"
             disabled="true"/>
    <command id="cmd_delete"
             oncommand="goDoCommand('cmd_delete')"
             valueDefault="&deleteCmd.label;"
             disabled="true"/>
    <command id="cmd_selectAll"
             oncommand="goDoCommand('cmd_selectAll')"
             disabled="true"/>
    <command id="cmd-find"
             oncommand="goDoCommand('cmd-find')"
             disabled="true"/>
    <command id="cmd-replace"
             oncommand="goDoCommand('cmd-replace')"
             disabled="true"/>
    <command id="cmd-find-next"
             oncommand="goDoCommand('cmd-find-next')"
             disabled="true"/>
    <command id="cmd-find-previous"
             oncommand="goDoCommand('cmd-find-previous')"
             disabled="true"/>
  </commandset>

  <keyset id="main-keyset">
    <key id="new-key" modifiers="accel" key="&newNavigatorCmd.key;"
         command="cmd-new-project"/>
    <key id="open-key" modifiers="accel" key="&openFileCmd.commandkey;"
         command="cmd-open-project"/>
    <key id="save-key" modifiers="accel" key="&savePageCmd.commandkey;"
         command="cmd-save-project"/>
    <key id="save-as-key" modifiers="accel,shift" key="&savePageCmd.commandkey;"
         command="cmd-export-script"/>
    <key id="close-key" modifiers="accel" key="&closeCmd.key;"
         command="cmd-close"/>
    <key id="print-key" modifiers="accel" key="&printCmd.commandkey;"
         command="cmd-print"/>
    <key id="key_minimizeWindow" modifiers="accel"
         key="&minimizeWindow.key;" command="minimizeWindow"/>
  </keyset>

  <keyset id="edit-keyset">
    <key id="undo-key" modifiers="accel" key="&undoCmd.key;"
         command="cmd_undo"/>
#ifdef XP_UNIX
    <key id="redo-key" modifiers="accel,shift" key="&undoCmd.key;"
#else
    <key id="redo-key" modifiers="accel" key="&redoCmd.key;"
#endif
         command="cmd_redo"/>
    <key id="cut-key" modifiers="accel" key="&cutCmd.key;"
         command="cmd_cut"/>
    <key id="copy-key" modifiers="accel" key="&copyCmd.key;"
         command="cmd_copy"/>
    <key id="paste-key" modifiers="accel" key="&pasteCmd.key;"
         command="cmd_paste"/>
    <key id="delete-key" keycode="VK_DELETE" command="cmd_delete"/>
    <key id="select-all-key" key="&selectAllCmd.key;" modifiers="accel"/>
    <key id="find-key" modifiers="accel" key="&findOnCmd.commandkey;"
         command="cmd-find"/>
    <key id="find-next-key" modifiers="accel" key="&findAgainCmd.commandkey;"
         command="cmd-find-next"/>
    <key id="find-prev-key" modifiers="accel,shift"
         key="&findAgainCmd.commandkey;"
         command="cmd-find-previous"/>
    <key keycode="&findAgainCmd.commandkey2;" command="cmd-find-next"/>
    <key keycode="&findAgainCmd.commandkey2;" command="cmd-find-previous"
         modifiers="shift"/>
  </keyset>
