// background.js
browser.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        console.log('[Clickbait Filter] Extension installed. Setting default values.');
        browser.storage.local.set({
            filterEnabled: true,
            selectedAction: 'grayOut', // 'grayOut' or 'hide'
            customKeywords: ['MUST WATCH', 'GONE WRONG', 'YOU WON\'T BELIEVE'], // Example default keywords
            maxEmojisSetting: 3,
            capitalizationThresholdSetting: 0.5,
            // Add any other settings that need defaults here
        }).then(() => {
            console.log('[Clickbait Filter] Default settings stored.');
        }).catch(error => {
            console.error('[Clickbait Filter] Error storing default settings:', error);
        });
    }
    // Can also handle 'update' reason if needed for migrations
    // else if (details.reason === 'update') {
    //    console.log('[Clickbait Filter] Extension updated.');
    // }
});

// Optional: Listen for messages from popup if needed for immediate actions
// browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
// if (message.action === "settingChanged") {
// console.log("A setting changed, potentially notify content scripts or take other actions.");
// browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
// if (tabs[0] && tabs[0].id) {
// browser.tabs.sendMessage(tabs[0].id, {action: "settingsUpdated"});
// }
// });
// }
// });
