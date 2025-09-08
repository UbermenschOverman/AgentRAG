"use client";
import { useEffect, useState } from "react";
import {
  Spin,
  Typography,
  Empty,
  Form,
  Input,
  Button,
  message,
} from "antd";

const { Title } = Typography;

export default function OrderDetail({ tenantId, orderId, showOrder }) {
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const success = (msg) => {
    messageApi.open({
      type: "success",
      content: msg || "Cập nhật thành công!",
    });
  };

  const error = (msg) => {
    messageApi.open({
      type: "error",
      content: msg || "Đã xảy ra lỗi!",
    });
  };

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
  }, [tenantId, orderId, form, showOrder]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const res = await fetch(
        `http://localhost:6969/api/tenant/${tenantId}/order/${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: values }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        success("Cập nhật đơn hàng thành công!");
      } else {
        error(result.message || "Cập nhật thất bại");
      }
    } catch (err) {
      error("Dữ liệu không hợp lệ hoặc lỗi mạng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Spin spinning={loading}>
        {data ? (
          <div>
            <Title level={5}>Thông tin đơn hàng: {orderId}</Title>
            <Form form={form} layout="vertical" initialValues={data}>
              {Object.entries(data).map(([key]) => (
                <Form.Item key={key} name={key} label={key}>
                  <Input placeholder={`Nhập ${key}`} allowClear />
                </Form.Item>
              ))}
              <div style={{ textAlign: "right" }}>
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  Gửi cập nhật
                </Button>
              </div>
            </Form>
          </div>
        ) : !loading ? (
          <Empty description="Không có dữ liệu" />
        ) : null}
      </Spin>
    </>
  );
}
