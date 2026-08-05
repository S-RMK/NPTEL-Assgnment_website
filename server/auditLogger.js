const db = require('./db');

/**
 * Log an audit trail entry into Firestore audit_logs collection
 * @param {Object} params
 * @param {string} params.actorId - User ID of actor performing the action
 * @param {string} params.actorRole - Role of the actor (ADMIN, STUDENT, SYSTEM)
 * @param {string} params.action - Action string (e.g. USER_CREATED, ANSWER_UPLOADED)
 * @param {string} params.target - Target resource ID/path
 * @param {string} params.details - Human readable description
 * @param {string} [params.ipAddress] - Request IP
 */
const logAudit = async ({ actorId, actorRole, action, target, details, ipAddress = '127.0.0.1' }) => {
    try {
        if (!db) return;
        await db.collection('audit_logs').add({
            actorId: actorId || 'SYSTEM',
            actorRole: actorRole || 'SYSTEM',
            action,
            target: target || '',
            details: details || '',
            ipAddress,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Failed to write audit log:', err.message);
    }
};

module.exports = { logAudit };
