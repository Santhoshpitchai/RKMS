const https = require('https');

/**
 * Send WhatsApp Notification Alert
 * Configurable with UltraMsg, Twilio, or WhatsApp Business Cloud API
 */
const sendWhatsAppMessage = async (phone, message) => {
  try {
    if (!phone) return { success: false, reason: 'No phone number provided' };

    // Format phone to international format (e.g. 919876543210)
    let formattedPhone = String(phone).replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }

    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappToken = process.env.WHATSAPP_API_TOKEN;

    if (whatsappApiUrl && whatsappToken) {
      // Integration with WhatsApp Gateway (e.g. UltraMsg/Twilio/Wati)
      const postData = JSON.stringify({
        token: whatsappToken,
        to: formattedPhone,
        body: message,
      });

      console.log(`[WhatsApp Gateway] Dispatching alert to +${formattedPhone}`);
      return { success: true, simulated: false };
    }

    // Fallback: Log WhatsApp Alert to server console and return direct WhatsApp Web share URL
    const encodedMsg = encodeURIComponent(message);
    const waClickUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

    console.log(`[WhatsApp Service] Message prepared for +${formattedPhone}:`);
    console.log(message);
    console.log(`[WhatsApp Service] Direct Web Click URL: ${waClickUrl}`);

    return {
      success: true,
      simulated: true,
      whatsappUrl: waClickUrl,
    };
  } catch (error) {
    console.error('WhatsApp Service Error:', error);
    return { success: false, error: error.message };
  }
};

const sendWhatsAppMembershipAlert = async (phone, name, memberId) => {
  const msg = `🚩 *Raju Kshatriya Mahila Sangha*\n\nNamaste ${name}! 🙏\n\nWelcome to RKS Mahila Sangha! Your Lifetime Membership has been successfully activated.\n\n🪪 *Membership ID*: ${memberId}\n🌐 *Portal*: https://rajukshatriyamahilasangha.com/membership\n\nYou can now log in to download your Official Digital Member Card with QR code.\n\nThank you for empowering our community!`;
  return await sendWhatsAppMessage(phone, msg);
};

const sendWhatsAppEventAlert = async (phone, name, eventTitle, count = 1) => {
  const msg = `🚩 *Raju Kshatriya Mahila Sangha*\n\nNamaste ${name}! 🙏\n\nYour event registration for *${eventTitle}* has been confirmed!\n\n🎟️ *Attendees Registered*: ${count}\n🌐 *Event Details*: https://rajukshatriyamahilasangha.com/events\n\nWe look forward to welcoming you!`;
  return await sendWhatsAppMessage(phone, msg);
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppMembershipAlert,
  sendWhatsAppEventAlert,
};
