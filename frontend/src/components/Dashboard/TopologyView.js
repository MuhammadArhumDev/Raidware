"use client";

import { useEffect, useRef } from "react";

export default function TopologyView({ nodes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Resize canvas
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 400; // Fixed height
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Render Nodes
    const nodeList = Object.values(nodes);

    // Simple layout: Grid
    const gw = 100; // grid width cell
    const gh = 100; // grid height cell

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Central Gateway/Server
      const cx = canvas.width / 2;
      const cy = 50;

      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
      ctx.fillStyle = "#4f46e5"; // Indigo
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.fillText("GW", cx - 8, cy + 3);

      // Draw Nodes
      nodeList.forEach((node, i) => {
        // Position nodes in a row/grid below gateway
        const perRow = Math.floor(canvas.width / gw);
        const row = Math.floor(i / perRow) + 1;
        const col = i % perRow;

        // Center the row
        const rowWidth =
          Math.min(nodeList.length - (row - 1) * perRow, perRow) * gw;
        const xOffset = (canvas.width - rowWidth) / 2 + gw / 2;

        const x = xOffset + col * gw;
        const y = cy + row * gh;

        // Draw Line to Gateway (Logic: All connect to gateway in star topology for now)
        ctx.beginPath();
        ctx.moveTo(cx, cy + 20);
        ctx.lineTo(x, y - 15);
        ctx.strokeStyle = "#e5e7eb";
        ctx.stroke();

        // Draw Node Circle
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = node.status === "online" ? "#22c55e" : "#ef4444";
        ctx.fill();

        ctx.fillStyle = "#1f2937"; // gray-800
        ctx.font = "10px sans-serif";
        // Shorten MAC
        const label = node.macAddress ? node.macAddress.substring(0, 4) : "???";
        ctx.fillText(label, x - 10, y + 25);
      });
    };

    draw();

    return () => window.removeEventListener("resize", resize);
  }, [nodes]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Network Topology
      </h3>
      <div className="w-full relative">
        <canvas ref={canvasRef} className="w-full" />
      </div>
    </div>
  );
}
