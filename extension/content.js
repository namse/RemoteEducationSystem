document.addEventListener("captureRequestEvent", function(e) {
    if (e.detail.from === "class.js") {
        var outMessage = {
            from: "content.js",
            data: "captureRequest"
        };
        chrome.runtime.sendMessage(outMessage);
    }
});


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.from === "background.js") {
        var event = new CustomEvent("captureResponseEvent", {
            detail: {
                from: "content.js",
                data: message.data
            }
        });
        document.dispatchEvent(event);

    }
});