import LayoutWithSidebars from "@/component/LayoutWithSidebars";
import { SocketProvider } from "@/context/socketContext";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "../../globals.css"; // Import global styles

export default function CmsLayout({ children }) {
  return (
        <AntdRegistry>
          <SocketProvider namespace="http://localhost:7000/cms">
            <LayoutWithSidebars>{children}</LayoutWithSidebars>
          </SocketProvider>
        </AntdRegistry>
  );
}