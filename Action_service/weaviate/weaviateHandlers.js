const { getChunksCollection } = require("./weaviateConnect.js");

async function ensureTenant(tenantId) {
  try {
    const ChunksCollection = await getChunksCollection();
    const tenantInfo = await ChunksCollection.tenants.getByName(tenantId);

    if (tenantInfo) {
      console.log(`✅ Tenant '${tenantId}' đã tồn tại.`);
      return { success: true, message: "Tenant exists", tenant: tenantId };
    }

    console.log(`⚡ Tenant '${tenantId}' chưa có, tạo mới...`);
    await ChunksCollection.tenants.create([{ name: tenantId }]);

    console.log(`✅ Đã tạo tenant mới: '${tenantId}'`);
    return { success: true, message: "Tenant created", tenant: tenantId };
  } catch (error) {
    console.error("❌ Lỗi khi ensure tenant:", error);
    return { success: false, message: error.message };
  }
}

async function uploadEmbeddings(tenantId, documentName, embeddingsArray) {
  try {
    // Ensure tenant exists
    const ensureResult = await ensureTenant(tenantId);
    if (!ensureResult.success) {
      console.error(
        `❌ Không thể đảm bảo tenant '${tenantId}':`,
        ensureResult.message
      );
      return { success: false, message: ensureResult.message };
    }

    const ChunksCollection = await getChunksCollection();
    const thisTenant = ChunksCollection.withTenant(tenantId); // 🛠 Sửa lại đúng biến

    let uploadedCount = 0; // 🛠 Đếm số chunks thành công

    for (const chunk of embeddingsArray) {
      const { chunkId, pageContent, embedding, tags } = chunk;

      if (!chunkId || !pageContent || !embedding) {
        console.warn(`⚠️ Chunk thiếu thông tin cần thiết, bỏ qua:`, chunk);
        continue;
      }

      await thisTenant.data.insert({
        properties: {
          documentName: documentName,
          chunkId: chunkId,
          pageContent: pageContent,
          tags: tags 
        },
        vectors: embedding
      });

      console.log(`✅ Đã upload chunk '${chunkId}' cho tenant '${tenantId}'.`);
      uploadedCount++;
    }

    console.log(
      `🎉 Hoàn thành upload ${uploadedCount} chunks cho document '${documentName}'.`
    );
    return { success: true, uploaded: uploadedCount };
  } catch (error) {
    console.error("❌ Lỗi khi upload embeddings:", error);
    return { success: false, message: error.message };
  }
}

//xóa hết dữ liệu của một Tenant: deleteTenantEmbeddings(tenantId)
async function deleteTenantEmbeddings(tenantId) {
  try {
    const ChunksCollection = await getChunksCollection();

    // Optional: Kiểm tra tenant tồn tại
    const tenantInfo = await ChunksCollection.tenants.getByName(tenantId);

    if (!tenantInfo) {
      console.warn(`⚠️ Tenant '${tenantId}' không tồn tại. Không cần xóa.`);
      return { success: false, message: "Tenant does not exist" };
    }

    await ChunksCollection.tenants.remove([{ name: tenantId }]);
    console.log(`✅ Đã xóa tất cả dữ liệu của tenant '${tenantId}'.`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Lỗi khi xóa tenant '${tenantId}':`, error.message);
    return { success: false, message: error.message };
  }
}

// - xóa dữ liệu của một documentName: deleteDocEmbed(tenantId,documentName)
async function deleteDocEmbed(tenantId, documentName) {
  try {
    const ChunksCollection = await getChunksCollection();
    const tenantChunksCollection = ChunksCollection.withTenant(tenantId);

    const response = await tenantChunksCollection.data.deleteMany(
      tenantChunksCollection.filter
        .byProperty("documentName")
        .equal(documentName)
    );

    console.log(
      `🎉 Đã xóa thành công ${response.matchCount} chunks cho document '${documentName}' trong tenant '${tenantId}'.`
    );

    return { success: true, deleted: response.matchCount };
  } catch (error) {
    console.error(`❌ Lỗi khi xóa document '${documentName}':`, error.message);
    return { success: false, message: error.message };
  }
}

// lấy về tên các documentName đã upload trong tenant: getDocumentNames(tenantId)
async function getDocumentNames(tenantId) {
  try {
    const ChunksCollection = await getChunksCollection();
    const tenantChunksCollection = ChunksCollection.withTenant(tenantId);

    const response = await tenantChunksCollection.aggregate.groupBy.overAll({
      groupBy:{property: "documentName"},
    })
    console.log(`🎉 Kết quả nhóm theo documentName:`, response);
    const values = response.map(item => ({
          documentName: item.groupedBy.value,
          count: item.totalCount
        }));
    console.log(`🎉 Tên các document đã upload:`, values);
    return { success: true, documentNames: values };
  } catch (error) {
    console.error(`❌ Lỗi khi lấy document names:`, error.message);
    return { success: false, message: error.message };
  }
}

//- thực hiện tìm kiếm với đầu vào là embedded query: hybridSearch(tenantId,embedded_query,original_query)
async function hybridSearch(tenantId, embedded_query, original_query, alpha= 0.7) {
  try {
    const ChunksCollection = await getChunksCollection();
    const tenantChunksCollection = ChunksCollection.withTenant(tenantId);

    const response = await tenantChunksCollection.query.hybrid(original_query, {
      vector: embedded_query,
      alpha: alpha, // Tỷ lệ kết hợp giữa vector search và text search 1 là vector search, 0 là text search
      limit: 10,
      tenant: tenantId,
      returnProperties: ['pageContent', 'documentName']
    })

    console.log(JSON.stringify(response, null, 2));
    // const results = response.objects.map((obj) => ({
    //   documentName: obj.documentName,
    //   pageContent: obj.pageContent,
    //   distance: obj._additional?.distance,
    //   score: obj._additional?.score,
    // }));
  
    return { success: true, objects: response.objects };
  } catch (error) {
    console.error(`❌ Lỗi khi hybrid search:`, error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  ensureTenant,
  uploadEmbeddings,
  deleteTenantEmbeddings,
  deleteDocEmbed,
  hybridSearch,
  getDocumentNames
};


if (require.main === module) {
  testDeleteOnly();
}
