"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      let user = auth.currentUser;
      if (!user) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }
      const idToken = await user.getIdToken();
      const email = user.email;
        console.log("🚀 Gửi đăng ký tenant:", { email, name, description, address });
      const res = await fetch("http://localhost:6969/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, name, description, address }),
      });
    console.log("🚀 Kết quả đăng ký:", res);

      const data = await res.json();
      if (res.ok && data.tenantId) {
        console.log("🎉 Đăng ký OK, tenantId =", data.tenantId);
        localStorage.setItem("tenantId", data.tenantId);
        setStatus("Đăng ký thành công! Đang chuyển hướng...");
        router.push(`/${data.tenantId}/admin`);
      } else {
        console.log("🚨 Đăng ký lỗi, message =", data.message);
        setStatus(data.message || "Đăng ký thất bại.");
      }
    } catch (err) {
      setStatus("Có lỗi xảy ra: " + err.message);
    }finally {
    setLoading(false);
  }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        padding: 24,
        border: "1px solid #eee",
        borderRadius: 8,
      }}
    >
      <h2>Đăng ký Tenant mới</h2>
      <form onSubmit={handleSignUp}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Tên doanh nghiệp"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Mô tả ngắn gọn về doanh nghiệp"
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
                <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Địa chỉ doanh nghiệp"
            value={address}
            required
            onChange={(e) => setAddress(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button
          type="submit"
          style={{ width: "100%", padding: 10 }}
          disabled={loading}
        >
          {loading ? "Đang đăng ký..." : "Đăng ký với Google"}
        </button>
      </form>
      {status && (
        <div
          style={{
            marginTop: 16,
            color: status.includes("thành công") ? "green" : "red",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}
