export function ticked(link, nodeGroup) {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
}


export function moveToMapCoordinates(nodeGroup, link, isMapView, svg2, mapLayer, legendBox, projection, legendX,
    legendY, simulation, geojsonLayer, svg, sichtLayer, barchart, topicColorMap) {
    if (barchart) {
        link.style("opacity", 0);
        nodeGroup.selectAll("rect").transition().delay(200).duration(200).style("opacity", 0);
        nodeGroup.selectAll("rect").remove(); // Remove previous rectangles if present
        nodeGroup.selectAll("circle").transition().delay(200).duration(200).style("opacity", 1);
    } else {
        link.transition().duration(1000).style("opacity", 0);
    }

    isMapView = true; // Map view is activated
    simulation.stop();
    svg2.transition().duration(3000).style("opacity", 0);

    mapLayer.transition().delay(7000).duration(1000).style("opacity", 1);
    legendBox.transition().delay(4000).duration(1000).style("opacity", 1);

    const zoom = d3.zoom()
        .scaleExtent([1, 10]) // Set the zoom range, e.g., from 1x to 10x zoom
        .on("zoom", function (event) {
            svg.select("g.map").attr("transform", event.transform); // Apply zoom transform to the map
            svg.select("g.nodes").attr("transform", event.transform); // Apply zoom transform to the nodes
        });
    svg.call(zoom); // Apply the zoom behavior to the entire SVG

    // Remove existing text before appending new text to avoid double text
    nodeGroup.selectAll("text").remove();

    // Append new text elements
    nodeGroup.append("text")
        .attr("dx", d => d.group === "Thema" ? 20 : 12)
        .attr("dy", ".35em")
        .text(d => d.id)
        .style("opacity", 0);

    // Mouseover and mouseout events to control text visibility
    nodeGroup.on("mouseover", function (event, d) {
            d3.select(this).select("text").style("opacity", 1);
        })
        .on("mouseout", function (event, d) {
            d3.select(this).select("text").style("opacity", 0);
        });

    // Apply transition for moving nodes
    nodeGroup.transition().delay(1000).duration(4000)
        .attr("transform", (d, i) => {
            if (d.Koordinaten) {
                const [lat, lon] = d.Koordinaten.split(", ").map(Number);
                const [x, y] = projection([lon, lat]);
                return `translate(${x},${y})`;
            } else if (d.group === "Thema") {
                const x = legendX + 20;
                const y = legendY + 30 + i * 35;
                return `translate(${x},${y})`;
            }
            return "translate(-1000, -1000)";
        })
        .on("end", function () {
            // Ensure text for "Thema" group is visible after transition
            nodeGroup.transition().delay(1000).selectAll("text").filter(function (d) {
                return d.group === "Thema";
            }).style("opacity", 1);
        });

    // Zoom and pan the map + non-"Thema" nodes together
    nodeGroup.on("click", (event, d) => {
        zoomToNode(d, projection, svg, zoom, mapLayer, nodeGroup, legendBox, legendX, legendY, sichtLayer);
    });

    // Disable dragging while in map view
    nodeGroup.call(d3.drag().on("start", null).on("drag", null).on("end", null));
    nodeGroup.style("opacity", 1);
}
 

// Apply zoom transformation (if required for your zoom function)
function zoomToNode(d, projection, svg, zoom, mapLayer, nodeGroup, legendBox, legendX, legendY, sichtLayer) {
    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
    if (d.Koordinaten) {
        const [lat, lon] = d.Koordinaten.split(", ").map(Number);
        const [x, y] = projection([lon, lat]); // Correct projection

        // Get SVG dimensions
        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const scale = 5;

        // Calculate translation to center the clicked node
        const translateX = width / 2 - x * scale;
        const translateY = height / 2 - y * scale;

        // Create the zoom transform
        const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

        // Apply zoom and translation to the mapLayer
        mapLayer.transition().duration(2000)
            .attr("transform", transform);

        // Apply zoom and translation to the sichtbarLayer
        sichtLayer.transition().delay(4000).duration(1000)
           .style("opacity", 1).attr("transform", transform);

        // Apply zoom only to the non-"Thema" nodes
        nodeGroup.transition().duration(2000)
            .attr("transform", function(d, i) {
                if (d.group !== "Thema") {
                    const [lat, lon] = d.Koordinaten.split(", ").map(Number);
                    const [x, y] = projection([lon, lat]);
                    return `translate(${x},${y})`;
                }
                return d3.select(this).attr("transform"); // Keep "Thema" nodes in place
            });

        // Remove any existing images
        nodeGroup.selectAll("image").remove();

        // Append the image only to the clicked node
        const clickedNode = nodeGroup.filter(n => n === d);
        if (d.URL) {
            setTimeout(() => {
            clickedNode.append("image")
                .attr("x", -20)
                .attr("y", -20)
                .attr("width", 40)
                .attr("height", 40)
                .attr("href", d.URL);
        }, 2000)}

        svg.transition().duration(2000).call(zoom.transform, transform);
    }
}





export function resetToInitialPositions(nodeGroup, isMapView, svg2, initialPositions, legendBox, mapLayer, link,
    simulation) {

    //svg2.transition().duration(1000).style("opacity", 0);
    isMapView = false;
    nodeGroup.selectAll("circle").style("opacity", 1);
    link.transition().delay(1000).duration(1000).ease(d3.easeLinear).style("opacity", 1);
    nodeGroup.transition().delay(1000).duration(5000).selectAll("text").filter(function (d) {
        return d.group === "Thema";
    }).style("opacity", 0);
    nodeGroup.selectAll("rect").remove();
    // Remove rectangles and restore circles
    nodeGroup.selectAll("rect").transition().duration(1000).style("opacity", 0); // Fade out rectangles
    nodeGroup.selectAll("circle").transition().duration(1000).style("opacity", 1);
    
    nodeGroup.transition().duration(4000)
        .attr("transform", d => {
            mapLayer.transition().duration(2000).ease(d3.easeLinear).style("opacity", 0);
            const pos = initialPositions[d.id] || {
                x: d.x,
                y: d.y
            };
            return `translate(${pos.x},${pos.y})`;
        })
        .on("end", function () {
            setTimeout(function () {
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
        }) .style("opacity", 1)


                
    nodeGroup.on("click", function (event, d) {
        console.log(d.id);
    });

    console.log(simulation)
    nodeGroup.call(d3.drag().on("start", (event, d) => func.dragstarted(event, d, simulation))
        .on("drag", dragged)
        .on("end", (event, d) => func.dragended(event, d, simulation)));
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
        simulation.alphaTarget(0.3).restart();
    }
    d.fx = null;
    d.fy = null;
}

export function showDiagramm(mapLayer, link, nodeGroup, legendBox, svg2, nodes, colorScale) {
    // Hide map and network views
    mapLayer.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
    link.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
    nodeGroup.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);


    // Separate "Thema" nodes and others
    const themaNodes = nodes.filter(d => d.group === "Thema");
    const nonThemaNodes = nodes.filter(d => d.group !== "Thema");

    // Count the remaining nodes for the bars
    const groupCounts = d3.rollup(nonThemaNodes, v => v.length, d => d.group);
    const barData = Array.from(groupCounts, ([group, count]) => ({
        group,
        count
    }));
    const margin = {
        top: 20,
        right: 30,
        bottom: 40,
        left: 50
    };

    // Set up scales
    const xScale = d3.scaleBand()
        .domain(barData.map(d => d.group))
        .range([margin.left, d3.select("#barChart").attr("width") - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.count)]).nice()
        .range([d3.select("#barChart").attr("height") - margin.bottom, margin.top]);

    // Show bar chart axes
    svg2.transition().duration(1000).style("opacity", 1);

    svg2.append("g")
        .attr("transform", `translate(0,${d3.select("#barChart").attr("height") - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .attr("class", "axis");

    svg2.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale))
        .attr("class", "axis");

    // Move and stack the non-"Thema" nodes, transforming them into rectangles
    const verticalOffset = 30; // Small vertical offset to stack nodes

    // Group the non-"Thema" nodes by their group
    const groupedNodes = d3.groups(nonThemaNodes, d => d.group);

    groupedNodes.forEach(([group, nodesInGroup], i) => {
        nodeGroup
            .filter(d => d.group === group) // Select only nodes of this group
            .transition()
            .duration(2000)
            .attr("transform", function (d, j) {
                // Get the x position based on the group
                const x = (xScale(group) + xScale.bandwidth() / 2) - 15;
                // Stack the nodes on the y-axis for each group, starting from the bottom
                const chartHeight = d3.select("#barChart").attr("height");
                const y = chartHeight - margin.bottom - (j * verticalOffset) - 30; // Stack from the bottom
                return `translate(${x},${y})`;
            })
            .each(function (d, j) {
                // Transform into rectangles with opacity 1
                d3.select(this).append("rect")
                    .attr("width", 30) // Set width
                    .attr("height", 30) // Set height
                    .attr("fill", d => colorScale[d.group])
                    .attr("stroke-width", 1)
                    .attr("stroke", "#999")
                    .style("opacity",
                        0)
                   .transition().delay(2000).duration(200).style("opacity",
                        1); // Dissolve circle
                    
            });
            
        nodeGroup.filter(d => d.group === group).selectAll("text").attr("dx", 35).attr("dy",
            15) // Set opacity of circles to 0 for non-"Thema" nodes
    });

    // Handle "Thema" nodes separately, placing them just below the x-axis
    nodeGroup
        .filter(d => d.group === "Thema")
        .transition()
        .duration(2000)
        .attr("transform", d => {
            const groupIndex = barData.findIndex(b => b.group === d.id); // Match bar by group ID
            if (groupIndex !== -1) {
                const x = xScale(barData[groupIndex].group) + xScale.bandwidth() / 2;
                const y = d3.select("#barChart").attr("height") - margin.bottom +
                    20; // Position just below the x-axis
                return `translate(${x},${y})`;
            }
            return null; // Hide unmatched nodes
        })
        .on("end", function (event, d) {
            nodeGroup.transition().delay(200).selectAll("text").filter(function (d) {
                return d.group === "Thema";
            }).style("opacity", 1).attr("dx", -25);
            d3.select(this).select("circle").transition().delay(200).duration(200).style("opacity",
                0); // Dissolve circle
        });

    // Reduce opacity for non-"Thema" circles
    nodeGroup
        .filter(d => d.group !== "Thema")
        .selectAll("circle")
        .transition()
        .duration(1000)
        .style("opacity", 0); // Set opacity to 0.3 for non-"Thema" circles
}