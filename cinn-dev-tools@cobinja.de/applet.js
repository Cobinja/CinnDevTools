const Applet = imports.ui.applet;
const Main = imports.ui.main;
const Util = imports.misc.util;
const St = imports.gi.St;
const Cinnamon = imports.gi.Cinnamon;
const Lang = imports.lang;
const Signals = imports.signals;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;
const Meta = imports.gi.Meta;

function MuffinDebugTopics() {
  this._init();
}

MuffinDebugTopics.prototype = {
  _init: function() {
    this.subMenuItem = new PopupMenu.PopupSubMenuMenuItem("Muffin Debug Topics");
    
    this.menuItems = [];
    
    this.addMenuItem(Meta.DebugTopic.VERBOSE, "Verbose");
    this.subMenuItem.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    
    this.addMenuItem(Meta.DebugTopic.COMPOSITOR, "Compositor");
    this.addMenuItem(Meta.DebugTopic.EDGE_RESISTANCE, "Edge Resistance");
    this.addMenuItem(Meta.DebugTopic.ERRORS, "Errors");
    this.addMenuItem(Meta.DebugTopic.EVENTS, "Events");
    this.addMenuItem(Meta.DebugTopic.FOCUS, "Focus");
    this.addMenuItem(Meta.DebugTopic.GEOMETRY, "Geometry");
    this.addMenuItem(Meta.DebugTopic.GROUPS, "Groups");
    this.addMenuItem(Meta.DebugTopic.KEYBINDINGS, "Keybindings");
    this.addMenuItem(Meta.DebugTopic.PING, "Ping");
    this.addMenuItem(Meta.DebugTopic.PLACEMENT, "Placement");
    this.addMenuItem(Meta.DebugTopic.PREFS, "Preferences");
    this.addMenuItem(Meta.DebugTopic.RESIZING, "Resizing");
    this.addMenuItem(Meta.DebugTopic.SM, "Session Management");
    this.addMenuItem(Meta.DebugTopic.SHAPES, "Shapes");
    this.addMenuItem(Meta.DebugTopic.STACK, "Stack");
    this.addMenuItem(Meta.DebugTopic.STARTUP, "Startup");
    this.addMenuItem(Meta.DebugTopic.SYNC, "Sync");
    this.addMenuItem(Meta.DebugTopic.THEMES, "Themes");
    this.addMenuItem(Meta.DebugTopic.WINDOW_OPS, "Window Operations");
    this.addMenuItem(Meta.DebugTopic.WINDOW_STATE, "Window State");
    this.addMenuItem(Meta.DebugTopic.WORKAREA, "Work Area");
    this.addMenuItem(Meta.DebugTopic.XINERAMA, "Xinerama");
  },
  
  on_applet_added_to_panel: function() {
    this.menuItems[0].signalId = this.menuItems[0].connect("toggled", Lang.bind(this, this.setVerbose));
    for (let i = 1; i < this.menuItems.length; i++) {
      let mi = this.menuItems[i];
      mi.signalId = mi.connect("toggled", Lang.bind(this, this.setTopic));
    }
  },
  
  on_applet_removed_from_panel: function() {
    for (let i = 0; i < this.menuItems.length; i++) {
      let mi = this.menuItems[i];
      mi.disconnect(mi.signalId);
    }
  },
  
  addMenuItem: function(topic, caption, callback) {
    let mi = new PopupMenu.PopupSwitchMenuItem(caption, false);
    mi.topic = topic;
    this.subMenuItem.menu.addMenuItem(mi);
    this.menuItems.push(mi);
  },
  
  setVerbose: function(menuItem, state) {
    this.freeze = true;
    Meta.set_verbose(state);
    for (let i = 1; i < this.menuItems.length; i++) {
      let mi = this.menuItems[i];
      mi.setToggleState(state);
    }
    this.freeze = false;
  },
  
  setTopic: function(menuItem, state) {
    if (!this.freeze) {
      let topic = menuItem.topic;
      if (state) {
        Meta.add_verbose_topic(topic);
      }
      else {
        Meta.remove_verbose_topic(topic);
      }
    }
  }
}

Signals.addSignalMethods(MuffinDebugTopics.prototype);

function XletMenuItem(dir, uuid) {
  this._init(dir, uuid);
}

XletMenuItem.prototype = {
  __proto__: PopupMenu.PopupMenuItem.prototype,
  
  _init: function(dir, uuid) {
    PopupMenu.PopupMenuItem.prototype._init.call(this, uuid);
    this._dir = dir;
    this._uuid = uuid;
    this.connect("activate", Lang.bind(this, this._onActivate));
  },
  
  _onActivate: function() {
    let iter = this._dir.enumerate_children(Gio.FILE_ATTRIBUTE_STANDARD_NAME, 0, null);
    let fileInfo;
    while ((fileInfo = iter.next_file(null)) != null) {
      let fileName = fileInfo.get_name();
      let [locale, suffix] = fileName.split(".");
      if (suffix == "po") {
        let fil = this._dir.get_child(fileName);
        let targetDirName = GLib.build_filenamev([GLib.get_user_data_dir(), "locale", locale, "LC_MESSAGES"]);
        let targetDir = Gio.file_new_for_path(targetDirName);
        try {
          targetDir.make_directory_with_parents(null);
        }
        catch (e) {
          // Just a dummy, creating fails if directory already exists
        }
        let targetFileName = GLib.build_filenamev([GLib.get_user_data_dir(), "locale", locale, "LC_MESSAGES", this._uuid + ".mo"]);
        let cmd = "msgfmt -c " + fil.get_path() + " -o " + targetFileName;
        global.log("Spawning \"" + cmd + "\"");
        Util.spawnCommandLineAsync(cmd, null, Lang.bind(this, function() {
          Main.notifyError("Translation Error", "Error translating " + fileName + " from " + this._uuid + "\n" + cmd);
        }));
      }
    }
  }
}

function XletTranslations() {
  this._init();
}

XletTranslations.prototype = {
  _init: function() {
    this.subMenuItem = new PopupMenu.PopupSubMenuMenuItem("Xlet Translations");
    this._xletTypes = {}
    
    this._appletSubMenu = new PopupMenu.PopupSubMenuMenuItem("Applets");
    this._deskletSubMenu = new PopupMenu.PopupSubMenuMenuItem("Desklets");
    this._extensionSubMenu = new PopupMenu.PopupSubMenuMenuItem("Extensions");
    
    this.subMenuItem.menu.addMenuItem(this._appletSubMenu);
    this.subMenuItem.menu.addMenuItem(this._deskletSubMenu);
    this.subMenuItem.menu.addMenuItem(this._extensionSubMenu);
  },
  
  _loadXlets: function(xletType, subMenuItem) {
    let path = GLib.build_filenamev([global.userdatadir, xletType]);
    let dir = Gio.file_new_for_path(path);
    let iter = dir.enumerate_children(Gio.FILE_ATTRIBUTE_STANDARD_NAME, 0, null);
    let fileInfo;
    let menuItems = [];
    while ((fileInfo = iter.next_file(null)) != null) {
      let xletDir = iter.get_child(fileInfo);
      let poDir = xletDir.get_child("po");
      if (poDir.query_exists(null)) {
        let menuItem = new XletMenuItem(poDir, fileInfo.get_name());
        subMenuItem.menu.addMenuItem(menuItem);
      }
    }
  },
  
  _onOpen: function() {
    this._appletSubMenu.menu.removeAll();
    this._deskletSubMenu.menu.removeAll();
    this._extensionSubMenu.menu.removeAll();
    this._loadXlets("applets", this._appletSubMenu);
    this._loadXlets("desklets", this._deskletSubMenu);
    this._loadXlets("extensions", this._extensionSubMenu);
  }
}

Signals.addSignalMethods(XletTranslations.prototype);

function MyApplet(metadata, orientation, panel_height, instanceId) {
  this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,
  
  _init: function(metadata, orientation, panel_height, instanceId) {
    Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instanceId);
    this.set_applet_icon_symbolic_name("video-display-symbolic");
    this.set_applet_tooltip("Cinnamon Developer Tools");
    
    this.menuManager = new PopupMenu.PopupMenuManager(this, orientation);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    
    this.muffinDebugTopics = new MuffinDebugTopics();
    this.xletTranslations = new XletTranslations();
  },
  
  on_applet_added_to_panel: function() {
    this.menu.addMenuItem(this.muffinDebugTopics.subMenuItem);
    this.menu.addMenuItem(this.xletTranslations.subMenuItem);
    this.muffinDebugTopics.on_applet_added_to_panel();
  },
  
  on_applet_clicked: function(event) {
    this.xletTranslations._onOpen();
    this.menu.toggle();
  }
}

Signals.addSignalMethods(MyApplet.prototype);

function main(metadata, orientation, panel_height, instanceId) {
  return new MyApplet(metadata, orientation, panel_height, instanceId);
}
