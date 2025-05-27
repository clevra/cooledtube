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

    // New elements for "Recently Hidden Videos"
    const recentlyHiddenSection = document.getElementById('recentlyHiddenSection');
    const refreshHiddenListButton = document.getElementById('refreshHiddenListButton');
    const recentlyHiddenListUL = document.getElementById('recentlyHiddenList'); // Renamed for clarity

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
                currentKeywords.splice(keywordIndexToRemove, 1);
                browser.storage.local.set({ customKeywords: currentKeywords }).then(() => {
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

    // --- Functions for "Recently Hidden Videos" ---
    function renderHiddenVideoList(hiddenVideos) {
        recentlyHiddenListUL.innerHTML = ''; // Clear list
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
            titleSpan.title = video.title; // Tooltip for long titles

            const unhideButton = document.createElement('button');
            unhideButton.textContent = 'Unhide';
            unhideButton.dataset.videoId = video.id;
            unhideButton.addEventListener('click', handleUnhideClick); // Attach listener directly

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
                    fetchAndDisplayHiddenVideos(); // Refresh the list
                } else {
                    showStatus(response.message || 'Failed to unhide video.', true);
                }
            } else {
                 showStatus('Cannot find active tab to send unhide command.', true);
            }
        } catch (error) {
            console.error('Error unhiding video:', error);
            // Check for common errors like "No matching message listener"
            if (error.message && error.message.includes("Could not establish connection")) {
                 showStatus('Error: Content script not responding. Try refreshing the YouTube page.', true);
            } else {
                showStatus('Error sending unhide command.', true);
            }
        }
    }

    async function fetchAndDisplayHiddenVideos() {
        if (recentlyHiddenSection.style.display === 'none') {
            renderHiddenVideoList([]); // Clear list if section is not visible
            return;
        }
        // Optional: Add a loading indicator here
        // recentlyHiddenListUL.innerHTML = '<li>Loading...</li>'; 
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
               renderHiddenVideoList([]); // No active tab
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

    // Load saved settings
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

        // Visibility of "Recently Hidden" section
        if (currentAction === 'hide') {
            recentlyHiddenSection.style.display = 'block';
            fetchAndDisplayHiddenVideos();
        } else {
            recentlyHiddenSection.style.display = 'none';
            renderHiddenVideoList([]); // Clear list when not in hide mode
        }
    }).catch(error => {
        console.error(`Error loading settings: ${error}`);
        showStatus('Error loading settings.', true);
    });

    // Save basic settings
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
                        // Update visibility of "Recently Hidden" section
                        if (newAction === 'hide') {
                            recentlyHiddenSection.style.display = 'block';
                            fetchAndDisplayHiddenVideos();
                        } else {
                            recentlyHiddenSection.style.display = 'none';
                            renderHiddenVideoList([]); // Clear list
                        }
                    })
                    .catch(err => { console.error(err); showStatus('Error saving action.', true);});
            }
        });
    });

    addKeywordButton.addEventListener('click', () => {
        const newKeyword = newKeywordInput.value.trim();
        if (newKeyword) {
            if (currentKeywords.map(k => k.toLowerCase()).includes(newKeyword.toLowerCase())) {
                showStatus('Keyword already exists.', true);
                return;
            }
            currentKeywords.push(newKeyword); 
            browser.storage.local.set({ customKeywords: currentKeywords }).then(() => {
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
});
