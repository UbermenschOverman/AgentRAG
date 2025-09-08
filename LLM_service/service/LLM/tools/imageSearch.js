const Fuse = require('fuse.js');
const { connectDB } = require('../../../config/mongo');

const fuseCache = new Map();
const fuseOpts = {
  keys: ['description','name'],
  threshold: 0.8,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

async function imageSearch(tenantId, imagedescription) {
  try {
    console.log('imageSearch called with:', { tenantId, imagedescription });

    const db     = await connectDB();
    const tenant = await db.collection("tenants").findOne({ tenantId }) || {};

    const pdfs   = tenant.pdfs   || [];
    const images = tenant.images || [];

    // concatenate pdfs and images into one array
    const allItems = images.concat(pdfs);

    if (allItems.length === 0) {
      return [];
    }

    // Cache Fuse for this tenant
    let fuse = fuseCache.get(tenantId);
    if (!fuse) {
      fuse = new Fuse(allItems, fuseOpts);
      fuseCache.set(tenantId, fuse);
    }

    const results = fuse.search(imagedescription, { limit: 10 });
    console.log('imageSearch results:', results);

    return results.map(r => ({
      imageUrl:    r.item.url,
      description: r.item.description,
      score:       r.score,
    }));

  } catch (err) {
    console.error('imageSearch error:', err);
    return [];
  }
}


module.exports = { imageSearch };
