// Search bar functions

function URLBarFocusHandler(aEvent, aElt)
{
}

function URLBarMouseDownHandler(aEvent, aElt)
{
}

function URLBarClickHandler(aEvent, aElt)
{
}

function SearchLoadURL(aURL, aTriggeringEvent)
{
  window.openDialog("chrome://browser/content/", "searchbrowser",
    Cx.NEW_WINDOW_FLAGS, aURL);
}
