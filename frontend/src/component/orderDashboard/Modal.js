import { Modal } from "antd";

/**
 * Hiển thị một modal với nội dung là component được truyền vào.
 * @param {Object} props
 * @param {boolean} props.open - Trạng thái mở/đóng modal
 * @param {function} props.onClose - Hàm đóng modal
 * @param {React.ReactNode} props.children - Component muốn render trong modal
 * @param {string} [props.title] - Tiêu đề modal (tùy chọn)
 */
export default function CustomModal({ open, onClose, children, title }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={title}
      destroyOnHidden
      centered
    >
      {children}
    </Modal>
  );
}