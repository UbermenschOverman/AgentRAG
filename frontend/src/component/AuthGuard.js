"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/firebase";

export default function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { tenantId } = useParams();

  useEffect(() => {
    // 1) Kiểm tra chuyển tenant
    const prevTenant = localStorage.getItem("tenantId");
    if (prevTenant && prevTenant !== tenantId) {
      signOut(auth).then(() => {
        localStorage.setItem("tenantId", tenantId);
        router.replace(`/${tenantId}/admin/login`);
      });
      return;
    }
    localStorage.setItem("tenantId", tenantId);

    // 2) Lắng nghe auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Chưa login → về login
        router.replace(`/${tenantId}/admin/login`);
        return;
      }

      try {
        // 3) Lấy idToken và gọi backend verify adminUid
        const idToken = await user.getIdToken();
        const res = await fetch(`http://localhost:6969/api/tenant/${tenantId}/admin/verification`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });

        if (res.ok) {
          // Verified → cho render
          setLoading(false);
        } else {
          // Không phải admin → logout & về login
          await signOut(auth);
          router.replace(`/${tenantId}/admin/login`);
        }
      } catch (err) {
        // Lỗi verify → logout & về login
        await signOut(auth);
        router.replace(`/${tenantId}/admin/login`);
      }
    });

    return () => unsubscribe();
  }, [tenantId, router]);

  if (loading) {
    return <div>Đang kiểm tra quyền truy cập…</div>;
  }
  return <>{children}</>;
}
