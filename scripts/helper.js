export function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) {
            simulation.alphaTarget(0);
               }
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// Function to handle image display on hover with callout lines
export function handleNodeHover(nodeGroup, svg, projection) {
    console.log(nodeGroup.selectAll("circle"));
    nodeGroup.selectAll("circle").on("mouseover", function(event, d) {
        if (d.url) {
            const svgWidth = +svg.attr("width");
            const [lat, lon] = d.koordinaten.split(", ").map(Number);
            const [x, y] = projection([lon, lat]);
            const imageX = svgWidth - 400;
            const imageY = 10;

            d3.select("#hover-image").remove(); // Remove existing image if any
            d3.select("#hover-line").remove(); // Remove existing line if any

            // Draw callout line from node to image
            svg.append("line")
                .attr("id", "hover-line")
                .attr("x1", x)
                .attr("y1", y)
                .attr("x2", imageX + 200)
                .attr("y2", imageY + 200)
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "4 2");
            // Append image on the right
            svg.append("image")
                .attr("id", "hover-image")
                .attr("x", imageX)
                .attr("y", imageY)
                .attr("width", 400)
                .attr("height", 400)
                .attr("href", d.url);
        }
    }).on("mouseout", function() {
        d3.select("#hover-image").remove();
        d3.select("#hover-line").remove();
    });
}

export function ticked(linkSelection, nodeSelection, width, height, radius = 10) {
    linkSelection
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    nodeSelection
        .attr("transform", d => {
            // Clamp x and y to stay within bounds, taking radius into account
            d.x = Math.max(radius, Math.min(width - radius, d.x));
            d.y = Math.max(radius, Math.min(height - radius, d.y));
            return `translate(${d.x},${d.y})`;
        });
}
