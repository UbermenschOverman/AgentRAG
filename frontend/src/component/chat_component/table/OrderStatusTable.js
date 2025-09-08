import {Table} from "antd";

function OrderStatusTable({ meta }) {
  const fields = Object.entries(meta || {}).map(([key, value], idx) => ({
    key,
    field: key,
    value:
      value === undefined || value === null || value === ""
        ? <span className="italic text-gray-400">Chưa nhập</span>
        : value.toString(),
  }));

  const columns = [
    { title: "Trường trạng thái", dataIndex: "field", key: "field", render: (text) => <span className="font-semibold">{text}</span> },
    { title: "Giá trị", dataIndex: "value", key: "value" },
  ];

  return (
    <Table
      title={() => <span className="font-semibold">Trạng thái đơn</span>}
      dataSource={fields}
      columns={columns}
      pagination={false}
      bordered
      size="small"
      className="mb-4"
    />
  );
}

export default OrderStatusTable;