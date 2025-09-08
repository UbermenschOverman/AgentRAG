"use client";
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useState } from 'react';
import { useRouter, useParams } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { tenantId } = useParams();

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // 1) Mở popup Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // 2) Lấy idToken
      const idToken = await user.getIdToken();
      // 3) Gọi backend để verify adminUid
      const res = await fetch(`http://localhost:6969/api/tenant/${tenantId}/admin/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ tenantId })
      });
      if (res.ok) {
        // 4a) Thành công → vào trang admin
        router.replace(`/${tenantId}/admin`);
      } else {
        // 4b) Không phải admin của tenant này
        const { message } = await res.json();
        setError(message || "Bạn không có quyền truy cập.");
        await signOut(auth);
      }
    } catch (err) {
      console.error(err);
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
      // nếu đã login nhầm, logout
      try { await signOut(auth); } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 350, margin: "80px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>Đăng nhập quản trị</h2>
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      <button
        onClick={handleGoogleSignIn}
        style={{ width: "100%", padding: 10 }}
        disabled={loading}
      >
        {loading ? "Đang xử lý..." : "Đăng nhập với Google"}
      </button>
    </div>
  );
}
