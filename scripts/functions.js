export function ticked(link, nodeGroup) {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}

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
        .style("fill", d => topicColorMap[d.group]) // Or whatever default color you use
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
                .delay(5000)  // Delay showing the geometry
                .duration(1000)  // Duration for fading in
                .style("opacity", 1);  // Fade in the path
            });
            }
        });

    handleNodeHover(nodeGroup, svg, projection);
    // Disable dragging while in map view
    nodeGroup.call(d3.drag().on("start", null).on("drag", null).on("end", null));
    nodeGroup.style("opacity", 1);
}

export function resetToInitialPositions(nodeGroup, initialPositions, legendBox, mapLayer, link, simulation,svg) {
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
            legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
        }).style("opacity", 1)

    mapLayer.transition().duration(2000).ease(d3.easeLinear).style("opacity", 0);
    nodeGroup.on("click", function(event, d) {});
    nodeGroup.call(d3.drag().on("start", (event, d) => dragstarted(event, d, simulation))
        .on("drag", dragged)
        .on("end", (event, d) => dragended(event, d, simulation)));
}

export function dragstarted(event, d, simulation) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

export function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

export function dragended(event, d, simulation) {
    if (!event.active) {
        simulation.alphaTarget(0.1).stop();
    }
    d.fx = null;
    d.fy = null;
}

// Function to handle image display on hover with callout lines
function handleNodeHover(nodeGroup, svg, projection) {
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

export function transformToCirclePack(nodesData, svg, nodeGroup, mapLayer, legendBox, link, projection) {
    svg.selectAll("path")
    .transition()
    .duration(1000) 
    .style("opacity", 0)  
    .on("end", function() {
        d3.select(this).remove();
    });
    // Hide map view & legend
    nodeGroup.selectAll("circle").style("opacity", 1);
    link.transition().duration(1000).style("opacity", 0);
    mapLayer.transition().duration(2000).ease(d3.easeLinear).style("opacity", 0);
    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);

    // Disable hover behavior
    //nodeGroup.on("mouseover", null).on("mouseout", null);
        
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

    // Step 3: Create hierarchy and apply pack layout
    const root = d3.hierarchy(rootData)
        .sum(d => d.children ? 1 : 10)
        .sort((a, b) => b.value - a.value);

    const packLayout = d3.pack()
        .size([svg.attr("width") / 1.5, svg.attr("height") / 1.5])
        .padding(1);

    packLayout(root);    
    nodeGroup.transition()
        .duration(2000)
        .attr("transform", function(d) {
            const target = root.descendants().find(n => n.data.id === d.id);
            return target ? `translate(${target.x},${target.y})` : "translate(-1000,-1000)";
        });

    // Step 5: Style & resize all circles
    nodeGroup.selectAll("circle")
        .transition()
        .duration(2000)
        .attr("r", function(d) {
            const target = root.descendants().find(n => n.data.id === d.id);
            return target ? target.r : 0;
        })
        .style("fill", function(d) {
            const target = root.children.find(n => n.data.id === d.id);
            return target ? (target.data.color || "#eee") : null;
        })
        .style("stroke", function(d) {
            const target = root.children.find(n => n.data.id === d.id);
            return target ? "#999" : null;
        })
        .style("stroke-width", function(d) {
            const target = root.children.find(n => n.data.id === d.id);
            return target ? 2 : null;
        })
        .style("opacity", function(d) {
            const target = root.children.find(n => n.data.id === d.id);
            return target ? 0.3 : 1;
        })

    // Remove any previous labels
    //nodeGroup.selectAll("text").remove();

    // Filter only nodes with group === "thema"

    // Map node IDs to their computed radius from the packed layout
    const radiusMap = new Map(
        root.descendants().map(d => [d.data.id, d.r])
    );

    const themaNodes = nodeGroup.filter(d => d.group === "thema");
    themaNodes.selectAll("text")
        .transition().delay(2000)
        .attr("text-anchor", "middle")
        .attr("y", function(d) {
            const r = radiusMap.get(d.id) || 0;
            return -r + 25; // 10px above the circle
        })
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("opacity", 1);

        nodeGroup.filter(d => d.group !== "thema")
        .attr("dy", "20em")
        .on("mouseover", function(event, d) {
            console.log(event, d)
            d3.select(this).select("text").style("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).select("text").style("opacity", 0);
        });

}
