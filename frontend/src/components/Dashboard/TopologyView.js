"use client";

import { useEffect, useRef } from "react";

export default function TopologyView({ nodes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 300;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeList = Object.values(nodes);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = 40;

      ctx.fillStyle = "#111827";
      ctx.fillRect(cx - 30, cy - 16, 60, 32);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SERVER", cx, cy + 4);

      if (nodeList.length === 0) {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "13px sans-serif";
        ctx.fillText("No devices connected", cx, 160);
        return;
      }

      const radius = Math.min(120, 50 + nodeList.length * 15);

      nodeList.forEach((node, i) => {

        const angleSpread = Math.PI * 0.7;
        const startAngle = Math.PI / 2 - angleSpread / 2;
        let angle;
        if (nodeList.length === 1) {
          angle = Math.PI / 2;
        } else {
          angle = startAngle + (i * angleSpread) / (nodeList.length - 1);
        }

        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius + 20;

        ctx.beginPath();
        ctx.moveTo(cx, cy + 16);
        ctx.lineTo(x, y - 12);
        ctx.strokeStyle =
          node.status === "online"
            ? "rgba(34, 197, 94, 0.4)"
            : "rgba(156, 163, 175, 0.3)";
        ctx.lineWidth = 2;
        if (node.status === "offline") {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        const nodeColor =
          node.status === "online"
            ? "#22c55e"
            : node.status === "pending"
              ? "#eab308"
              : "#6b7280";
        ctx.fillStyle = nodeColor;
        ctx.fillRect(x - 16, y - 10, 32, 20);

        ctx.fillStyle = "#374151";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        const label = node.name
          ? node.name.length > 8
            ? node.name.substring(0, 8) + "…"
            : node.name
          : node.mac
            ? node.mac.substring(node.mac.length - 5)
            : "???";
        ctx.fillText(label, x, y + 24);

        ctx.fillStyle = "#9ca3af";
        ctx.font = "8px sans-serif";
        ctx.fillText(node.status || "unknown", x, y + 34);
      });
    };

    draw();

    return () => window.removeEventListener("resize", resize);
  }, [nodes]);

  return (
    <div className="w-full bg-white rounded-none shadow-sm p-4 border-[1.5px] border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Network Topology
      </h3>
      <div className="w-full relative">
        <canvas ref={canvasRef} className="w-full" />
      </div>
      {Object.keys(nodes).length > 0 && (
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-green-500" />
            <span className="text-xs text-gray-500">Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-yellow-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-gray-500" />
            <span className="text-xs text-gray-500">Offline</span>
          </div>
        </div>
      )}
    </div>
  );
}
