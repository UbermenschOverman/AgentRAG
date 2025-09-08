async function lookupTenant() {
  const tenantId = document.getElementById("tenantIdInput").value.trim();
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "⏳ Đang tìm kiếm...";

  try {
    const res = await fetch(`/api/tenant/${tenantId}`);
    if (!res.ok) {
      resultDiv.innerHTML = "❌ Không tìm thấy tenant!";
      return;
    }
    const data = await res.json();
    resultDiv.innerHTML = `
        <h3>${data.name}</h3>
        <p><strong>Mô tả:</strong> ${data.description}</p>
        <p><strong>Địa chỉ:</strong> ${data.address}</p>
      `;
  } catch (err) {
    resultDiv.innerHTML = "❌ Lỗi server!";
    console.error(err);
  }
}
