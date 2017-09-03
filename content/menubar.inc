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

    <menubar id="celtx-menubar">

      <menu id="file-menu"
      label="&fileMenu.label;" accesskey="&fileMenu.accesskey;">
        <menupopup>
          <menuitem label="&newProjCmd.label;"
            accesskey="&newNavigatorCmd.accesskey;"
            key="new-key"
            command="cmd-new-project"/>
          <menuitem label="&openProjCmd.label;"
            accesskey="&openFileCmd.accesskey;"
            key="open-key"
            command="cmd-open-project"/>
          <menuitem label="&copyProjCmd.label;"
            key="copy-project-key"
            command="cmd-copy-project"/>
          <menuitem label="&saveProjCmd.label;"
            accesskey="&savePageCmd.accesskey;"
            key="save-key"
            command="cmd-save-project"/>
          <menuitem id="export-script-menuitem"
            label="&exportScriptCmd.label;"
            accesskey="&exportScriptCmd.accessKey;"
            key="save-as-key"
            hidden="true"
            command="cmd-export-script"/>
          <menuitem label="&closeCmd.label;"
            accesskey="&closeCmd.accesskey;"
            key="close-key"
            hidden="true"
            command="cmd-close"/>
          <menuseparator/>
          <menuitem label="&printSetupCmd.label;"
                    accesskey="&printSetupCmd.accesskey;"
                    command="cmd-page-setup"/>
#ifndef XP_MACOSX
          <menuitem label="&printPreviewCmd.label;"
                    accesskey="&printPreviewCmd.accesskey;"
                    command="cmd-print-preview"/>
#endif
          <menuitem label="&printCmd.label;"
                    accesskey="&printCmd.accesskey;"
                    key="print-key"
                    command="cmd-print"/>
          <menuseparator/>
          <menuitem label="&downloadProjCmd.label;"
            accesskey="&downloadProjCmd.accessKey;"
            command="cmd-download-project"/>
          <menuitem label="&uploadProjCmd.label;"
            accesskey="&uploadProjCmd.accessKey;"
            command="cmd-publish-project"/>
          <menuitem id="generate-pdf-menuitem"
            label="&generatePDF.label;"
            hidden="true"
            command="cmd-generate-pdf"/>
          <menuseparator/>
          <menuitem id="import-script-menuitem"
            label="&importCmd.label;"
            accesskey="&importCmd.accessKey;"
            hidden="true"
            command="cmd-import"/>
          <menuseparator/>
          <menuitem label="&metadataCmd.label;"
            command="cmd-project-properties"/>
          <menuseparator id="menu_FileQuitSeparator"/>
          <menuitem id="menu_FileQuitItem"
#ifdef XP_WIN
            label="&quitApplicationCmdWin.label;"
            accesskey="&quitApplicationCmdWin.accesskey;"
#else
            label="&quitApplicationCmd.label;"
            accesskey="&quitApplicationCmd.accesskey;"
#endif
            command="cmd-quit"/>
        </menupopup>
      </menu>

      <menu id="edit-menu"
        label="&editMenu.label;"
        accesskey="&editMenu.accesskey;">
        <menupopup>
          <menuitem label="&undoCmd.label;"
                    key="undo-key"
                    accesskey="&undoCmd.accesskey;"
                    command="cmd_undo"/>
          <menuitem label="&redoCmd.label;"
                    key="redo-key"
                    accesskey="&redoCmd.accesskey;"
                    command="cmd_redo"/>
          <menuseparator/>
          <menuitem label="&cutCmd.label;"
                    key="cut-key"
                    accesskey="&cutCmd.accesskey;"
                    command="cmd_cut"/>
          <menuitem label="&copyCmd.label;"
                    key="copy-key"
                    accesskey="&copyCmd.accesskey;"
                    command="cmd_copy"/>
          <menuitem label="&pasteCmd.label;"
                    key="paste-key"
                    accesskey="&pasteCmd.accesskey;"
                    command="cmd_paste"/>
          <menuitem label="&deleteCmd.label;"
                    key="delete-key"
                    accesskey="&deleteCmd.accesskey;"
                    command="cmd_delete"/>
          <menuitem label="&selectAllCmd.label;"
                    key="select-all-key"
                    accesskey="&selectAllCmd.accesskey;"
                    command="cmd_selectAll"/>
          <menuseparator/>
          <menuitem label="&findCmd.label;..."
                    key="find-key"
                    command="cmd-find"/>
          <menuitem label="&replaceCmd.label;..."
                    command="cmd-replace"/>
          <menuitem label="&findNextCmd.label;"
                    key="find-next-key"
                    command="cmd-find-next"/>
          <menuitem label="&findPrevCmd.label;"
                    key="find-prev-key"
                    command="cmd-find-previous"/>
        </menupopup>
      </menu>

      <menu id="view-menu"
        label="&viewMenu.label;"
        accesskey="&viewMenu.accesskey;">
        <menupopup>
          <menu id="toolbars-menu"
            label="&viewToolbarsMenu.label;"
            accesskey="&viewToolbarsMenu.accesskey;">
            <menupopup>
              <menuitem label="&iconsAndText.label;" value="both"
                type="radio" name="celtx:toolbarmode"
                oncommand="setToolbarMode(this.value)"/>
              <menuitem label="&icons.label;" value="icons"
                type="radio" name="celtx:toolbarmode"
                oncommand="setToolbarMode(this.value)"/>
              <menuitem label="&text.label;" value="text"
                type="radio" name="celtx:toolbarmode"
                oncommand="setToolbarMode(this.value)"/>
              <menuitem label="&none;" value="none"
                type="radio" name="celtx:toolbarmode"
                oncommand="setToolbarMode(this.value)"/>
              <!-- Currently we always use small icons -->
              <menuseparator hidden="true"/>
              <menuitem id="smallIconsMenuItem"
                        hidden="true"
                        label="&useSmallIcons.label;"
                        type="checkbox"
                        autocheck="false"
                        checked="false"
                    oncommand="setSmallIcons(! this.getAttribute('checked'))"/>
            </menupopup>
          </menu>

          <menuitem label="&sidebar.label;" observes="view-sidebar"/>

          <menuseparator id="calendar-menuseparator"
                         hidden="true"/>
          <menuitem id="calendar-view-menu-day"
                    label="&calendar.flat.topbar.dayview;"
                    accesskey="&calendar.dayview.accesskey;"
                    hidden="true"
                    command="day_view_command"/>
          <menuitem id="calendar-view-menu-week"
                    key="view_week_key"
                    label="&calendar.flat.topbar.weekview;"
                    accesskey="&calendar.weekview.accesskey;"
                    hidden="true"
                    command="week_view_command"/>
          <menuitem id="calendar-view-menu-multiweek"
                    key="view_multiweek_key"
                    label="&calendar.flat.topbar.multiweekview;"
                    accesskey="&calendar.multiweekview.accesskey;"
                    hidden="true"
                    command="multiweek_view_command"/>
          <menuitem id="calendar-view-menu-month"
                    key="view_month_key"
                    label="&calendar.flat.topbar.monthview;"
                    accesskey="&calendar.monthview.accesskey;"
                    hidden="true"
                    command="month_view_command"/>
          <menuseparator id="calendar-menuseparator2"
                         hidden="true"/>
          <menuitem id="only-workday-checkbox-1"
                    type="checkbox"
                    label="&calendar.onlyworkday.checkbox.label;"
                    accesskey="&calendar.onlyworkday.checkbox.accesskey;"
                    command="toggle_only_workday"
                    persist="checked"
                    hidden="true"
                    disabled="true"/>
          <menuitem id="display-todo-inview-checkbox-1"
                    type="checkbox"
                    label="&calendar.displaytodos.checkbox.label;"
                    accesskey="&calendar.displaytodos.checkbox.accesskey;"
                    command="toggle_display_todo"
                    persist="checked"
                    hidden="true"
                    disabled="true"/>
          <menu label="&calendar.menu.numberofweeks.label;"
                command="change_numberofweeks"
                id="menu-numberofweeks-inview"
                hidden="true"
                disabled="true">
            <menupopup>
              <menuitem type="radio"
                        value="1"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.1;"/>
              <menuitem type="radio"
                        value="2"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.2;"/>
              <menuitem type="radio"
                        value="3"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.3;"/>
              <menuitem type="radio"
                        value="4"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.4;"/>
              <menuitem type="radio"
                        value="5"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.5;"/>
              <menuitem type="radio"
                        value="6"
                        name="menunbofweeks"
                        label="&calendar.menu.numberofweeks.6;"/>
            </menupopup>
          </menu>

        </menupopup>
      </menu>

      <menu id="tools-menu"
        label="&toolsMenu.label;"
        accesskey="&toolsMenu.accesskey;"
        observes="script-visible">
        <menupopup>
          <menuitem id="check-spelling-menuitem"
            label="&spellCheckCmd.label;"
            hidden="true"
            command="cmd-check-spelling"/>
        </menupopup>
      </menu>

#ifdef XP_MACOSX
      <menu id="windowMenu" label="&windowMenu.label;"
            datasources="rdf:window-mediator"
            ref="NC:WindowMediatorRoot"
            onpopupshown="checkFocusedWindow()">
        <template>
          <rule>
            <menupopup>
              <menuitem uri="rdf:*"
                        label="rdf:http://home.netscape.com/NC-rdf#Name"
                        type="radio" name="windowList"
                        oncommand="ShowWindowFromResource(event.target)" />
            </menupopup>
          </rule>
        </template>
        <menupopup id="windowPopup">
          <menuitem label="&minimizeWindow.label;" command="minimizeWindow"
                    key="key_minimizeWindow" />
          <menuitem label="&zoomWindow.label;" command="zoomWindow" />
          <menuseparator />
          <menuitem label="&splashScreen.label;"
                    oncommand="newSplashScreen('SPLASH')" />
          <menuitem label="&bringAllToFront.label;" disabled="true" />
          <menuseparator id="sep-window-list" />
        </menupopup>
      </menu>
#endif

      <menu id="help-menu"
	    label="&helpMenu.label;" accesskey="&helpMenu.accessKey;">
        <menupopup id="menu_ToolsPopup"> <!-- For Calendar Extension Overlay -->
          <menuitem id="aboutName"
                    label="&helpAboutCmd.label;"
                    accesskey="&helpAboutCmd.accessKey;"
                    command="cmd-help-about"/>
          <menuseparator/>
          <menuitem label="&helpSupportCmd.label;"
                    accesskey="&helpSupportCmd.accessKey;"
                    command="cmd-help-support"/>
          <menuitem label="&helpReportBugCmd.label;"
                    accesskey="&helpReportBugCmd.accessKey;"
                    command="cmd-help-report-bug"/>
          <menuseparator/>
          <menuitem label="&celtxAccountCmd.label;"
                    accesskey="&celtxAccountCmd.accessKey;"
                    command="cmd-help-account"/>
#ifdef XP_UNIX
#ifdef XP_MACOSX
          <menuitem id="menu_preferences"
                    oncommand="openPreferences();"/>
#else
          <menuseparator id="prefSep"/>
          <menuitem id="menu_preferences"
                    label="&preferencesCmdUnix.label;"
                    accesskey="&preferencesCmdUnix.accesskey;"
                    oncommand="openPreferences();"/>
#endif
#else
          <menuseparator id="prefSep"/>
          <menuitem id="menu_preferences"
                    label="&preferencesCmd.label;"
                    accesskey="&preferencesCmd.accesskey;"
                    oncommand="openPreferences();"/>
#endif
        </menupopup>

      </menu>

    </menubar>

