"use client";
import { useEffect, useState, useCallback } from "react";
import { Spin, Pagination, Typography, Button, Row, Col, Space } from "antd";
import OrderTable from "./OrderTable";
import { useParams } from "next/navigation";
import axios from "axios";

const { Title } = Typography;

function DashBoardView() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const { tenantId } = useParams();

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const url = `http://localhost:6969/api/tenant/${tenantId}/orders?page=${page}&limit=${limit}`;
      console.log("📤 Gửi request tới:", url);
      const response = await axios.get(url);

      console.log("📥 Dữ liệu trả về:", response.data);
      const { orders, total } = response.data || {};

      if (Array.isArray(orders)) {
        setOrders(orders);
        setTotal(total || 0);
      } else {
        console.warn("⚠️ Sai định dạng:", response.data);
        setOrders([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("❌ Lỗi khi fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="px-6 py-4 max-w-[1400px] mx-auto">
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            📋 Danh sách đơn hàng
          </Title>
        </Col>
        <Col>
          <Button onClick={fetchOrders} loading={loading} type="primary">
            Làm mới
          </Button>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <OrderTable
          orders={orders}
          loading={loading}
          tenantId={tenantId}
          refresh={fetchOrders}
        />

        <div className="flex justify-center mt-4">
          <Pagination
            current={page}
            pageSize={limit}
            total={total}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      </Spin>
    </div>
  );
}

export default DashBoardView;
