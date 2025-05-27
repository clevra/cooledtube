// clickbait_detector.js

class ClickbaitDetector {
    constructor() {
        this.defaultKeywords = [
            'DESTROYS', 'SHOCKING', 'EPIC FAIL', 'YOU WON\'T BELIEVE', 'SECRET REVEALED',
            'GONE WRONG', 'INSTANTLY REGRETS', 'EXPOSED', 'TOP 10', 'UNEXPECTED', 'MUST WATCH'
        ];
        // Basic regex for emojis (Unicode ranges for common emojis)
        // This regex might not cover all emojis and can be expanded.
        this.emojiRegex = /(?:[\u2600-\u26FF]|[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g;
        this.commonShortWords = new Set(['a', 'an', 'the', 'is', 'at', 'on', 'of', 'to', 'in', 'it', 'for', 'with', 'by', 'as']);
    }

    /**
     * Checks if the title contains any of the provided keywords (case-insensitive).
     * @param {string} title - The video title.
     * @param {string[]} keywords - An array of keywords to check for.
     * @returns {boolean} - True if a keyword is found, false otherwise.
     */
    checkKeywords(title, keywords) {
        if (!title || !keywords || keywords.length === 0) {
            return false;
        }
        const lowerTitle = title.toLowerCase();
        for (const keyword of keywords) {
            if (lowerTitle.includes(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if the title is entirely in uppercase (ignoring non-alphabetic characters).
     * Considers words with more than 2 letters.
     * @param {string} title - The video title.
     * @returns {boolean} - True if the title is all caps, false otherwise.
     */
    isAllCaps(title) {
        if (!title) {
            return false;
        }
        // Remove non-alphabetic characters and split into words
        const words = title.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
        let significantWords = 0;
        for (const word of words) {
            if (word.length > 2) {
                if (word !== word.toUpperCase()) {
                    return false; // Found a significant word not in ALL CAPS
                }
                significantWords++;
            }
        }
        return significantWords > 0; // Return true only if there were significant words
    }

    /**
     * Checks for excessive capitalization in the title.
     * @param {string} title - The video title.
     * @param {number} threshold - Ratio of capitalized words to total words (0 to 1).
     * @returns {boolean} - True if excessive capitalization is detected, false otherwise.
     */
    hasExcessiveCapitalization(title, threshold = 0.5) {
        if (!title || threshold < 0 || threshold > 1) {
            return false;
        }
        const words = title.split(/\s+/).filter(word => word.length > 0);
        if (words.length === 0) {
            return false;
        }

        let capitalizedWordsCount = 0;
        words.forEach((word, index) => {
            // Check if the first character is uppercase
            const firstChar = word.charAt(0);
            if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) { // Ensure it's a letter
                // Exclude common short words unless it's the first word
                if (index === 0 || word.length > 3 || !this.commonShortWords.has(word.toLowerCase())) {
                    capitalizedWordsCount++;
                }
            }
        });

        const ratio = capitalizedWordsCount / words.length;
        return ratio > threshold;
    }

    /**
     * Checks if the title contains more than a specified number of emojis.
     * @param {string} title - The video title.
     * @param {number} maxEmojis - The maximum number of emojis allowed.
     * @returns {boolean} - True if excessive emojis are detected, false otherwise.
     */
    hasExcessiveEmojis(title, maxEmojis = 3) {
        if (!title) {
            return false;
        }
        const matches = title.match(this.emojiRegex);
        return matches ? matches.length > maxEmojis : false;
    }

    /**
     * Checks for repetitive punctuation marks (e.g., "!!!", "???", "...").
     * Focuses on '!', '?', '.'.
     * @param {string} title - The video title.
     * @returns {boolean} - True if repetitive punctuation is found, false otherwise.
     */
    hasRepetitivePunctuation(title) {
        if (!title) {
            return false;
        }
        // Looks for three or more consecutive !, ?, or .
        return /([!?.]){3,}/.test(title);
    }

    /**
     * Main method to determine if a title is clickbait based on various checks.
     * @param {string} title - The video title.
     * @param {object} options - Configuration options.
     * @param {string[]} [options.customKeywords] - Custom keywords to check.
     * @param {number} [options.capitalizationThreshold] - Custom threshold for excessive capitalization.
     * @param {number} [options.maxEmojisAllowed] - Custom max number of emojis.
     * @returns {object} - An object with `isClickbait` (boolean) and `reasons` (array of strings).
     */
    isClickbait(title, options = {}) {
        const reasons = [];
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return { clickbait: false, reasons: [] };
        }

        const effectiveKeywords = options.customKeywords && Array.isArray(options.customKeywords)
            ? options.customKeywords
            : this.defaultKeywords;
        const capThreshold = typeof options.capitalizationThreshold === 'number'
            ? options.capitalizationThreshold
            : 0.5;
        const emojisAllowed = typeof options.maxEmojisAllowed === 'number'
            ? options.maxEmojisAllowed
            : 3;

        if (this.checkKeywords(title, effectiveKeywords)) {
            reasons.push('keyword');
        }
        if (this.isAllCaps(title)) {
            reasons.push('allCaps');
        }
        if (this.hasExcessiveCapitalization(title, capThreshold)) {
            reasons.push('excessiveCapitalization');
        }
        if (this.hasExcessiveEmojis(title, emojisAllowed)) {
            reasons.push('excessiveEmojis');
        }
        if (this.hasRepetitivePunctuation(title)) {
            reasons.push('repetitivePunctuation');
        }

        return {
            clickbait: reasons.length > 0,
            reasons: reasons
        };
    }
}

// Ensure the class is available for instantiation if this script is loaded directly.
// For example, in a content script: const detector = new ClickbaitDetector();
// No export/import statements as per instructions.
