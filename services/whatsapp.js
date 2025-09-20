const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function uploadFile(buffer) {
  try {
    const { data, error } = await supabase.storage.from('resumes').upload(`resume-${Date.now()}`, buffer, {
      contentType: 'application/octet-stream',
    });
    if (error) throw error;
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file.');
  }
}

async function sendMedia(to, filePath, caption) {
  try {
    const mediaUrl = await uploadFile(fs.readFileSync(filePath));
    await twilioClient.messages.create({
      from: 'whatsapp:+14155238886', // Twilio sandbox number
      to,
      body: caption,
      mediaUrl,
    });
  } catch (error) {
    console.error('Error sending media:', error);
    throw new Error('Failed to send media.');
  }
}

module.exports = { uploadFile, sendMedia };
