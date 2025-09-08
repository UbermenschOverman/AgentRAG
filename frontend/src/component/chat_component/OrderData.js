"use client"
import React, {useEffect,useState} from 'react'
import { useParams } from 'next/navigation';

function OrderData(orderId) {
     const { tenantId } = useParams();
    const [data, setData] = useState(null);
     useEffect(() => {
       
        if (!tenantId || !orderId) return;
    
        const fetchData = async () => {
          setLoading(true);
          try {
            const res = await fetch(
              `http://localhost:6969/api/tenant/${tenantId}/order/${orderId}`
            );
            const result = await res.json();
            console.log("Order detail result:", result);
            setData(result || {});
            form.setFieldsValue(result || {});
          } catch (err) {
            error("Lỗi khi tải dữ liệu đơn hàng");
          } finally {
            setLoading(false);
          }
        };
    
        fetchData();
      }, [tenantId, orderId, form]);
  return (
    <div>OrderData</div>
  )
}

export default OrderData