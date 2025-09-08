// import LayoutWithSidebars from "../component/LayoutWithSidebars";
// import { SocketProvider } from "@/context/socketContext";
// import { AntdRegistry } from "@ant-design/nextjs-registry";
// // import gloabal styles
// import "./globals.css";

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body style={{ margin: 0, padding: 0 }}>
//         <AntdRegistry>
//           <SocketProvider namespace="http://localhost:7000/cms">
//             <LayoutWithSidebars>{children}</LayoutWithSidebars>
//           </SocketProvider>
//         </AntdRegistry>
//       </body>
//     </html>
//   );
// }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
