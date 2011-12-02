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

ContextHandler.registerType("mspe-form", function (aState, aElement) {
  if (aElement instanceof Ci.nsIDOMHTMLInputElement && aElement.form) {
    var form = aElement.form;
  } else
    return false;

  var curDoc = content.document;
  var curLocation = curDoc.defaultView.location;
  var hostname = curLocation.protocol + "//" + curLocation.host;
  var passwordField = null;
  for (var i = 0; i < form.elements.length; i++) {
    let element = form.elements[i];
    if (element instanceof Ci.nsIDOMHTMLInputElement
        && element.type == "password") {
      passwordField = element;
      break;
    }
  }
  if (!passwordField) return false;

  var usernameField = null;
  for (i = i - 1; i >= 0; i--) {
    let element = form.elements[i];
    let elType = element.getAttribute("type");
    if (!elType || elType == "text" || elType == "email" || elType == "url"
        || elType == "tel" || elType == "number") {
      usernameField = element;
      break;
    }
  }
  if (!usernameField) return false;

  var formAction = form.action;
  var res = formAction ? /^([0-9-_A-Za-z]+:\/\/[^/]+)\//.exec(formAction)[1]
                       : hostname;

  aState.mobileSavedPasswordEditor = {
    hostname: hostname,
    formSubmitURL: res,
    username: usernameField.value,
    password: passwordField.value,
    usernameField: usernameField.name,
    passwordField: passwordField.name,
  };
  return true;
});
