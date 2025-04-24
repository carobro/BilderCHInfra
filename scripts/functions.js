import * as helper from "./helper.js";
export function moveToMapCoordinates(nodeGroup, link, mapLayer, legendBox, projection, legendX,
    legendY, simulation, svg, topicColorMap) {
    link.transition().duration(1000).style("opacity", 0);
    simulation.stop();
    mapLayer.transition().delay(7000).duration(1000).style("opacity", 1);
    legendBox.transition().delay(4000).duration(1000).style("opacity", 1);
    // Remove existing text before appending new text to avoid double text
    nodeGroup.selectAll("text").remove();
    // Reverse styles applied in transformToCirclePack
    nodeGroup.selectAll("circle")
        .transition().duration(1000)
        .attr("r", d => d.group === "thema" ? 15 : 10)
        .style("fill", d => topicColorMap[d.group])
        .style("opacity", 1);
    // Append new text elements
    nodeGroup.append("text")
        .attr("dx", d => d.group === "thema" ? 20 : 12)
        .attr("dy", ".35em")
        .text(d => d.id)
        .style("opacity", 0);
    // Mouseover and mouseout events to control text visibility
    nodeGroup.selectAll("circle")
        .on("mouseover", function(event, d) {
            d3.select(this.parentNode).select("text").style("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this.parentNode).select("text").style("opacity", 0);
        });
    // Apply transition for moving nodes
    nodeGroup.transition().delay(1000).duration(4000)
        .attr("transform", (d, i) => {
            if (d.koordinaten) {
                const [lat, lon] = d.koordinaten.split(", ").map(Number);
                const [x, y] = projection([lon, lat]);
                return `translate(${x},${y})`;
            } else if (d.group === "thema") {
                const x = legendX + 20;
                const y = legendY - 750 + i * 35;
                return `translate(${x},${y})`;
            }
            return "translate(-1000, -1000)";
        })
        .on("end", function() {
            // Ensure text for "thema" group is visible after transition
            nodeGroup.transition().delay(1000).selectAll("text").filter(function(d) {
                return d.group === "thema";
            }).style("opacity", 1);
        });
    nodeGroup.each(function(d) {
        if (d.geometry && d.geometry.type === "MultiLineString") {
            const multilinestring = d.geometry.coordinates;
            multilinestring.forEach(line => {
                // Apply the projection to each coordinate in the line
                const pathData = line.map(coord => {
                    if (!Array.isArray(coord) || coord.length < 2) return ""; // Ensure valid coordinates
                    const [x, y] = projection([coord[0], coord[1]]); // [x, y] order for projection
                    return `${x},${y}`;
                }).filter(Boolean).join("L"); // Filter out invalid points
                // Ensure pathData starts with M (move to the first point)
                const pathString = `M${pathData}`;
                // Append the path to SVG
                svg.append("path")
                    .attr("d", pathString)
                    .attr("fill", "none")
                    .attr("stroke", "grey")
                    .attr("stroke-width", 1)
                    .attr("opacity", 0.7)
                    .style("opacity", 0) // Start with path invisible
                    .transition()
                    .delay(5000) // Delay showing the geometry
                    .duration(1000) // Duration for fading in
                    .style("opacity", 1); // Fade in the path
            });
        }
    });
    helper.handleNodeHover(nodeGroup, svg, projection);
    // Disable dragging while in map view
    nodeGroup.call(d3.drag().on("start", null).on("drag", null).on("end", null));
    nodeGroup.style("opacity", 1);
}
export function resetToInitialPositions(nodeGroup, initialPositions, legendBox, mapLayer, link, simulation, svg, selectedNode) {
    svg.selectAll("path")
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .on("end", function() {
            d3.select(this).remove();
        });

    nodeGroup.selectAll("circle").transition().duration(1000)
        .attr("r", d => d.group === "thema" ? 15 : 10).style("opacity", 1);

    link.transition().delay(3000).duration(1000).ease(d3.easeLinear).style("opacity", 1);

    nodeGroup.transition().delay(1000).duration(5000).selectAll("text").filter(function(d) {
        return d.group === "thema";
    }).style("opacity", 0);

    // Remove all labels from circle pack
    nodeGroup.selectAll("text").remove();

    nodeGroup.selectAll("circle")
        .on("mouseover", function(event, d) {
            d3.select(this.parentNode).select("text").style("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this.parentNode).select("text").style("opacity", 0);
        });

    nodeGroup.transition().duration(4000)
        .attr("transform", d => {
            const pos = initialPositions[d.id] || {
                x: d.x,
                y: d.y
            };
            return `translate(${pos.x},${pos.y})`;
        })
        .on("end", function() {
            setTimeout(function() {
                link.transition().duration(10)
                    .attr("x1", d => {
                        const sourcePos = initialPositions[d.source.id] || {
                            x: d.source.x,
                            y: d.source.y
                        };
                        return sourcePos.x;
                    })
                    .attr("y1", d => {
                        const sourcePos = initialPositions[d.source.id] || {
                            x: d.source.x,
                            y: d.source.y
                        };
                        return sourcePos.y;
                    })
                    .attr("x2", d => {
                        const targetPos = initialPositions[d.target.id] || {
                            x: d.target.x,
                            y: d.target.y
                        };
                        return targetPos.x;
                    })
                    .attr("y2", d => {
                        const targetPos = initialPositions[d.target.id] || {
                            x: d.target.x,
                            y: d.target.y
                        };
                        return targetPos.y;
                    })
                    .style("opacity", 1);
            }, 0);

            // Reapply the link highlighting for the selected node
            if (selectedNode) {

                link.style("opacity", link => {
                    return (link.source.id === selectedNode.id || link.target.id === selectedNode.id) ? 1 : 0.2;
                })
                .style("stroke", link => {
                    return (link.source.id === selectedNode.id || link.target.id === selectedNode.id) ? "yellow" : "#999";
                })
                .style("stroke-width", link => {
                    return (link.source.id === selectedNode.id || link.target.id === selectedNode.id) ? 3 : 2;
                });
            }
        }).style("opacity", 1);

    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);

    mapLayer.transition().duration(2000).ease(d3.easeLinear).style("opacity", 0);

    nodeGroup.call(helper.drag(simulation));
}
export function transformToCirclePack(nodesData, svg, nodeGroup, mapLayer, legendBox, link, projection) {
    svg.selectAll("path").transition().duration(1000).style("opacity", 0).on("end", function() {
        d3.select(this).remove();
    });
    // Hide map view & legend
    nodeGroup.selectAll("circle").style("opacity", 1);
    link.transition().duration(1000).style("opacity", 0);
    mapLayer.transition().duration(2000).ease(d3.easeLinear).style("opacity", 0);
    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
    // Disable drag behavior
    nodeGroup.on(".drag", null);
    const rootNodes = nodesData.filter(d => d.group === "thema");
    const rootData = {
        name: "root",
        children: rootNodes.map(rootNode => {
            const children = nodesData.filter(
                d => d.group === rootNode.id && d !== rootNode
            );
            return {
                ...rootNode,
                children: children
            };
        })
    };
    const root = d3.hierarchy(rootData)
        .sum(d => d.children ? 1 : 10)
        .sort((a, b) => b.value - a.value);
    const packLayout = d3.pack()
        .size([svg.attr("width") / 1.5, svg.attr("height") / 1.5])
        .padding(1);
    packLayout(root);
    const radiusMap = new Map(root.descendants().map(d => [d.data.id, d.r]));
    const themaNodes = nodeGroup.filter(d => d.group === "thema");
    const nodeNodes = nodeGroup.filter(d => d.group !== "thema");
    // Position children nodes
    nodeNodes.transition()
        .duration(2000)
        .attr("transform", function(d, i, nodes) {
            const isSelected = d3.select(nodes[i]).classed("selected-node");
            const target = root.descendants().find(n => n.data.id === d.id);
            if (isSelected) {
                return d3.select(nodes[i]).attr("transform");
            }
            return target ? `translate(${target.x},${target.y})` : "translate(-1000,-1000)";
        });

    // Position thema nodes (optional, if needed)
    themaNodes.lower().transition()
        .duration(2000)
        .attr("transform", function(d, i, nodes) {
            const isSelected = d3.select(nodes[i]).classed("selected-node");
            const target = root.children.find(n => n.data.id === d.id);
            if (isSelected) {
                return d3.select(nodes[i]).attr("transform");
            }
            return target ? `translate(${target.x},${target.y})` : "translate(-1000,-1000)";
        });
    // Style thema node circles
    themaNodes.selectAll("circle")
        .transition()
        .duration(2000)
        .attr("r", d => radiusMap.get(d.id) || 0)
        .style("fill", d => d.color || "#ccc")
        .style("stroke", "#666")
        .style("stroke-width", 2)
        .style("opacity", 0.3);
    // Thema labels
        // Stop hover events for thema nodes
themaNodes.on("mouseover", null).on("mouseout", null);


    themaNodes.selectAll("text")
        .lower()
        .transition().delay(2000)
        .attr("text-anchor", "middle")
        .attr("y", d => -((radiusMap.get(d.id) || 0) - 25))
        .attr("dx", null)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("opacity", 1)
        .style("pointer-events", "none");

    // Style node circles
    nodeNodes.selectAll("circle")
        .transition()
        .duration(2000)
        .attr("r", d => radiusMap.get(d.id) || 0)
        .style("fill", function(d, i, nodes) {
            console.log(nodes[i])
            if (d3.select(nodes[i]).classed("selected-node")) return null;
            const parent = root.children.find(n => n.data.id === d.group);
            return parent ? (parent.data.color || "#eee") : null;
        })
        .style("stroke-width", (d, i, nodes) =>
            d3.select(nodes[i]).classed("selected-node") ? null : 4
        )

        
        .style("opacity", (d, i, nodes) =>
            d3.select(nodes[i]).classed("selected-node") ? null : 1
        );

    nodeNodes
        .on("mouseover", function(event, d) {
            const label = d3.select(this).select("text");
            const radius = d.r || 20; // fallback if radius is undefined
            const words = d.name.split(" ");
            const lineHeight = 12;
            const totalHeight = words.length * lineHeight;
            const startY = -totalHeight / 2 + lineHeight / 2;
            label
                .text("")
                .style("opacity", 1)
                .attr("text-anchor", "middle")
                .attr("dy", null)
                .attr("dx", null);
            label.selectAll("tspan").remove(); // double-clear, for safety
            words.forEach((word, index) => {
                label.append("tspan")
                    .attr("x", 0)
                    .attr("y", startY + index * lineHeight)
                    .text(word);
            });
        })
        .on("mouseout", function(event, d) {
            const label = d3.select(this).select("text");
            label
                .style("opacity", 0)
                .text(d.name) // restore original label, if needed
                .selectAll("tspan").remove();
        });  
        
        
    }    
