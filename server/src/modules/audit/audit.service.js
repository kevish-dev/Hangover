import { prisma } from "../../prisma/client.js";

/**
 * @typedef {Object} AuditEventParams
 * @property {string} [userId]
 * @property {string} event
 * @property {string} [ipAddress]
 * @property {string} [userAgent]
 * @property {any} [details]
 */

const auditService = {
  /**
   * Log an audit event
   * @param {AuditEventParams} params
   */
  logEvent: async (params) => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          event: params.event,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          details: params.details || {},
        },
      });
    } catch (error) {
      console.error("Failed to write audit log:", error);
      // We don't throw here to avoid failing the main request if audit logging fails
    }
  },
};

export default auditService;
