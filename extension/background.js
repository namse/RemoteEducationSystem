/*var IMG_MIMETYPE = 'images/jpeg'; // Update to image/webp when crbug.com/112957 is fixed.
var IMG_QUALITY = 80; // [0-100]
var SEND_INTERVAL = 250; // ms

var ws = new WebSocket('ws://localhost:10240');
ws.binaryType = 'blob';

function captureAndSendTab() {
  var opts = {format: IMG_MIMETYPE, quality: IMG_QUALITY};
  chrome.tabs.captureVisibleTab(null, opts, function(dataUrl) {
    // captureVisibleTab returns a dataURL. Decode it -> convert to blob -> send.
    ws.send(convertDataURIToBlob(dataUrl, IMG_MIMETYPE));
  });
}

var intervalId = setInterval(function() {
  if (ws.bufferedAmount == 0) {
    captureAndSendTab();
  }
}, SEND_INTERVAL);
*/
var IMG_MIMETYPE = 'jpeg'; // Update to image/webp when crbug.com/112957 is fixed.
var IMG_QUALITY = 80; // [0-100]

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.from === "content.js") {
        if (message.data === "captureRequest") {
            var opts = {
                format: IMG_MIMETYPE,
                quality: IMG_QUALITY
            };
            chrome.tabs.captureVisibleTab(null, opts, function(dataUrl) {
                // captureVisibleTab returns a dataURL. Decode it -> convert to blob -> send.
                var outMessage = {
                    from: "background.js",
                    data: dataUrl
                };
                chrome.tabs.query({
                        currentWindow: true,
                        active: true
                    },
                    function(tabArray) {
                        console.log(tabArray);
                        chrome.tabs.sendMessage(tabArray[0].id, outMessage);
                    }
                );
            });
        }
    }
});