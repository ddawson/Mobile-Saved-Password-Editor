/*
    Mobile Saved Password Editor, extension for Mozilla Fennec
    Copyright (C) 2011  Daniel Dawson <ddawson@icehouse.net>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var MobileSavedPasswordEditor = {
  _dialog: null,
  _oldLoginInfo: null,
  _loginMap: null,
  _deleting: false,

  el: function (aEl) document.getElementById(aEl),

  get _hostname () {
    delete this._hostname;
    return this._hostname =
      this.el("mobilesavedpasswordeditor-editor-hostname");
  },

  get _formSubmitURL () {
    delete this._formSubmitURL;
    return this._formSubmitURL =
      this.el("mobilesavedpasswordeditor-editor-formsubmiturl");
  },

  get _username () {
    delete this._username;
    return this._username =
      this.el("mobilesavedpasswordeditor-editor-username");
  },

  get _password () {
    delete this._password;
    return this._password =
      this.el("mobilesavedpasswordeditor-editor-password");
  },

  get _usernameField () {
    delete this._usernameField;
    return this._usernameField =
      this.el("mobilesavedpasswordeditor-editor-usernamefield");
  },

  get _passwordField () {
    delete this._passwordField;
    return this._passwordField =
      this.el("mobilesavedpasswordeditor-editor-passwordfield");
  },

  get disambigBox () {
    delete this.disambigBox;
    return this.disambigBox =
      this.el("mobilesavedpasswordeditor-disambig-container");
  },

  get disambigPopup () {
    delete this.disambigPopup;
    return this.disambigPopup =
      this.el("mobilesavedpasswordeditor-disambig-popup");
  },

  get editorBox () {
    delete this.editorBox;
    return this.editorBox =
      this.el("mobilesavedpasswordeditor-editor-container");
  },

  onLoad: function () {
    window.messageManager.loadFrameScript(
      "chrome://mobilesavedpasswordeditor/content/frameScript.js", true);
  },

  showAlert: function (aTitle, aText) {
    var toaster = Cc["@mozilla.org/toaster-alerts-service;1"].
                  getService(Ci.nsIAlertsService);
    toaster.showAlertNotification(
      "chrome://mobilesavedpasswordeditor/skin/key32.png", aTitle, aText);
  },

  saveLogin: function () {
    var mspe = ContextHelper.popupState.mobileSavedPasswordEditor;
    ContextHelper.hide();
    this._loadLoginInfo(mspe);
    this._oldLoginInfo = null;

    if (!Services.prefs.getBoolPref(
          "extensions.mobilesavedpasswordeditor.alwaysshoweditor")
        && this._username.value != "" && this._password.value != "") {
      this._saveDialogData();
    } else {
      this._showEditor();
    }
  },

  editLogin: function () {
    var mspe = ContextHelper.popupState.mobileSavedPasswordEditor;
    ContextHelper.hide();
    var matchData = Cc["@mozilla.org/hash-property-bag;1"].
                    createInstance(Ci.nsIWritablePropertyBag);
    matchData.setProperty("hostname", mspe.hostname);
    matchData.setProperty("formSubmitURL", mspe.formSubmitURL);
    matchData.setProperty("httpRealm", null);
    try {
      var loginList = this.loginMgr.searchLogins({}, matchData);
    } catch (e) {
      return;
    }

    this._deleting = false;
    if (loginList.length == 0) {
      this.showAlert(
        this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
        this.strings.GetStringFromName("nologinstoedit.text"));
      return;
    } else if (loginList.length == 1) {
      this._oldLoginInfo = loginList[0];
      this._loadLoginInfo(this._oldLoginInfo);
      this._showEditor();
    } else {
      this._loginMap = {};
      for each (li in loginList)
        this._loginMap[li.username] = li;
      this._showDisambigList(loginList);
    }
  },

  deleteLogin: function () {
    var mspe = ContextHelper.popupState.mobileSavedPasswordEditor;
    ContextHelper.hide();
    var matchData = Cc["@mozilla.org/hash-property-bag;1"].
                    createInstance(Ci.nsIWritablePropertyBag);
    matchData.setProperty("hostname", mspe.hostname);
    matchData.setProperty("formSubmitURL", mspe.formSubmitURL);
    matchData.setProperty("httpRealm", null);
    try {
      var loginList = this.loginMgr.searchLogins({}, matchData);
    } catch (e) {
      return;
    }

    this._deleting = true;
    if (loginList.length == 0) {
      this.showAlert(
        this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
        this.strings.GetStringFromName("nologinstodelete.text"));
      return;
    } else if (loginList.length == 1) {
      this._loadLoginInfo(loginList[0]);
      this._deleteSelected();
    } else {
      this._loginMap = {};
      for each (li in loginList)
        this._loginMap[li.username] = li;
      this._showDisambigList(loginList);
    }
  },

  _showDisambigList: function (aLoginList) {
    var listbox = this.el("mobilesavedpasswordeditor-disambig-list");
    while (listbox.hasChildNodes())
      listbox.removeChild(listbox.firstChild);

    var thisObj = this;
    for (var i = 0; i < aLoginList.length; i++) {
      let rli = document.createElement("richlistitem");
      rli.classList.add("context-command");
      let li = aLoginList[i];
      rli.addEventListener("click", this, false);

      let lbl = document.createElement("label");
      lbl.setAttribute("value", aLoginList[i].username);
      rli.appendChild(lbl);
      listbox.appendChild(rli);
    }

    this.resizeDisambigList();
    this.disambigBox.hidden = false;
    BrowserUI.pushPopup(this, [this.disambigPopup]);

    window.addEventListener("resize", this, true);
    this.disambigBox.addEventListener("click", this, false);
  },

  hideDisambigList: function () {
    this.disambigBox.removeEventListener("click", this, false);
    window.removeEventListener("resize", this, true);
    this._loginMap = null;
    var listbox = this.el("mobilesavedpasswordeditor-disambig-list");
    while (listbox.hasChildNodes()) {
      let item = listbox.firstChild;
      item.removeEventListener("click", this, false);
      listbox.removeChild(listbox.firstChild);
    }
    BrowserUI.popPopup(this);
    this.disambigBox.hidden = true;
  },

  _showEditor: function () {
    if (Services.prefs.getBoolPref(
          "extensions.mobilesavedpasswordeditor.showpassword"))
      this._password.type = "text";
    this.showLess();
    this.editorBox.hidden = false;
    BrowserUI.pushDialog(this);
    if (this._username.value == "")
      this._username.focus();
    else
      this._password.select();
  },

  showMore: function () {
    this.el("mobilesavedpasswordeditor-editor-upper-box").hidden = false;
    this.el("mobilesavedpasswordeditor-editor-lower-box").hidden = false;
    this.el("mobilesavedpasswordeditor-editor-morebutton").hidden = true;
    this.el("mobilesavedpasswordeditor-editor-lessbutton").hidden = false;
  },

  showLess: function () {
    this.el("mobilesavedpasswordeditor-editor-upper-box").hidden = true;
    this.el("mobilesavedpasswordeditor-editor-lower-box").hidden = true;
    this.el("mobilesavedpasswordeditor-editor-morebutton").hidden = false;
    this.el("mobilesavedpasswordeditor-editor-lessbutton").hidden = true;
  },

  acceptDialog: function () {
    this._hideEditor();
    this._saveDialogData();
    this._scrubEditor();
  },

  cancelDialog: function () {
    this._hideEditor();
    this._scrubEditor();
  },

  _saveDialogData: function () {
    var newLoginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].
                       createInstance(Ci.nsILoginInfo);
    newLoginInfo.init(
      this._hostname.value,
      this._formSubmitURL.value,
      null,
      this._username.value,
      this._password.value,
      this._usernameField.value,
      this._passwordField.value);

    try {
      if (this._oldLoginInfo)
        this.loginMgr.modifyLogin(this._oldLoginInfo, newLoginInfo);
      else
        this.loginMgr.addLogin(newLoginInfo);
    } catch (e) {
      this.showAlert(
        this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
        this.strings.GetStringFromName("failedtosavelogininfo.text"));
      return;
    }

    this.showAlert(
      this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
      this.strings.GetStringFromName("logininfosaved.text"));
  },

  _hideEditor: function () {
    this._password.type = "password";
    BrowserUI.popDialog();
    this.editorBox.hidden = true;
  },

  _scrubEditor: function () {
    this._hostname.value = this._formSubmitURL.value = this._username.value =
      this._password.value = this._usernameField.value =
      this._passwordField.value = "";
  },

  _deleteSelected: function () {
    var newLoginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].
                       createInstance(Ci.nsILoginInfo);
    newLoginInfo.init(
      this._hostname.value,
      this._formSubmitURL.value,
      null,
      this._username.value,
      this._password.value,
      this._usernameField.value,
      this._passwordField.value);

    try {
      this.loginMgr.removeLogin(newLoginInfo);
    } catch (e) {
      this.showAlert(
        this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
        this.strings.GetStringFromName("failedtodeletelogininfo.text"));
      return;
    }

    this.showAlert(
      this.strings.GetStringFromName("mobilesavedpasswordeditor.title"),
      this.strings.GetStringFromName("logininfodeleted.text"));
  },

  handleEvent: function (ev) {
    if (ev.type == "click") {
      let target = ev.target;
      if (target.tagName == "richlistitem")
        target = target.firstChild;
      else if (target == this.disambigBox) {
        this.hideDisambigList();
        return;
      } else if (target.tagName != "label")
        return;

      this._oldLoginInfo = this._loginMap[target.value];
      this._loadLoginInfo(this._oldLoginInfo);
      if (!this._deleting)
        this._showEditor();
      else
        this._deleteSelected();

      this.hideDisambigList();
    } else if (ev.type == "resize")
      this.resizeDisambigList();
  },

  resizeDisambigList: function () {
    var style = window.getComputedStyle(this.disambigBox, null);
    this.disambigPopup.width = window.innerWidth
      - (parseInt(style.paddingLeft) + parseInt(style.paddingRight));
  },

  _loadLoginInfo: function (aLi) {
    this._hostname.value = aLi.hostname;
    this._formSubmitURL.value = aLi.formSubmitURL;
    this._username.value = aLi.username;
    this._password.value = aLi.password;
    this._usernameField.value = aLi.usernameField;
    this._passwordField.value = aLi.passwordField;
  },
};

XPCOMUtils.defineLazyGetter(
  MobileSavedPasswordEditor, "strings", function ()
    Services.strings.createBundle(
      "chrome://mobilesavedpasswordeditor/locale/browserOverlay.properties"));
XPCOMUtils.defineLazyServiceGetter(
  MobileSavedPasswordEditor, "loginMgr",
  "@mozilla.org/login-manager;1", "nsILoginManager");

window.addEventListener("load", MobileSavedPasswordEditor.onLoad, false);
