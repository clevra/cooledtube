// popup/popup.js
document.addEventListener('DOMContentLoaded', () => {
    const masterToggle = document.getElementById('masterToggle');
    const actionGrayOut = document.getElementById('actionGrayOut');
    const actionHide = document.getElementById('actionHide');
    const statusMessage = document.getElementById('statusMessage');

    const newKeywordInput = document.getElementById('newKeywordInput');
    const addKeywordButton = document.getElementById('addKeywordButton');
    const customKeywordsList = document.getElementById('customKeywordsList');

    const maxEmojisAllowedInput = document.getElementById('maxEmojisAllowed');
    const capitalizationThresholdInput = document.getElementById('capitalizationThreshold');

    const recentlyHiddenSection = document.getElementById('recentlyHiddenSection');
    const refreshHiddenListButton = document.getElementById('refreshHiddenListButton');
    const recentlyHiddenListUL = document.getElementById('recentlyHiddenList');

    // New element for "Open Settings in New Tab"
    const openInTabLink = document.getElementById('openInTabLink');

    let currentKeywords = []; 

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'red' : 'green';
        setTimeout(() => statusMessage.textContent = '', isError ? 3000 : 2000);
    }

    function renderKeywords() {
        customKeywordsList.innerHTML = ''; 
        if (!currentKeywords || currentKeywords.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No custom keywords yet.';
            li.style.fontStyle = 'italic';
            li.style.textAlign = 'center';
            customKeywordsList.appendChild(li);
            return;
        }
        currentKeywords.forEach((keyword, index) => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            textSpan.textContent = keyword;
            textSpan.style.overflowWrap = 'break-word';
            textSpan.style.marginRight = '10px';

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.dataset.index = index;

            removeButton.addEventListener('click', (event) => {
                const keywordIndexToRemove = parseInt(event.target.dataset.index, 10);
                let updatedKeywords = [...currentKeywords]; 
                updatedKeywords.splice(keywordIndexToRemove, 1);

                browser.storage.local.set({ customKeywords: updatedKeywords }).then(() => {
                    currentKeywords = updatedKeywords; 
                    renderKeywords(); 
                    showStatus('Keyword removed.');
                }).catch(err => {
                    console.error("Error saving keywords after removal:", err);
                    showStatus('Error removing keyword.', true);
                });
            });

            li.appendChild(textSpan);
            li.appendChild(removeButton);
            customKeywordsList.appendChild(li);
        });
    }

    function renderHiddenVideoList(hiddenVideos) {
        recentlyHiddenListUL.innerHTML = ''; 
        if (!hiddenVideos || hiddenVideos.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No videos hidden in this session or action is not "Hide".';
            li.style.fontStyle = 'italic';
            li.style.textAlign = 'center';
            recentlyHiddenListUL.appendChild(li);
            return;
        }

        hiddenVideos.forEach(video => {
            const li = document.createElement('li');
            const titleSpan = document.createElement('span');
            titleSpan.className = 'video-title';
            titleSpan.textContent = video.title;
            titleSpan.title = video.title; 

            const unhideButton = document.createElement('button');
            unhideButton.textContent = 'Unhide';
            unhideButton.dataset.videoId = video.id;
            unhideButton.addEventListener('click', handleUnhideClick); 

            li.appendChild(titleSpan);
            li.appendChild(unhideButton);
            recentlyHiddenListUL.appendChild(li);
        });
    }
    
    async function handleUnhideClick(event) {
        const videoId = event.target.dataset.videoId;
        if (!videoId) return;

        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].id) {
                const response = await browser.tabs.sendMessage(tabs[0].id, { action: "unhideVideo", videoId: videoId });
                if (response && response.success) {
                    showStatus(response.message || 'Video unhidden.');
                    fetchAndDisplayHiddenVideos(); 
                } else {
                    showStatus(response.message || 'Failed to unhide video.', true);
                }
            } else {
                 showStatus('Cannot find active tab to send unhide command.', true);
            }
        } catch (error) {
            console.error('Error unhiding video:', error);
            if (error.message && error.message.includes("Could not establish connection")) {
                 showStatus('Error: Content script not responding. Try refreshing the YouTube page.', true);
            } else {
                showStatus('Error sending unhide command.', true);
            }
        }
    }

    async function fetchAndDisplayHiddenVideos() {
        if (recentlyHiddenSection.style.display === 'none') {
            renderHiddenVideoList([]); 
            return;
        }
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].id) {
                const response = await browser.tabs.sendMessage(tabs[0].id, { action: "getHiddenVideos" });
                if (response && response.success) {
                    renderHiddenVideoList(response.hiddenVideos);
                } else {
                    renderHiddenVideoList([]);
                    showStatus(response && response.message ? response.message : 'Could not fetch hidden videos list.', true);
                }
            } else {
               renderHiddenVideoList([]); 
               showStatus('Cannot find active tab to fetch hidden videos.', true);
            }
        } catch (error) {
            console.error('Error fetching hidden videos:', error);
            renderHiddenVideoList([]);
             if (error.message && error.message.includes("Could not establish connection")) {
                 showStatus('Error: Content script not responding. Try refreshing the YouTube page.', true);
            } else {
                showStatus('Error communicating with content script.', true);
            }
        }
    }
    
    refreshHiddenListButton.addEventListener('click', fetchAndDisplayHiddenVideos);

    browser.storage.local.get([
        'filterEnabled', 'selectedAction', 'customKeywords',
        'maxEmojisSetting', 'capitalizationThresholdSetting'
    ]).then(result => {
        masterToggle.checked = result.filterEnabled !== undefined ? result.filterEnabled : true;
        const currentAction = result.selectedAction || 'grayOut';
        if (currentAction === 'grayOut') actionGrayOut.checked = true;
        else if (currentAction === 'hide') actionHide.checked = true;

        currentKeywords = result.customKeywords || [];
        renderKeywords();

        maxEmojisAllowedInput.value = result.maxEmojisSetting !== undefined ? result.maxEmojisSetting : 3;
        capitalizationThresholdInput.value = result.capitalizationThresholdSetting !== undefined ? result.capitalizationThresholdSetting : 0.5;

        if (currentAction === 'hide') {
            recentlyHiddenSection.style.display = 'block';
            fetchAndDisplayHiddenVideos();
        } else {
            recentlyHiddenSection.style.display = 'none';
            renderHiddenVideoList([]); 
        }
    }).catch(error => {
        console.error(`Error loading settings: ${error}`);
        showStatus('Error loading settings.', true);
    });

    masterToggle.addEventListener('change', () => {
        browser.storage.local.set({ filterEnabled: masterToggle.checked })
            .then(() => showStatus('Settings saved.'))
            .catch(err => { console.error(err); showStatus('Error saving toggle.', true); });
    });

    [actionGrayOut, actionHide].forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                const newAction = radio.value;
                browser.storage.local.set({ selectedAction: newAction })
                    .then(() => {
                        showStatus('Action saved.');
                        if (newAction === 'hide') {
                            recentlyHiddenSection.style.display = 'block';
                            fetchAndDisplayHiddenVideos();
                        } else {
                            recentlyHiddenSection.style.display = 'none';
                            renderHiddenVideoList([]); 
                        }
                    })
                    .catch(err => { console.error(err); showStatus('Error saving action.', true);});
            }
        });
    });

    addKeywordButton.addEventListener('click', () => {
        const newKeyword = newKeywordInput.value.trim();
        if (newKeyword) {
            let updatedKeywords = [...currentKeywords]; 
            if (updatedKeywords.map(k => k.toLowerCase()).includes(newKeyword.toLowerCase())) {
                showStatus('Keyword already exists.', true);
                return;
            }
            updatedKeywords.push(newKeyword);

            browser.storage.local.set({ customKeywords: updatedKeywords }).then(() => {
                currentKeywords = updatedKeywords; 
                renderKeywords(); 
                newKeywordInput.value = ''; 
                showStatus('Keyword added.');
            }).catch(err => {
                console.error("Error saving new keyword:", err);
                showStatus('Error adding keyword.', true);
            });
        } else {
            showStatus('Keyword cannot be empty.', true);
        }
    });

    maxEmojisAllowedInput.addEventListener('change', () => {
        const value = parseInt(maxEmojisAllowedInput.value, 10);
        if (!isNaN(value) && value >= 0) {
            browser.storage.local.set({ maxEmojisSetting: value })
                .then(() => showStatus('Max Emojis setting saved.'))
                .catch(err => { console.error(err); showStatus('Error saving Max Emojis.', true); });
        } else {
            showStatus('Invalid value for Max Emojis.', true);
            browser.storage.local.get('maxEmojisSetting').then(res => maxEmojisAllowedInput.value = res.maxEmojisSetting !== undefined ? res.maxEmojisSetting : 3);
        }
    });

    capitalizationThresholdInput.addEventListener('change', () => {
        const value = parseFloat(capitalizationThresholdInput.value);
        if (!isNaN(value) && value >= 0.0 && value <= 1.0) { 
            browser.storage.local.set({ capitalizationThresholdSetting: value })
                .then(() => showStatus('Capitalization Threshold saved.'))
                .catch(err => { console.error(err); showStatus('Error saving Threshold.', true); });
        } else {
            showStatus('Invalid value for Threshold (must be 0.0-1.0).', true);
            browser.storage.local.get('capitalizationThresholdSetting').then(res => capitalizationThresholdInput.value = res.capitalizationThresholdSetting !== undefined ? res.capitalizationThresholdSetting : 0.5);
        }
    });

    // --- "Open Settings in New Tab" Logic ---
    if (openInTabLink) { 
        openInTabLink.addEventListener('click', (event) => {
            event.preventDefault();
            browser.tabs.create({
                url: browser.runtime.getURL("popup/popup.html")
            }).then(() => {
                // Optional: Close the popup. User can uncomment if this behavior is desired.
                // window.close(); 
            }).catch(err => {
                console.error("Error opening settings in new tab:", err);
                showStatus("Failed to open settings in new tab.", true);
            });
        });
    }

    // Hide "Open in Tab" link if already in a tab.
    // Using a simple protocol check; more robust checks could involve query params.
    if (window.location.protocol === 'moz-extension:') {
        // Heuristic to guess if it's a popup window vs a tab
        // Popups usually have a smaller, constrained size.
        // This is not foolproof but often works.
        const isLikelyPopup = window.innerHeight <= 800 && window.innerWidth <= 600; 
        
        if (openInTabLink) {
            if (!isLikelyPopup) { // If it's NOT likely a popup (i.e., it's a tab)
                openInTabLink.style.display = 'none';
            }
        }
    }
});
