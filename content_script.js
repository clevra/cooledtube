// content_script.js
if (typeof ClickbaitDetector === 'undefined') {
    console.error("[Clickbait Filter] ClickbaitDetector class not found.");
} else {
    const detector = new ClickbaitDetector();
    let currentSettings = {
        filterEnabled: true,
        selectedAction: 'grayOut',
        customKeywords: [],
        maxEmojisAllowed: 3,
        capitalizationThreshold: 0.5
    };

    const grayOutStyles = { opacity: '0.5', filter: 'grayscale(80%)' };
    const grayOutTitleStyles = { color: '#aaa !important' };

    let hiddenVideosLog = []; // Array to store {id, title} of hidden videos
    const MAX_HIDDEN_LOG_SIZE = 30;

    function applyAction(videoElement, titleElement, titleText) {
        if (!currentSettings.filterEnabled) {
            revertAction(videoElement, titleElement); // videoIdToUnhide is not passed here
            return;
        }

        const clickbaitOptions = {
            customKeywords: currentSettings.customKeywords,
            maxEmojisAllowed: currentSettings.maxEmojisAllowed,
            capitalizationThreshold: currentSettings.capitalizationThreshold
        };
        const result = detector.isClickbait(titleText, clickbaitOptions);

        if (result.clickbait) {
            const videoId = getVideoId(videoElement);
            // console.log('[Clickbait Filter] Detected:', titleText, 'Reasons:', result.reasons.join(', '));

            if (!videoElement.dataset.originalStyle) {
                videoElement.dataset.originalStyle = JSON.stringify({
                    opacity: videoElement.style.opacity || '',
                    filter: videoElement.style.filter || '',
                    display: videoElement.style.display || ''
                });
            }
            if (titleElement && !titleElement.dataset.originalStyle) {
                 titleElement.dataset.originalStyle = JSON.stringify({
                    color: titleElement.style.color || ''
                });
            }

            if (currentSettings.selectedAction === 'grayOut') {
                Object.assign(videoElement.style, grayOutStyles);
                if (titleElement) Object.assign(titleElement.style, grayOutTitleStyles);
                videoElement.dataset.cbActioned = 'grayOut';
                // If it was previously hidden, ensure it's removed from the log
                if (videoId) {
                    hiddenVideosLog = hiddenVideosLog.filter(v => v.id !== videoId);
                }
            } else if (currentSettings.selectedAction === 'hide') {
                videoElement.style.display = 'none';
                videoElement.dataset.cbActioned = 'hide';
                if (videoId && titleText) { // Ensure titleText is available
                    if (!hiddenVideosLog.find(v => v.id === videoId)) {
                        hiddenVideosLog.unshift({ id: videoId, title: titleText }); 
                        if (hiddenVideosLog.length > MAX_HIDDEN_LOG_SIZE) {
                            hiddenVideosLog.pop(); 
                        }
                    }
                }
            }
        } else {
            revertAction(videoElement, titleElement); // videoIdToUnhide is not passed here
        }
    }
    
    function revertAction(videoElement, titleElement, videoIdToUnhide) {
        if (videoElement.dataset.originalStyle) {
            try {
                const originalStyles = JSON.parse(videoElement.dataset.originalStyle);
                videoElement.style.opacity = originalStyles.opacity;
                videoElement.style.filter = originalStyles.filter;
                videoElement.style.display = originalStyles.display;
            } catch (e) { console.error("[Clickbait Filter] Error parsing original style for video element", e); }
            delete videoElement.dataset.originalStyle; 
        } else { 
            videoElement.style.opacity = '';
            videoElement.style.filter = '';
            videoElement.style.display = ''; 
        }

        if (titleElement && titleElement.dataset.originalStyle) {
            try {
                const originalTitleStyles = JSON.parse(titleElement.dataset.originalStyle);
                titleElement.style.color = originalTitleStyles.color;
            } catch (e) { console.error("[Clickbait Filter] Error parsing original style for title element", e); }
             delete titleElement.dataset.originalStyle;
        } else if (titleElement) {
            titleElement.style.color = ''; 
        }
        delete videoElement.dataset.cbActioned;

        const videoIdForLogRemoval = videoIdToUnhide || getVideoId(videoElement);
        if (videoIdForLogRemoval) {
             hiddenVideosLog = hiddenVideosLog.filter(v => v.id !== videoIdForLogRemoval);
        }
    }

    function processVideoElement(videoElement) {
        if (videoElement.dataset.cbUserUnhidden === 'true') {
            if (currentSettings.filterEnabled) {
                 const titleElement = videoElement.querySelector('a#video-title');
                 const titleText = titleElement ? titleElement.textContent.trim() : "";
                 if (titleText) { // Ensure titleText exists before checking
                    const clickbaitOptions = {
                        customKeywords: currentSettings.customKeywords,
                        maxEmojisAllowed: currentSettings.maxEmojisAllowed,
                        capitalizationThreshold: currentSettings.capitalizationThreshold
                    };
                    const result = detector.isClickbait(titleText, clickbaitOptions);
                    if (!result.clickbait) { 
                        delete videoElement.dataset.cbUserUnhidden;
                    } else {
                        return; 
                    }
                 } else { // No title, can't determine if still clickbait, respect unhide
                    return;
                 }
            } else { 
                delete videoElement.dataset.cbUserUnhidden;
            }
        }

        // If filter is disabled, and the element was previously actioned, it needs reverting.
        if (!currentSettings.filterEnabled && videoElement.dataset.cbActioned) {
             const titleElement = videoElement.querySelector('a#video-title');
             revertAction(videoElement, titleElement);
             delete videoElement.dataset.cbProcessedThisSession; 
             return; 
        }
        
        if (!currentSettings.filterEnabled && !videoElement.dataset.cbActioned) {
            return;
        }
        
        const titleElement = videoElement.querySelector('a#video-title');
        if (titleElement && titleElement.textContent) {
            const titleText = titleElement.textContent.trim();
            applyAction(videoElement, titleElement, titleText);
            videoElement.dataset.cbProcessedThisSession = 'true'; 
        }
    }

    function processAllVisibleVideos() {
        document.querySelectorAll(
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer'
        ).forEach(videoElement => {
            delete videoElement.dataset.cbProcessedThisSession; 
            processVideoElement(videoElement);
        });
    }
    
    function getVideoId(videoElement) { 
        const titleLink = videoElement.querySelector('a#video-title');
        if (titleLink && titleLink.href) {
            try {
                const url = new URL(titleLink.href, window.location.origin);
                if (url.pathname === '/watch' && url.searchParams.has('v')) {
                    return url.searchParams.get('v');
                }
            } catch (e) { /* console.warn('[CBF] Invalid URL for title link:', titleLink.href, e) */ }
        }
        const thumbnailLink = videoElement.querySelector('a#thumbnail');
        if (thumbnailLink && thumbnailLink.href) {
             try {
                const url = new URL(thumbnailLink.href, window.location.origin);
                if (url.pathname === '/watch' && url.searchParams.has('v')) {
                    return url.searchParams.get('v');
                }
            } catch (e) { /* console.warn('[CBF] Invalid URL for thumbnail link:', thumbnailLink.href, e) */ }
        }
        return null;
    }

    browser.storage.local.get([
        'filterEnabled', 'selectedAction', 'customKeywords', 
        'maxEmojisSetting', 'capitalizationThresholdSetting'
    ]).then(settings => {
        currentSettings.filterEnabled = settings.filterEnabled !== undefined ? settings.filterEnabled : true;
        currentSettings.selectedAction = settings.selectedAction || 'grayOut';
        currentSettings.customKeywords = settings.customKeywords || [];
        currentSettings.maxEmojisAllowed = settings.maxEmojisSetting !== undefined ? settings.maxEmojisSetting : 3;
        currentSettings.capitalizationThreshold = settings.capitalizationThresholdSetting !== undefined ? settings.capitalizationThresholdSetting : 0.5;
        
        processAllVisibleVideos(); 
    }).catch(error => console.error('[CBF] Error loading initial settings:', error));

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            let settingsChanged = false;
            // Update currentSettings based on changes
            if (changes.filterEnabled !== undefined) { currentSettings.filterEnabled = changes.filterEnabled.newValue; settingsChanged = true; }
            if (changes.selectedAction !== undefined) { currentSettings.selectedAction = changes.selectedAction.newValue; settingsChanged = true; }
            if (changes.customKeywords !== undefined) { currentSettings.customKeywords = changes.customKeywords.newValue; settingsChanged = true; }
            if (changes.maxEmojisSetting !== undefined) { currentSettings.maxEmojisAllowed = changes.maxEmojisSetting.newValue; settingsChanged = true; }
            if (changes.capitalizationThresholdSetting !== undefined) { currentSettings.capitalizationThreshold = changes.capitalizationThresholdSetting.newValue; settingsChanged = true; }

            if (settingsChanged) {
                processAllVisibleVideos();
            }
        }
    });

    const observer = new MutationObserver(mutations => {
        let newVideosAdded = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.matches('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer') || node.querySelector('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer'))) {
                        newVideosAdded = true;
                    }
                });
            }
        }
        if (newVideosAdded) {
            document.querySelectorAll(
                'ytd-rich-item-renderer:not([data-cb-processed-this-session]), ' +
                'ytd-video-renderer:not([data-cb-processed-this-session]), ' +
                'ytd-compact-video-renderer:not([data-cb-processed-this-session])'
            ).forEach(videoElement => {
                 processVideoElement(videoElement);
            });
        }
    });
    
    const mainContentArea = document.querySelector('ytd-page-manager') || document.body;
    observer.observe(mainContentArea, { childList: true, subtree: true });
    
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "getHiddenVideos") {
            if (currentSettings.selectedAction === 'hide') {
                sendResponse({ success: true, hiddenVideos: hiddenVideosLog });
            } else {
                sendResponse({ success: true, hiddenVideos: [] }); 
            }
            return true; 
        } 
        else if (message.action === "unhideVideo" && message.videoId) {
            const videoIdToUnhide = message.videoId;
            let unhiddenOnPage = false;
            document.querySelectorAll( // Query for elements that are currently actioned as 'hide'
                'ytd-rich-item-renderer[data-cb-actioned="hide"], ' +
                'ytd-video-renderer[data-cb-actioned="hide"], ' +
                'ytd-compact-video-renderer[data-cb-actioned="hide"]'
            ).forEach(videoElement => {
                const videoId = getVideoId(videoElement);
                if (videoId === videoIdToUnhide) {
                    const titleElement = videoElement.querySelector('a#video-title');
                    revertAction(videoElement, titleElement, videoIdToUnhide); 
                    videoElement.dataset.cbUserUnhidden = 'true'; 
                    unhiddenOnPage = true;
                }
            });
            
            const initialLogLength = hiddenVideosLog.length;
            hiddenVideosLog = hiddenVideosLog.filter(v => v.id !== videoIdToUnhide); // Ensure removal from log regardless
            const removedFromLog = hiddenVideosLog.length < initialLogLength;

            if (unhiddenOnPage) {
                sendResponse({ success: true, message: "Video unhidden on page." });
            } else if (removedFromLog) {
                sendResponse({ success: true, message: "Video removed from hidden log (element not found or not actioned as 'hide' on page)." });
            } else {
                sendResponse({ success: false, message: "Video not found with that ID in hidden log." });
            }
            return true; 
        }
    });

    console.log('[CBF] Content script initialized. Settings, listener, and observer active.');
}
