import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UserOutlined, RobotOutlined, SolutionOutlined } from "@ant-design/icons";

export default function MessageBubble({ message }) {
  if (!message) return null;

  const { text, time, role } = message;
  const isCms = role === "cms";
  const isBot = role === "LLM" || role === "bot";
  const isUser = !isCms && !isBot;

  const name = isBot ? "Bot" : isCms ? "CMS" : "Client";
  const icon = isBot
    ? <RobotOutlined style={{ fontSize: 18, color: "#22c55e" }} />
    : isCms
      ? <SolutionOutlined style={{ fontSize: 18, color: "orange" }} />
      : <UserOutlined style={{ fontSize: 18, color: "blue" }} />;

  const bubbleClass = isUser
    ? "bg-blue-100 text-gray-900"
    : isBot
      ? "bg-green-100 text-gray-900"
      : "bg-orange-100 text-gray-900";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`flex items-end ${isUser ? "flex-row-reverse" : "flex-row"} max-w-2xl`}>
        <div className="mx-2">{icon}</div>
        <div>
          <div className={`rounded-xl px-4 py-2 shadow ${bubbleClass} prose`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // style hình ảnh
                img: ({node, ...props}) => (
                  <img
                    {...props}
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: 8 }}
                    alt={props.alt || ''}
                  />
                ),
                // style link (mở tab mới)
                a: ({node, ...props}) => (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {props.children}
                  </a>
                )
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? "text-right" : "text-left"}`}>
            {name} – {new Date(time).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
