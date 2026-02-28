"use client";

import React from "react";

// GenUI Spec 格式：flat element map + root pointer
export interface UISpec {
  root: string;
  elements: Record<string, UIElement>;
}

export interface UIElement {
  type: string;
  props: Record<string, any>;
  children: string[];
}

// 渲染单个元素
function renderElement(id: string, spec: UISpec): React.ReactNode {
  const el = spec.elements[id];
  if (!el) return null;

  const kids = el.children?.map((cid) => renderElement(cid, spec));

  switch (el.type) {
    case "Card":
      return (
        <div key={id} className="genui-card">
          {el.props.title && <div className="genui-card-title">{el.props.title}</div>}
          {kids}
        </div>
      );
    case "Stack":
      return (
        <div key={id} className={`genui-stack genui-stack-${el.props.direction || "vertical"} genui-gap-${el.props.gap || "md"}`}>
          {kids}
        </div>
      );
    case "Heading":
      return <h2 key={id} className="genui-heading">{el.props.text}</h2>;
    case "Text":
      return (
        <p key={id} className={`genui-text genui-text-${el.props.size || "md"} ${el.props.color === "muted" ? "genui-muted" : ""} ${el.props.weight === "semibold" ? "genui-semibold" : ""}`}>
          {el.props.text}
        </p>
      );
    case "Badge":
      return <span key={id} className="genui-badge">{el.props.text}</span>;
    case "Button":
      return <button key={id} className="genui-button">{el.props.label}</button>;
    case "Separator":
      return <hr key={id} className="genui-separator" />;
    case "Radio":
      return (
        <div key={id} className="genui-radio-group">
          {el.props.options?.map((opt: any, i: number) => (
            <label key={i} className="genui-radio">
              <input type="radio" name={el.props.name} value={opt.value} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    default:
      return <div key={id} className="genui-unknown">[{el.type}]</div>;
  }
}

export function GenUIRenderer({ spec }: { spec: UISpec }) {
  if (!spec?.root || !spec?.elements) return null;
  return <div className="genui-root">{renderElement(spec.root, spec)}</div>;
}
