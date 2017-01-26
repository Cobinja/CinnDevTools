const Applet = imports.ui.applet;
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

function MyApplet(metadata, orientation, panel_height) {
  this._init(metadata, orientation, panel_height);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,
  
  _init: function(metadata, orientation, panel_height) {
    Applet.IconApplet.prototype._init.call(this, orientation, panel_height);
    this.set_applet_icon_symbolic_name("video-display-symbolic");
    this.set_applet_tooltip("Cinnamon Developer Tools");
    
    this.menuManager = new PopupMenu.PopupMenuManager(this, orientation);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    
    this.muffinDebugTopics = new MuffinDebugTopics();
  },
  
  on_applet_added_to_panel: function() {
    this.menu.addMenuItem(this.muffinDebugTopics.subMenuItem);
    this.muffinDebugTopics.on_applet_added_to_panel();
  },
  
  on_applet_clicked: function(event) {
    this.menu.toggle();
  }
}

Signals.addSignalMethods(MyApplet.prototype);

function main(metadata, orientation, panel_height) {
  return new MyApplet(metadata, orientation, panel_height);
}
