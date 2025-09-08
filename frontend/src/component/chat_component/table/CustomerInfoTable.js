import { Table, Input, Button, message } from "antd";
import { useState, useEffect } from "react";

function CustomerInfoTable({ content: contentProp, onApprove, tenantId, orderId }) {
  const [content, setContent] = useState(contentProp || {});
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    setContent(contentProp || {});
  }, [contentProp]);

  const success = (msg = "Cập nhật đơn thành công") => {
    setTimeout(() => {
      messageApi.open({ type: "success", content: msg });
    }, 0);
  };

  const error = (msg = "Đã xảy ra lỗi") => {
    setTimeout(() => {
      messageApi.open({ type: "error", content: msg });
    }, 0);
  };

  const editableFields = Object.entries(content)
    .filter(([key]) =>
      !["isFullyFilled", "isConfirmed", "isCMSConfirmed"].includes(key)
    )
    .map(([key, value]) => ({
      key,
      field: key,
      value: value,
    }));

  const isEditing = (record) => editingKey === record.key;

  const edit = (record) => {
    setEditingKey(record.key);
  };

  const save = () => {
    setEditingKey(null);
  };

  const handleChange = (e, key) => {
    setContent((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleUpdate = async () => {
    if (!tenantId || !orderId) {
      error("Thiếu tenantId hoặc orderId");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:6969/api/tenant/${tenantId}/order/${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      const data = await res.json();

      if (res.ok) {
        success();
        if (onApprove) onApprove(content);
      } else {
        error(data.message || "Cập nhật thất bại");
      }
    } catch (err) {
      error("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Trường thông tin",
      dataIndex: "field",
      key: "field",
      render: (text) => <span className="font-semibold">{text}</span>,
    },
    {
      title: "Giá trị",
      dataIndex: "value",
      key: "value",
      render: (text, record) =>
        isEditing(record) ? (
          <Input
            value={content[record.key]}
            onChange={(e) => handleChange(e, record.key)}
            size="small"
            onPressEnter={save}
            onBlur={save}
            style={{ fontSize: 13 }}
          />
        ) : (
          <span style={{ fontSize: 13 }}>
            {content[record.key] === undefined || content[record.key] === null || content[record.key] === ""
              ? <span className="italic text-gray-400">Chưa nhập</span>
              : content[record.key].toString()}
          </span>
        ),
    },
    {
      title: "",
      dataIndex: "operation",
      render: (_, record) =>
        isEditing(record) ? null : (
          <Button type="link" size="small" onClick={() => edit(record)}>
            Sửa
          </Button>
        ),
      width: 60,
    },
  ];

  return (
    <>
      {contextHolder}
      <Table
        title={() => <span className="font-semibold">Thông tin đơn</span>}
        dataSource={editableFields}
        columns={columns}
        pagination={false}
        bordered
        size="small"
        className="mb-4"
        rowClassName={() => "editable-row"}
        style={{ fontSize: 13 }}
      />
      <div style={{ textAlign: "right" }}>
        <Button type="primary" loading={loading} onClick={handleUpdate}>
          Cập nhật
        </Button>
      </div>
    </>
  );
}

export default CustomerInfoTable;
