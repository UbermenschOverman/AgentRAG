const { connectDB } = require('../../mogo_service/mogodb');
const dayjs = require("dayjs");
const duration = require("dayjs/plugin/duration");
dayjs.extend(duration);

// Hàm parseCampaigns như trên
function parseCampaigns(campaigns) {
  return campaigns.map((c) => {
    const start = dayjs(c.start);
    const stop  = dayjs(c.stop);
    const diff  = dayjs.duration(stop.diff(start));
    const parts  = [];
    if (diff.days())  parts.push(`${diff.days()} ngày`);
    if (diff.hours()) parts.push(`${diff.hours()} giờ`);
    if (diff.minutes()) parts.push(`${diff.minutes()} phút`);
    return {
      name:        c.name,
      type:        c.type,
      description: c.description,
      start:       start.format("DD/MM/YYYY HH:mm"),
      stop:        stop.format("DD/MM/YYYY HH:mm"),
      duration:    parts.join(" "),
    };
  });
}

// Hàm chuyển sang mảng câu văn
function campaignSentences(campaigns) {
  const parsed = parseCampaigns(campaigns);
  return parsed.map((c) =>
    `Chiến dịch "${c.name}" (${c.type}) diễn ra từ ${c.start} đến ${c.stop}, kéo dài ${c.duration}. Mô tả: ${c.description}`
  );
}

const getCampaigns = async (tenantId) => {
  try {
    const db = await connectDB();
    const campaigns = await db.collection("campaigns").find({ tenantId }).toArray();
    campaignSentences = parseCampaigns(campaigns);
    return campaignSentences;

  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return [];
  }
}
module.exports = { getCampaigns };