import { Table, Tag, Button, Space, message } from "antd";
import { useState } from "react";
import axios from "axios";
import CustomModal from "./Modal";
import OrderDetail from "./orderDetail";

function OrderTable({ orders, loading, tenantId, refresh: onRefresh }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [messageApi, contextHolder] = message.useMessage();

  const showSuccess = (msg = "Cập nhật xác nhận thành công!") => {
    setTimeout(() => {
      messageApi.open({ type: "success", content: msg });
    }, 0);
  };

  const showError = (msg = "Lỗi khi cập nhật xác nhận!") => {
    setTimeout(() => {
      messageApi.open({ type: "error", content: msg });
    }, 0);
  };

  const handleShowDetail = (record) => {
    setSelectedOrderId(record.orderId);
    setModalOpen(true);
  };

  const handleStaffConfirm = async (orderId, updatedValue) => {
    if (!tenantId || !orderId) return;
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await axios.post(
        `http://localhost:6969/api/tenant/${tenantId}/order/${orderId}/staffConfirm`,
        { updatedValue }
      );
      if (res.status === 200) {
        showSuccess();
        if (typeof onRefresh === "function") onRefresh();
      } else {
        showError();
      }
    } catch (err) {
      showError();
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const columns = [
    {
      title: "Order ID",
      dataIndex: "orderId",
      key: "orderId",
      width: 260,
      ellipsis: true,
      render: (text, record) =>
        text ? (
          <a style={{ cursor: "pointer" }} onClick={() => handleShowDetail(record)}>
            {text}
          </a>
        ) : (
          <span className="text-gray-400 italic">---</span>
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: ["meta", "isFullyFilled"],
      key: "isFullyFilled",
      render: (val) =>
        val == true ? (
          <Tag color="green">Đã đủ thông tin</Tag>
        ) : val == false ? (
          <Tag color="orange">Chưa đủ thông tin</Tag>
        ) : (
          <span className="text-gray-400 italic">---</span>
        ),
      width: 140,
    },
    {
      title: "Xác nhận NV",
      dataIndex: ["meta", "isStaffConfirmed"],
      key: "isStaffConfirmed",
      render: (val) =>
        val === "approved" ? (
          <Tag color="green">Đã đồng ý</Tag>
        ) : val === "pending" ? (
          <Tag color="blue">Chưa xác nhận</Tag>
        ) : val === "denied" ? (
          <Tag color="red">Đã từ chối</Tag>
        ) : (
          <span className="text-gray-400 italic">---</span>
        ),
      width: 140,
    },
    {
      title: "Trạng thái đơn",
      dataIndex: ["meta", "state"],
      key: "state",
      width: 120,
      render: (text) => text || <span className="text-gray-400 italic">---</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: ["meta", "createdAt"],
      key: "createdAt",
      render: (date) =>
        date ? new Date(date).toLocaleString() : <span className="text-gray-400 italic">---</span>,
      width: 180,
    },
    {
      title: "Ngày cập nhật",
      dataIndex: ["meta", "updatedAt"],
      key: "updatedAt",
      render: (date) =>
        date ? new Date(date).toLocaleString() : <span className="text-gray-400 italic">---</span>,
      width: 180,
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_, record) =>
        record.orderId ? (
          <Space>
            <Button
              size="small"
              type="primary"
              loading={actionLoading[record.orderId]}
              onClick={() => handleStaffConfirm(record.orderId, "approved")}
            >
              Đồng ý
            </Button>
            <Button
              size="small"
              danger
              loading={actionLoading[record.orderId]}
              onClick={() => handleStaffConfirm(record.orderId, "denied")}
            >
              Từ chối
            </Button>
          </Space>
        ) : (
          <span style={{ color: "#ccc" }}>—</span>
        ),
    },
  ];

  const paddedOrders = [
    ...orders,
    ...Array.from({ length: Math.max(0, 10 - orders.length) }, () => ({})),
  ];

  return (
    <>
      {contextHolder}
      <Table
        rowKey={(record, index) => record.orderId || `empty-${index}`}
        columns={columns}
        dataSource={paddedOrders}
        loading={loading}
        pagination={false}
        bordered
        size="small"
        scroll={{ x: "max-content" }}
      />
      <CustomModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
        }}
        title="Chi tiết đơn hàng"
      >
        {selectedOrderId && tenantId ? (
          <OrderDetail tenantId={tenantId} orderId={selectedOrderId} />
        ) : (
          <div>
            <p className="text-sm text-gray-500 italic">Không tìm thấy tenantId hoặc orderId</p>
          </div>
        )}
      </CustomModal>
    </>
  );
}

export default OrderTable;
