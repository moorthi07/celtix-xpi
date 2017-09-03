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
 * Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

var kMarginNames = [
  'default',
  'sceneheading',
  'action',
  'character',
  'parenthetical',
  'dialog',
  'shot',
  'transition'
];

function Measure(magnitude, unit)
{
  this.magnitude = magnitude;
  this.unit = unit;
}

Measure.prototype.toMillimeters = function ()
{
  switch (this.unit)
  {
    case 'mm':
      return this.magnitude;
    case 'cm':
      return this.magnitude * 10;
    case 'in':
      return this.magnitude * 25.4;
    default:
      return -1;
  }
};

Measure.prototype.equals = function (measure)
{
  return this.toMillimeters() == measure.toMillimeters();
};

Measure.prototype.clone = function ()
{
  return new Measure(this.magnitude, this.unit);
};

Measure.prototype.toString = function ()
{
  return this.magnitude + (this.unit == 'in' ? "\"" : this.unit);
};

function defaultScriptStyle()
{
  // TODO: Get this from preferences
  var style = new ScriptStyle('http://celtx.com/style/templates/standard');
  // *** LOCALISE ME ***
  style.name = 'Standard';
  return style;
}

function ScriptStyle(uri)
{
  this.name           = '';
  this.uri            = uri;
  this.rightMargins   = new Array();
  this.leftMargins    = new Array();

  this.leftMargins['default']       = new Measure(1.5, 'in');
  this.leftMargins['sceneheading']  = new Measure(1.5, 'in');
  this.leftMargins['action']        = new Measure(1.5, 'in');
  this.leftMargins['character']     = new Measure(3.5, 'in');
  this.leftMargins['parenthetical'] = new Measure(3.0, 'in');
  this.leftMargins['dialog']        = new Measure(2.5, 'in');
  this.leftMargins['shot']          = new Measure(1.5, 'in');
  this.leftMargins['transition']    = new Measure(1.5, 'in');

  this.rightMargins['default']        = new Measure(1.0, 'in');
  this.rightMargins['sceneheading']   = new Measure(1.0, 'in');
  this.rightMargins['action']         = new Measure(1.0, 'in');
  this.rightMargins['character']      = new Measure(1.0, 'in');
  this.rightMargins['parenthetical']  = new Measure(3.0, 'in');
  this.rightMargins['dialog']         = new Measure(2.5, 'in');
  this.rightMargins['shot']           = new Measure(1.0, 'in');
  this.rightMargins['transition']     = new Measure(1.0, 'in');

  this.useContinued   = true;
  this.custom         = false;
}

ScriptStyle.prototype.equals = function (style)
{
  var equivalent = (this.useContinued == style.useContinued);
  if (!equivalent)
    return false;
  for (var i = 0; i < kMarginNames.length; i++)
  {
    if (!(this.leftMargins[kMarginNames[i]].equals(
          style.leftMargins[kMarginNames[i]])
      &&  this.rightMargins[kMarginNames[i]].equals(
          style.rightMargins[kMarginNames[i]])))
    {
      equivalent = false;
      break;
    }
  }
  return equivalent;
};

ScriptStyle.prototype.clone = function ()
{
  var style     = new ScriptStyle(null);
  style.name    = this.name;
  style.custom  = true;
  for (var i = 0; i < kMarginNames.length; i++)
  {
    style.leftMargins[kMarginNames[i]] =
      this.leftMargins[kMarginNames[i]].clone();
    style.rightMargins[kMarginNames[i]] =
      this.rightMargins[kMarginNames[i]].clone();
  }
  return style;
};

ScriptStyle.prototype.marginString = function (name, left, right)
{
  var defaultL = this.leftMargins['default'];
  var defaultR = this.rightMargins['default'];
  return name + " {\n  margin-left: "
    + (left ? left.magnitude + left.unit
            : defaultL.magnitude + defaultL.unit)
    + ";\n  margin-right: "
    + (right ? right.magnitude + right.unit
             : defaultR.magnitude + defaultR.unit)
    + ";\n}\n";
};

ScriptStyle.prototype.toString = function ()
{
  var str = "\n";
  for (var i = 0; i < kMarginNames.length; i++)
  {
    var name = kMarginNames[i];
    str += this.marginString('p.' + name, this.leftMargins[name],
      this.rightMargins[name]);
  }
  return str;
};

function measureFromRDF(model, uri)
{
  const magnitudeArc      = RES(Cx.NS_CX + 'magnitude');
  const unitArc           = RES(Cx.NS_CX + 'unit');

  var measureRsrc = RES(uri);
  var magnitude   = model.target(measureRsrc, magnitudeArc);
  var unit        = model.target(measureRsrc, unitArc);
  if (! (magnitude && unit))
    return null;

  return new Measure(magnitude.value, unit.value);
}

function measureToRDF(model, uri, measure)
{
  const magnitudeArc      = RES(Cx.NS_CX + 'magnitude');
  const unitArc           = RES(Cx.NS_CX + 'unit');

  var measureRsrc = RES(uri);
  setLiteralProp(model, measureRsrc, magnitudeArc, LIT(measure.magnitude));
  setLiteralProp(model, measureRsrc, unitArc, LIT(measure.unit));
}

function parseMeasure(str)
{
  var specs = str.match(/([0-9.]+)\s*([a-z]+|")?/);
  if (!specs)
  {
    dump("*** parseMeasure: Couldn't match at all -> " + specs + "\n");
    return null;
  }
  var magnitude = specs[1];
  var unit = 'in';
  if (specs[2] && specs[2] != '"')
    unit = specs[2];
  return new Measure(magnitude, unit);
}

function styleFromRDF(model, uri)
{
  const titleArc        = RES(Cx.NS_DC + 'title');
  const useContinuedArc = RES(Cx.NS_CX + 'styleUseContinued');

  var styleRsrc   = RES(uri);
  var titleRsrc   = model.target(styleRsrc, titleArc);
  var useContRsrc = model.target(styleRsrc, useContinuedArc);

  if (!titleRsrc)
    throw "styleFromRDF: no title for resource " + uri;

  var style = new ScriptStyle(uri);
  style.name = titleRsrc.value;
  style.useContinued = (useContRsrc != null && useContRsrc.value == 'true');

  for (var i = 0; i < kMarginNames.length; i++)
  {
    var name  = kMarginNames[i];
    var arcL  = RES(Cx.NS_CX + name + 'IndentLeft');
    var arcR  = RES(Cx.NS_CX + name + 'IndentRight');
    var rsrcL = model.target(styleRsrc, arcL);
    var rsrcR = model.target(styleRsrc, arcR);

    if (rsrcL)
      style.leftMargins[name]   = measureFromRDF(model, rsrcL.value);
    if (rsrcR)
      style.rightMargins[name]  = measureFromRDF(model, rsrcR.value);
  }

  return style;
}

function setRDFMargin(model, styleRsrc, marginArc, margin)
{
  var object = model.target(styleRsrc, marginArc);
  if (!object)
  {
    object = getRDFService().GetAnonymousResource();
    model.add(styleRsrc, marginArc, new RDFResource(object.value));
  }
  measureToRDF(model, object.value, margin);
}

function styleToRDF(model, style)
{
  const titleArc          = RES(Cx.NS_DC + 'title');
  const useContinuedArc   = RES(Cx.NS_CX + 'styleUseContinued');

  var rdfService = getRDFService();
  var styleRsrc = RES(style.uri);

  setLiteralProp(model, styleRsrc, titleArc, LIT(style.name));
  setLiteralProp(model, styleRsrc, useContinuedArc,
    style.useContinued ? LIT('true') : LIT('false'));

  for (var i = 0; i < kMarginNames.length; i++)
  {
    var name = kMarginNames[i];
    var arcL = RES(Cx.NS_CX + name + 'IndentLeft');
    var arcR = RES(Cx.NS_CX + name + 'IndentRight');
    setRDFMargin(model, styleRsrc, arcL, style.leftMargins[name]);
    setRDFMargin(model, styleRsrc, arcR, style.rightMargins[name]);
  }

  // If style.uri was initially null, it will have an anonymous id now
  style.uri = styleRsrc.value;
  return styleRsrc.value;
}

function getDOMStyle(doc)
{
  const CI = Components.interfaces;
  doc = doc.QueryInterface(CI.nsIDOMDocumentStyle);
  var sheets = doc.styleSheets;
  if (!sheets)
    return null;
  var sheet = null;
  for (var i = 0; i < sheets.length; i++)
  {
    // Internal style sheets are under STYLE nodes, external style sheets
    // are under LINK  nodes.
    if (sheets[i].ownerNode.nodeName == 'STYLE')
    {
      sheet = sheets[i].QueryInterface(CI.nsIDOMCSSStyleSheet);
      break;
    }
  }
  if (!sheet)
    return null;
  try
  {
    var style = new ScriptStyle(sheet.ownerNode.getAttribute('rdfuri'));
    style.name = sheet.title;
    var rules = sheet.cssRules;
    for (var i = 0; i < rules.length; i++)
    {
      var rule = rules[i];
      if (rule.type == CI.nsIDOMCSSRule.STYLE_RULE)
      {
        rule = rule.QueryInterface(CI.nsIDOMCSSStyleRule);
        var name = rule.selectorText.match(/p\.([a-z]+)/);
        if (name && name.length == 2)
        {
          name = name[1];
          var marginL = style.leftMargins[name];
          var marginR = style.rightMargins[name];
          if (marginL)
          {
            var styleText = rule.style.getPropertyValue('margin-left');
            var specifiedMargin = parseMeasure(styleText);
            if (specifiedMargin)
            {
              marginL.magnitude = specifiedMargin.magnitude;
              marginL.unit      = specifiedMargin.unit;
            }
          }
          if (marginR)
          {
            var styleText = rule.style.getPropertyValue('margin-right');
            var specifiedMargin = parseMeasure(styleText);
            if (specifiedMargin)
            {
              marginR.magnitude = specifiedMargin.magnitude;
              marginR.unit      = specifiedMargin.unit;
            }
          }
        }
      }
    }
    return style;
  }
  catch (ex)
  {
    dump("*** getDOMStyle: " + ex + "\n");
    return null;
  }
}

// Applies to any script created by Celtx before 0.8.9
function replaceOldStyleLinks(doc)
{
  var head = doc.getElementsByTagName('HEAD')[0];
  var links = head.getElementsByTagName('LINK');
  while (links.length > 0)
    head.removeChild(links[0]);
  var link = doc.createElement('LINK');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('type', 'text/css');
  link.setAttribute('href', 'chrome://celtx/content/scriptdefaults.css');
  head.appendChild(link);
}

function setDOMStyle(doc, style)
{
  const CI = Components.interfaces;
  doc = doc.QueryInterface(CI.nsIDOMHTMLDocument);
  // Enable next line when ready for editor
  // replaceOldStyleLinks(doc);
  var head = doc.getElementsByTagName('HEAD')[0];
  var oldStyles = head.getElementsByTagName('STYLE');
  if (oldStyles.length > 0)
    head.removeChild(oldStyles[0]);
  var newStyle = doc.createElement('STYLE');
  newStyle.setAttribute('type', 'text/css');
  newStyle.setAttribute('title', style.name);
  // Disable next line when ready for editor
  newStyle.setAttribute('media', 'print');
  if (style.uri)
    newStyle.setAttribute('rdfuri', style.uri);
  head.appendChild(newStyle);
  newStyle.appendChild(doc.createTextNode(style.toString()));
}

