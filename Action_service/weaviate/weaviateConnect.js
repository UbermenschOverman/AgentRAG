const weaviate = require('weaviate-client');

require('dotenv').config();

const weaviateURL = process.env.WEAVIATE_URL
const weaviateKey = process.env.WEAVIATE_API_KEY 

async function getChunksCollection() {
  // const client = await weaviate.connectToWeaviateCloud(weaviateURL, {
  //   authCredentials: new weaviate.ApiKey(weaviateKey),
  // })
  const client = await weaviate.connectToLocal()
  return await client.collections.get(process.env.WEAVIATE_COLLECTION_NAME );
}

module.exports = { getChunksCollection };



