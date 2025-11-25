/**
 * Extended storage utilities with quota management.
 * Extends StorageUtils from utils.js with safety checks.
 */

const StorageManager = {
    QUOTA_BYTES: 10485760, // 10MB

    WARNING_THRESHOLD: 0.9,

    async checkUsage() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse();
            const percentUsed = (bytesInUse / this.QUOTA_BYTES) * 100;
            const available = this.QUOTA_BYTES - bytesInUse;

            return {
                bytesInUse,
                quota: this.QUOTA_BYTES,
                available,
                percentUsed: percentUsed.toFixed(2),
                isNearLimit: percentUsed >= this.WARNING_THRESHOLD * 100
            };
        } catch (error) {
            console.error('NovaTab: Error checking storage usage:', error);
            return null;
        }
    },

    async safeSet(data) {
        try {
            const usage = await this.checkUsage();

            if (usage && usage.isNearLimit) {
                console.warn('NovaTab: Storage nearly full:', usage.percentUsed + '%');
            }

            if (usage && usage.percentUsed >= 100) {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please export your data and reset settings.',
                    code: 'QUOTA_EXCEEDED'
                };
            }

            await chrome.storage.local.set(data);
            return { success: true };

        } catch (error) {
            if (error.message && error.message.includes('QUOTA_BYTES')) {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please export your data and reset settings.',
                    code: 'QUOTA_EXCEEDED'
                };
            }

            return {
                success: false,
                error: `Failed to save: ${error.message}`,
                code: 'UNKNOWN_ERROR'
            };
        }
    },

    async showUsageWarningIfNeeded(statusElement) {
        const usage = await this.checkUsage();

        if (usage && usage.isNearLimit) {
            const message = `Storage ${usage.percentUsed}% full. Consider exporting data.`;
            if (statusElement && typeof DOMUtils !== 'undefined' && DOMUtils.showStatus) {
                DOMUtils.showStatus(statusElement, message, 'info', 10000);
            }
        }
    }
};
