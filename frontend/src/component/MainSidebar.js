import { Menu } from 'antd';
import { UserOutlined, FileOutlined } from '@ant-design/icons';

export default function MainSidebar({ onSelect }) {
  return (
    <Menu
      mode="inline"
      defaultSelectedKeys={['']}
      onClick={(e) => onSelect(e.key)}
      style={{
        backgroundColor: 'inherit', // ✅ kế thừa từ cha
        color: 'white',             // ✅ text màu trắng
        borderRight: 0,             // ✅ xóa border mặc định
      }}
      theme="dark" // ✅ dùng theme dark để antd tự điều chỉnh highlight phù hợp
      items={[
        { key: 'waiting', icon: <UserOutlined />, label: 'Waiting Clients' },
        { key: 'orders', icon: <FileOutlined />, label: 'Orders' },
      ]}
    />
  );
}
