var imageUrl = null;
var _fileName;
var _photoData;
var _accToken;
var _photoObject;
var _docObject;
var _userId;
var _uids = [];
var _allFriendsArr = [];

var gid;

/*

https://api.vk.com/method/friends.get?fields=uid,first_name,last_name,photo,online,last_seen&order=hints

30666517

https://api.vk.com/method/photos.getAlbums?gid=30666517

https://api.vk.com/method/photos.get?gid=30666517&aid=wall&limit=200

https://api.vk.com/method/photos.get?uid=132185825&aid=169740147&limit=10
132185825_169740147

*/

window.onload = function() {
    var params = window.location.hash.substring(1).split('&');
    if (params && params.length == 1) {
        _accToken = params[0];
    } else {
        thereIsAnError('Parsing image url', 'params || params.length != 1');
    }


    request("GET", "https://api.vk.com/method/getUserInfo?a=1", function(event) {
        var answer = JSON.parse(event.target.response);
        if (answer.response) {
            _userId = answer.response.user_id;
        } else {
            thereIsAnError("Ошибка при получении данных");
        }
    });


    var runButton = document.getElementById("runButton");
    runButton.onclick = commandEntered;

    var checkPhotoUrlsButton = document.getElementById("checkPhotoUrls");
    checkPhotoUrlsButton.onclick = checkPhotoUrls;

    document.getElementById("loadPhoto").onclick = showPhotoLinks;

    document.getElementById("syncCaptions").onclick = syncCaptions;
};

function commandEntered(event) {
    var commandInput = document.getElementById("commandInput");

    request("GET", commandInput.value, function(event) {
        var resultDiv = document.getElementById("resultDiv");
        var answer = JSON.parse(event.target.response);
        if (answer.response) {
            resultDiv.innerHTML = JSON.stringify(answer.response);
            console.log(answer.response);
        } else {
            resultDiv.innerHTML = JSON.stringify(answer);
        }
    });
}


function syncCaptions() {
    var uid = _userId;
    gid = document.getElementById("gidInput").value;
    var aid = document.getElementById("albumIdInput").value;

    var secondGid = document.getElementById("secondGidInput").value;
    var secondAid = document.getElementById("secondAlbumId").value;

    var url = "https://api.vk.com/method/photos.get?aid=" + aid +
        ((gid) ? "&gid=" + gid :
        (uid) ? "&uid=" + uid : "") +
        "&limit=0";

    var resultDiv = document.getElementById("checkPhotoResultDiv");
    request("GET", url, function(event) {
        var answer = JSON.parse(event.target.response);
        if (answer.response) {
            var data = answer.response;

            resultDiv.innerHTML = "Найдено " + data.length + " фото, производится анализ";

            var url = "https://api.vk.com/method/photos.get?aid=" + secondAid +
                ((secondGid) ? "&gid=" + secondGid : "") +
                "&limit=0";
            request("GET", url, function(event) {
                var answer = JSON.parse(event.target.response);
                if (answer.response) {
                    var secondAlbumData = answer.response;

                    resultDiv.innerHTML += "<br>Во втором альбоме найдено " + secondAlbumData.length + " фото, производится анализ";

                    var urls = [];
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].text == "") {
                            var caption = secondAlbumData[i].text;
                            var id_start = caption.indexOf("id=");

                            if (id_start > 0) {
                                var id = caption.substring(id_start, id_start + 14);
                                var caption = "http://item.taobao.com/item.htm?" + id;
                                var caption = encodeURIComponent(caption);

                                var url = "https://api.vk.com/method/photos.edit?pid=" + data[i].pid +
                                    ((gid) ? "&owner_id=-" + gid : "") +
                                    "&caption=" + caption;
                                urls.push(url);
                            }
                        }
                    }

                    console.log(urls);

                    var counter = urls.length;
                    var delay = 300;

                    var markPhoto = function(urls) {
                        counter--;

                        if (counter < 0) {
                            resultDiv.innerHTML += "<br>Готово";
                            return;
                        } else {
                            console.log("Отмечаем фото...");
                            request("GET", urls[counter], function(event) {
                                var answer = JSON.parse(event.target.response);
                                if (answer.response) {
                                    setTimeout(markPhoto.bind(null, urls), delay);
                                } else {
                                    switch (answer.error.error_code) {
                                        case 14:
                                            //Captcha

                                            showCaptchaModal(answer.error.captcha_img, function(text) {
                                                captcha_sid = answer.error.captcha_sid;
                                                captcha_key = text;

                                                var url = urls[counter];
                                                url += "&captcha_sid=" + captcha_sid + "&captcha_key=" + captcha_key;
                                                urls[counter] = url;
                                                counter++;

                                                setTimeout(markPhoto.bind(null, urls), 10);
                                            });

                                            break;
                                        case 6:
                                            //Too many requests per second.
                                            counter++;
                                            setTimeout(markPhoto.bind(null, urls), 2000);
                                            break;
                                        default:
                                            console.log(answer);
                                    }
                                }
                            });
                        }
                    };

                    setTimeout(markPhoto.bind(null, urls), delay);

                }
            });
        } else {
            resultDiv.innerText += "Произошла ошибка:<br>" + JSON.stringify(answer);
        }
    });
}


function request(method, url, callback) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onload = callback;
    httpRequest.open(method, url +
        "&access_token=" + _accToken
    );
    httpRequest.send();
}





function getObjectDescription(object) {
    var res = "";
    for (var prop in object) {
        res += prop + "(" + (typeof prop) + "): " + object[prop] + "\n";
    }
    return res;
}

function hasClass(ele, cls) {
    return ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}

function addClass(ele, cls) {
    if (!this.hasClass(ele, cls)) ele.className += " " + cls;
}

function removeClass(ele, cls) {
    if (hasClass(ele, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        ele.className = ele.className.replace(reg, ' ');
    }
}




function thereIsAnError(textToShow, errorToShow) {
    // document.getElementById('error_message').innerHTML = '<p></p><br/><br/><center><h1>Wow! Some error arrived!</h1></center><br/><br/><p>' + textToShow + '</p><br/><br/><p>' + errorToShow + '</p><p>' + imageUrl + '</p>';
    var errorDim = document.getElementById('error_message');
    var div = document.createElement("div");
    div.className = "alert alert-danger";

    var errorDescription = chrome.i18n.getMessage("error_message_title");

    div.innerHTML = "<b>" + errorDescription + "</b><br />" +
        textToShow + "<br />" +
        errorToShow;

    errorDim.appendChild(div);
    errorDim.style.display = "block";

    document.getElementById('main_content').style.display = "none";
}




function checkPhotoUrls(event) {
    var uid = _userId;
    gid = document.getElementById("gidInput").value;
    var aid = document.getElementById("albumIdInput").value;

    var url = "https://api.vk.com/method/photos.get?aid=" + aid +
        ((gid) ? "&gid=" + gid :
        (uid) ? "&uid=" + uid : "") +
        "&limit=0";

    var resultDiv = document.getElementById("checkPhotoResultDiv");
    request("GET", url, function(event) {
        var answer = JSON.parse(event.target.response);
        if (answer.response) {
            var links = [];
            var data = answer.response;

            resultDiv.innerHTML = "Найдено " + data.length + " фото, производится анализ";
            for (var i = 0; i < data.length; i++) {
                if (data[i].text) {
                    var str = data[i].text;
                    var id_start = str.indexOf("id=");

                    if (id_start > 0) {
                        var id = str.substring(id_start, id_start + 14);
                        var url = "http://item.taobao.com/item.htm?" + id;
                        console.log(url);
                        links.push({
                            url: url,
                            photo: data[i]
                        });
                    }
                }
            };
            resultDiv.innerHTML += "<br>Найдено " + links.length + " фото со ссылками. Начинается проверка...";
            checkLinks(links, function(brokenLinks) {
                resultDiv.innerHTML += "<br>Найдено " + brokenLinks.length + " нерабочих ссылок.";

                resultDiv.innerHTML += "<br>Начинаем отмечать фото...";

                markNotFound(brokenLinks, function() {
                    resultDiv.innerHTML += "<br>Закончили";
                });
            });
        } else {
            resultDiv.innerText += "Произошла ошибка:<br>" + JSON.stringify(answer);
        }
    });
}


function checkLinks(links, callback) {
    var brokenLinks = [];
    var counter = links.length;
    for (var i = 0; i < links.length; i++) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onload = function(link, event) {
            // tb-action
            var message;
            var response = event.target.response;
            if (response) {
                if (response.indexOf("tb-action") !== -1) {
                    message = "Найдено.";
                } else {
                    brokenLinks.push(link);
                    message = "Не найдено.";
                }
                console.log("Проверяем " + link.url, ". " + message);
            }

            counter--;
            if (counter === 0) {
                callback(brokenLinks);
            }
        }.bind(null, links[i]);
        httpRequest.open("GET", links[i].url);
        httpRequest.send();
    }
}


function markNotFound(brokenLinks, callback) {

    var urls = [];
    for (var i = 0; i < brokenLinks.length; i++) {
        var notFoundText = "(Недоступно)";
        var oldText = brokenLinks[i].photo.text;
        if (oldText.indexOf(notFoundText) === -1) {
            var newText = brokenLinks[i].url + " " + notFoundText;
            var pid = brokenLinks[i].photo.pid;
            var url = "https://api.vk.com/method/photos.edit?pid=" + pid +
                ((gid) ? "&owner_id=-" + gid : "") +
                "&caption=" + newText;
            urls.push(url);
        }
    };

    console.log("Не отмечены " + urls.length + " фото. Начинаем отмечать...");

    var counter = urls.length;
    var delay = 300;

    var markPhoto = function(urls) {
        counter--;

        if (counter < 0) {
            callback();
            return;
        } else {
            console.log("Отмечаем фото...");
            request("GET", urls[counter], function(event) {
                var answer = JSON.parse(event.target.response);
                if (answer.response) {
                    setTimeout(markPhoto.bind(null, urls), delay);
                } else {
                    switch (answer.error.error_code) {
                        case 14:
                            //Captcha

                            showCaptchaModal(answer.error.captcha_img, function(text) {
                                captcha_sid = answer.error.captcha_sid;
                                captcha_key = text;

                                var url = urls[counter];
                                url += "&captcha_sid=" + captcha_sid + "&captcha_key=" + captcha_key;
                                urls[counter] = url;
                                counter++;

                                setTimeout(markPhoto.bind(null, urls), 10);
                            });

                            break;
                        case 6:
                            //Too many requests per second.
                            counter++;
                            setTimeout(markPhoto.bind(null, urls), 2000);
                            break;
                        default:
                            console.log(answer);
                    }
                }
            });
        }
    };

    setTimeout(markPhoto.bind(null, urls), delay);
}


function showCaptchaModal(url, callback) {
    document.getElementById("captchaImg").src = url;
    var textInput = document.getElementById("captchaText");
    textInput.value = "";
    setTimeout(function() {
        textInput.focus();
    }, 300);

    var sendText = function() {
        var text = textInput.value;
        callback(text);
        $('#captchaForm').modal('hide');
    };

    document.getElementById("captchaOk").onclick = sendText;

    textInput.onkeypress = function(event) {
        if (event.keyCode == 13) {
            sendText();
            return false;
        }
    };


    $('#captchaForm').modal();

}






function showPhotoLinks(event) {
    var uid = _userId;
    gid = document.getElementById("gidInput").value;
    var aid = document.getElementById("albumIdInput").value;
    var limit = document.getElementById("limitInput").value;
    var offset = document.getElementById("offsetInput").value;

    var url = "https://api.vk.com/method/photos.get?aid=" + aid +
        ((gid) ? "&gid=" + gid :
        (uid) ? "&uid=" + uid : "") +
        "&limit=" + (limit ? limit : "0") +
        "&offset=" + (offset ? offset : "0");

    var resultDiv = document.getElementById("checkPhotoResultDiv");
    request("GET", url, function(event) {
        var answer = JSON.parse(event.target.response);
        if (answer.response) {
            var data = answer.response;
            console.log(data);

            resultDiv.innerHTML = "Найдено " + data.length + " фото:";
            for (var i = 0; i < data.length; i++) {
                var dataRow = data[i];
                var imageSrc = dataRow.src_xxbig || dataRow.src_xbig || dataRow.src_big || src_small || null;
                if (imageSrc) {
                    resultDiv.innerHTML += "<br><a href='" + imageSrc + "'>" + imageSrc + "</a>";
                }
            };
        } else {
            resultDiv.innerText += "Произошла ошибка:<br>" + JSON.stringify(answer);
        }
    });
}