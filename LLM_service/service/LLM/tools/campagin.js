const { connectDB } = require('../../../config/mongo');

const getCampaigns = async (tenantId) => {
  try {
    const db = await connectDB();
    const campaigns = await db.collection("campaigns").find({ tenantId }).toArray();
    return campaigns;
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return [];
  }
}
module.exports = { getCampaigns };