Promise.all([
    d3.json("nodes.json"), // Nodes data
    d3.json("links.json"), // Links data
    d3.json("switzerland.geojson") // Swiss map GeoJSON
]).then(([nodes, links, switzerland]) => {
    const svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    const colorScale = {
        Kraftwerke: "#f2e707",
        Nationalstrassen: "#13e84b",
        Gewässer: "#1998fa",
        Reaktoren: "#ff9999",
        Raffinerien: "#fa194a"
    };

    // Create a mapping from topic node IDs to their colors
    const topicColorMap = {};
    nodes.forEach(d => {
        if (d.group === "Thema" && d.color) {
            topicColorMap[d.id] = d.color;  // Map the topic ID to its color
        }
    });

    const projection = d3.geoMercator()
        .center([8.2275, 46.8182]) // Center over Switzerland
        .scale(8000)
        .translate([width / 2, height / 2]);

    const geoPathGenerator = d3.geoPath().projection(projection);

    const mapLayer = svg.append("g").attr("class", "map");
    mapLayer.selectAll("path")
        .data(switzerland.features)
        .enter()
        .append("path")
        .attr("d", geoPathGenerator)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#9999");

    mapLayer.style("opacity", 0); // Initially hide the map

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke-width", 2)
        .attr("stroke", "#999");

    const nodeGroup = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    nodeGroup.append("circle")
        .attr("r", d => d.group === "Thema" ? 15 : 10)
        .attr("fill", d => {
            if (d.Thema && topicColorMap[d.Thema]) {
                return topicColorMap[d.Thema];
            }
            return d.color || colorScale[d.group] || d.group;
        });

    let text = nodeGroup.append("text")
        .attr("dx", d => d.group === "Thema" ? 20 : 12)
        .attr("dy", ".35em")
        .text(d => d.id)
        .style("opacity", 0); // Initially hide the text

    nodeGroup.on("mouseover", function(event, d) {
            d3.select(this).select("text").style("opacity", 1); // Show text
        })
        .on("mouseout", function(event, d) {
            d3.select(this).select("text").style("opacity", 0); // Hide text
        });

    // Define legend box dimensions
    const legendX = 20;
    const legendY = 60;
    const legendWidth = 200;
    const legendHeight = 200;

    const legendBox = svg.append("rect")
        .attr("class", "legend-box")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", "#fff")
        .attr("fill-opacity", "0")
        .attr("stroke", "#ccc")
        .style("opacity", 0);

    let initialPositions = {};
    const topicNodes = []; // Store topic nodes separately for reference

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked)
        .on("end", () => {
            nodes.forEach(d => {
                initialPositions[d.id] = { x: d.x, y: d.y };
                if (d.group in colorScale) {
                    topicNodes.push(d); // Add topic nodes to the list
                }
            });
        });

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    // Slider control for visualization
    const slider = document.getElementById('slider');
    const mapLayerTransitionDuration = 1000;
    const nodeAndLinkTransitionDuration = 1000;

    // Function to update visualization based on slider value
    function updateVisualization() {
        const sliderValue = +slider.value; // Get slider value
        if (sliderValue === 0) {
            // "Netzwerk" view - Hide map and show nodes/links
            mapLayer.transition().duration(mapLayerTransitionDuration).style("opacity", 0);
            nodeGroup.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 1);
            link.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 1);
            legendBox.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 0);
            resetToInitialPositions();  // Reset positions for "Netzwerk" view
        } else if (sliderValue === 25) {
            // "Karte" view - Show map and hide nodes/links
            mapLayer.transition().duration(mapLayerTransitionDuration).style("opacity", 1);
            nodeGroup.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 0);
            link.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 0);
            legendBox.transition().duration(nodeAndLinkTransitionDuration).style("opacity", 1);
            moveToMapCoordinates();  // Move nodes to map positions
        }
    }

    // Initially set visualization based on slider value
    updateVisualization();

    // Update visualization when slider is changed
    slider.addEventListener('input', () => {
        updateVisualization();
    });

    // Modify moveToMapCoordinates to work with slider
    function moveToMapCoordinates() {
        const sliderValue = +slider.value;
        if (sliderValue === 25) {
            simulation.stop();

            // Move nodes into the map, legend, or dissolve them
            nodeGroup.transition().duration(5000)
                .attr("transform", (d, i) => {
                    if (d.Koordinaten) {
                        // Move to the position based on the coordinates
                        const [lat, lon] = d.Koordinaten.split(", ").map(Number);
                        const [x, y] = projection([lon, lat]);
                        return `translate(${x},${y})`;
                    } else if (d.group === "Thema") {
                        // Align topic nodes underneath each other in the legend
                        const x = legendX + 20; // Horizontal offset within the legend box
                        const y = legendY + 30 + i * 35; // Spacing for vertical alignment
                        // Always show text for "Thema" group nodes
                        nodeGroup.transition().delay(5000).selectAll("text").filter(function(d) { return d.group === "Thema"; }).style("opacity", 1);
                        return `translate(${x},${y})`;
                    }
                    // Dissolve nodes that are neither topics nor have coordinates
                    return "translate(-1000, -1000)"; // Move far offscreen
                });

            link.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);

            mapLayer.transition().delay(4000).duration(1000).ease(d3.easeLinear).style("opacity", 1);
            legendBox.transition().delay(4000).duration(1000).ease(d3.easeLinear).style("opacity", 1);
        }
    }

    // Modify resetToInitialPositions to work with slider
    function resetToInitialPositions() {
        const sliderValue = +slider.value;
        if (sliderValue === 0) {
            // Reset nodes to their initial positions with smooth transition
            nodeGroup.transition().duration(6000).selectAll("text").filter(function(d) { return d.group === "Thema"; }).style("opacity", 0)
            nodeGroup.transition().duration(5000)
                .attr("transform", d => {
                    mapLayer.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
                    // Fallback to current position if initial position is not available
                    const pos = initialPositions[d.id] || { x: d.x, y: d.y };
                    return `translate(${pos.x},${pos.y})`;
                })
                .on("end", function() {
                    // After nodes finish moving, wait for a delay before moving the links
                    setTimeout(function() {
                        // Now, move the links with a smooth transition
                        link.transition().duration(10)
                            .attr("x1", d => {
                                const sourcePos = initialPositions[d.source.id] || { x: d.source.x, y: d.source.y };
                                return sourcePos.x;
                            })
                            .attr("y1", d => {
                                const sourcePos = initialPositions[d.source.id] || { x: d.source.x, y: d.source.y };
                                return sourcePos.y;
                            })
                            .attr("x2", d => {
                                const targetPos = initialPositions[d.target.id] || { x: d.target.x, y: d.target.y };
                                return targetPos.x;
                            })
                            .attr("y2", d => {
                                const targetPos = initialPositions[d.target.id] || { x: d.target.x, y: d.target.y };
                                return targetPos.y;
                            })
                            .style("display", "block");
                    }, 0);  // 1 second delay before moving the links
                    legendBox.transition().duration(1000).ease(d3.easeLinear).style("opacity", 0);
                });
        }
    }

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
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

}).catch(error => console.error(error));
