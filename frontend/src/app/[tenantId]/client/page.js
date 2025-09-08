// get tenantId from URL and pass it to iframe src
"use client";
import { useParams } from "next/navigation";

export default function ClientPage() {
  const { tenantId } = useParams();
  if (!tenantId) {
    return <div>❌ Không tìm thấy tenantId trong URL. Vui lòng kiểm tra lại.</div>;
  }
  const iframeSrc = `http://localhost:7000/client.html?tenantId=${tenantId}`;
  return (
    
    <div style={{ height: "100vh", border: "none", padding: 0, margin: 0 }}>
      <iframe
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        title="Micro Frontend - Client"
      />
    </div>
  );
}
