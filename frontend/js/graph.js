function renderGraph(graphData) {
  if (!graphData || !graphData.nodes || !graphData.edges) {
    console.error("Dữ liệu đồ thị không hợp lệ");
    return;
  }

  const canvas = document.getElementById("relationship-graph");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;

  const nodes = graphData.nodes.map((node) => ({
    id: node.address,
    group: node.type === "main" ? 1 : node.type === "contract" ? 2 : 3,
    radius: node.type === "main" ? 15 : 10,
    label: node.address.substring(0, 8) + "...",
  }));

  const links = graphData.edges.map((edge) => ({
    source: edge.from,
    target: edge.to,
    value: edge.value,
    type: edge.type,
  }));

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(100)
    )
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .on("tick", ticked);

  function ticked() {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    links.forEach((link) => {
      const source = link.source;
      const target = link.target;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (link.type === "sent") {
        ctx.strokeStyle = "#ff6b6b";
      } else {
        ctx.strokeStyle = "#4ecdc4";
      }

      ctx.stroke();

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);

      const arrowLength = 10;
      const arrowX = target.x - target.radius * Math.cos(angle);
      const arrowY = target.y - target.radius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = link.type === "sent" ? "#ff6b6b" : "#4ecdc4";
      ctx.fill();
    });

    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

      if (node.group === 1) {
        ctx.fillStyle = "#3498db";
      } else if (node.group === 2) {
        ctx.fillStyle = "#9b59b6";
      } else {
        ctx.fillStyle = "#2ecc71";
      }

      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + node.radius + 12);
    });
  }
}
