var authTabId;
var vkToken;
var imageURL;
var getNewToken = true;



chrome.browserAction.onClicked.addListener(function () {
	if (!vkToken) {
		chrome.storage.local.get({'vkaccess_token': {}}, function (items) {
			if ((items['vkaccess_token'].length > 0) && (!getNewToken)) {
				vkToken = items['vkaccess_token'];
				showMainWindow();
			}
			else {
				getVkAccesToken();
			}
		});
	}
	else {
		showMainWindow();
	}
});


function showMainWindow() {
	// checkAuth();

	var loadUrl = 'upload.html#' + vkToken;
	// alert(loadUrl);
	
	var left = 100;
	var top = 100;
	var width = 790;
	var height = 560;

	chrome.storage.local.get({'windowCoord': {}}, function (items) {
		if (items['windowCoord'])
		{
			var coords = items['windowCoord'];
			if (coords.x)
				left = coords.x;
			if (coords.y)
				top = coords.y;
			if (coords.h)
				height = coords.h;
		}

		// var wnd = chrome.tabs.create({
		// 	"url": loadUrl, 
		// 	"selected": true

		var wnd = chrome.windows.create({
			"url": loadUrl, 
			"type": "panel",
			"width": width,
			"height": height,
			"left": left,
			"top": top
		}, function(window) {});
	});
}

function checkAuth() {
	var getUserRequest = new XMLHttpRequest();
	getUserRequest.open('GET', 'https://api.vk.com/method/users.get?uids=1&access_token=' + _accToken);
	getUserRequest.onload = onGetUserRequest;
	getUserRequest.send();
}

function onGetUserRequest(event) {
	var answer = JSON.parse(event.target.response);
	if ((!answer) || (!answer.response))
	{
		getVkAccesToken();
	}
}

function getVkAccesToken() {
	var appId = "3879313";
	var scope = "photos,offline";
	var redirectUri = encodeURIComponent("http://oauth.vk.com/blank.html");
	
	var authUrl = "https://oauth.vk.com/authorize?client_id=" + appId + 
		"&scope=" + scope + 
		"&redirect_uri=" + redirectUri + 
		"&display=page&response_type=token";
	
	chrome.tabs.create({"url": authUrl, "selected": true}, function(tab)
	{
		authTabId = tab.id;
		chrome.tabs.onUpdated.addListener(function tabUpdateListener(tabId, changeInfo)
		{
			if (tabId == authTabId && changeInfo.url != undefined && changeInfo.status == "loading")
			{
				if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1 )
				{
					chrome.tabs.onUpdated.removeListener(tabUpdateListener);
					var accToken = getUrlParam(changeInfo.url, 'access_token');
					
					if(accToken != undefined && accToken.length > 0) {
						if(Number(getUrlParam(changeInfo.url, 'expires_in') == 0)) {
							vkToken = accToken;
							chrome.storage.local.set({'vkaccess_token': accToken}, function() {
								showMainWindow();
								chrome.tabs.remove(tabId);
							});
						}
						else {
							thereIsAnError('vk auth response problem', 'expiresIn != 0');
						}
					}
					else
					{
						thereIsAnError('vk auth response problem', 'access_token length = 0 or accToken == undefined');
					}
				}
			}
		});
	});
}

function getUrlParam(url, sname) {
	var params = url.substr(url.indexOf("#") + 1);
	var sval = "";
	params = params.split("&");
	for(var i = 0; i < params.length; i++)
	{
		temp = params[i].split("=");
		if([temp[0]] == sname)
		{
			sval = temp[1];
		}
	}
	return sval;
}


function thereIsAnError(textToShow, errorToShow)
{
	alert(textToShow + '\n' + errorToShow);
}
