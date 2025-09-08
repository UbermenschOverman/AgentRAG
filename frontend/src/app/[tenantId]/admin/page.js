"use client";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/component/AuthGuard";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useState } from "react";

export default function UploadPage() {
  const { tenantId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);


  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    router.replace(`${window.location.pathname}/login`);
  };

  // ...existing code...

  return (
    <AuthGuard>
      <div
        style={{
          height: "100vh",
          border: "none",
          padding: 0,
          margin: 0,
          position: "relative",
        }}
      >
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{
            position: "absolute",
            top: 16,
            right: 24,
            zIndex: 10,
            padding: "8px 16px",
            background: "#f87171",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
        <iframe
          src={`http://localhost:7101/index.html?tenantId=${tenantId}`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="Micro Frontend - Upload"
        />
      </div>
    </AuthGuard>
  );
}
