/**
 * 短信服务占位实现
 * TODO: 接入真实短信服务商
 */

const Logger = require('../../utils/logger');

type SendResult = {
  success: boolean;
  messageId?: string;
};

const sendSMS = async (phoneNumber: string, message: string): Promise<SendResult> => {
  Logger.info('SMS service placeholder', {
    phoneNumber,
    messagePreview: message.slice(0, 50),
  });
  return { success: true, messageId: `mock_${Date.now()}` };
};

module.exports = {
  sendSMS,
};
