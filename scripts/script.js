import * as func from "./functions.js";

Promise.all([
    d3.json("../data/links.json"),
    d3.json("../data/switzerland.geojson"),
    d3.json("../data/sichtbarkeit.geojson"),
    fetch("data/nodes.json")  // statt "/data/input.json"
  .then(response => response.json())
  .then(data => console.log(data))


]).then(([nodes, links, switzerland, sichtbarkeit]) => {
    const svg = d3.select("svg");
    const width = window.innerWidth * 0.7;
    const height = window.innerHeight * 0.7;
    svg.attr("width", width).attr("height", height);

    const colorScale = {
        Kraftwerke: "#ffcc66",
        Nationalstrassen: "#66cc66",
        Gewässer: "#66b2ff",
        Reaktoren: "#ff9999",
        Raffinerien: "#9999ff"
    };

    let initialPositions = {};
    const topicNodes = [];
    const topicColorMap = {};
    nodes.forEach(d => {
        if (d.group === "Thema" && d.color) {
            topicColorMap[d.id] = d.color;
        }
    });

    function computeCentering(features, scaleFactor = 1) {
        const projection = d3.geoMercator().scale(scaleFactor);
        const geoPathGenerator = d3.geoPath().projection(projection);

        const bounds = d3.geoBounds({ type: "FeatureCollection", features });
        const [[x0, y0], [x1, y1]] = bounds;

        const centerX = (x0 + x1) / 2;
        const centerY = (y0 + y1) / 2;

        projection.center([centerX, centerY])
                  .translate([width / 2, height / 2]);

        return { projection, geoPathGenerator };
    }

    const currentYear = new Date().getFullYear();
    const minYear = d3.min(nodes, d => {
        // Ensure that the "Von" field is a valid number
        const year = parseInt(d.Von);
        return isNaN(year) ? Infinity : year;
      });
      
      

    console.log(minYear)
    
$(function() {
    $("#slider-range").slider({
        range: true,
        min: minYear,
        max: 2025,
        values: [minYear, 2025],
        slide: function(event, ui) {
            // Update the displayed min and max values
            $("#minValue").text(ui.values[0]);
            $("#maxValue").text(ui.values[1]);

            // Update node styles based on the new slider range
            updateNodeStyles(ui.values[0], ui.values[1]);
        }
    });

    // Initialize the min and max values when the page loads
    $("#minValue").text($("#slider-range").slider("values", 0));
    $("#maxValue").text($("#slider-range").slider("values", 1));
});
    const timeslider = document.getElementById("timeTravelCheckbox");
    const sliderContainer = document.getElementById('timecontainer');

    function updateNodeStyles(minVal, maxVal) {
        const currentYear = new Date().getFullYear(); // Get the current year
    
        // Track which nodes are affected by visibility change
        const affectedNodes = new Set();
    
        d3.selectAll("circle").each(function (d) {
            // If d.Bis is "Aktiv", set it to the current year
            if (d.Bis === "Aktiv") {
                d.Bis = currentYear;
            }
    
            let nodeChanged = false;
            console.log(d)
            // Apply styles based on the updated year values
            if (d.Von >= minVal && d.Bis <= maxVal) {
                d3.select(this).style("opacity", 1).style("filter", "none");
            } else if (minVal <= d.Von && maxVal <= d.Bis) {
                d3.select(this).style("opacity", 0.2).style("filter", "none");
                nodeChanged = true;
            } else if (minVal >= d.Von && maxVal >= d.Bis) {
                d3.select(this).style("opacity", 1).style("filter", "grayscale(100%)");
                nodeChanged = true;
            } else {
                d3.select(this).style("opacity", 1).style("filter", "none");
            }
    
            if (nodeChanged) {
                affectedNodes.add(d.id);
            }
        });
    
        // Update the transparency of links based on affected nodes
        d3.selectAll("line").each(function (link) {
            if (affectedNodes.has(link.source.id) || affectedNodes.has(link.target.id)) {
                d3.select(this).style("opacity", 0.1); // Make affected lines semi-transparent
            } else {
                d3.select(this).style("opacity", 1); // Restore full opacity for unaffected lines
            }
        });
    }
    
    

    timeslider.addEventListener("change", function() {
        if (!timeslider.checked) {
            sliderContainer.style.display = 'none';
            // Show all nodes when checkbox is unchecked
            d3.selectAll("circle").style("opacity", 1).style("filter", "none");
        } else {
            sliderContainer.style.display = 'block';
            // Get current slider values and update node styles
            const minVal = $("#slider-range").slider("values", 0);
            const maxVal = $("#slider-range").slider("values", 1);
            updateNodeStyles(minVal, maxVal);
        }
    });


    // Apply dynamic centering for Switzerland map
    const { projection, geoPathGenerator } = computeCentering(switzerland.features, 8000);
    const mapLayer = svg.append("g").attr("class", "map");

    mapLayer.selectAll("path")
        .data(switzerland.features)
        .enter()
        .append("path")
        .attr("d", geoPathGenerator)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#999");

    mapLayer.style("opacity", 0);

    // Apply dynamic centering for Sichtbarkeit map
    const { projection: projection2, geoPathGenerator: geoPathGenerator2 } = computeCentering(sichtbarkeit.features, 8000);
    const sichtLayer = svg.append("g").attr("class", "map");

    sichtLayer.selectAll("path")
        .data(sichtbarkeit.features)
        .enter()
        .append("path")
        .attr("d", geoPathGenerator2)
        .attr("fill", "none")
        .attr("stroke", "#999");

    sichtLayer.style("opacity", 0);

    // Force simulation setup
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
            .on("start", func.dragstarted)
            .on("drag", func.dragged)
            .on("end", func.dragended));

    nodeGroup.append("circle")
        .attr("r", d => d.group === "Thema" ? 15 : 10)
        .attr("fill", d => d.Thema && topicColorMap[d.Thema] ? topicColorMap[d.Thema] : d.color);

    nodeGroup.on("mouseover", function () {
            d3.select(this).select("text").style("opacity", 1);
        })
        .on("mouseout", function () {
            d3.select(this).select("text").style("opacity", 0);
        });

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", function () {
            func.ticked(link, nodeGroup);
        })
        .on("end", () => {
            nodes.forEach(d => {
                initialPositions[d.id] = { x: d.x, y: d.y };
            });
        });

    nodeGroup.attr("transform", d => {
        const pos = initialPositions[d.id] || { x: d.x, y: d.y };
        return `translate(${pos.x},${pos.y})`;
    });

    nodeGroup.append("text")
        .attr("dx", d => d.group === "Thema" ? 20 : 12)
        .attr("dy", ".35em")
        .text(d => d.id)
        .style("opacity", 0);

    const legendX = 20;
    const legendY = 60;
    const legendBox = svg.append("rect")
        .attr("class", "legend-box")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", 200)
        .attr("height", 200)
        .attr("fill-opacity", "0")
        .attr("stroke", "#ccc")
        .style("opacity", 0);

    let isMapView = false;

    const svg2 = d3.select("#barChart")
        .attr("width", width/1.5)
        .attr("height", height/1.5);

    let barchart = false;

    const tableContainer = document.getElementById("jsonTableContainer");

    d3.select("#slider").on("input", function () {
        const value = +this.value;
        if (value === 0) {
            barchart = false;
            tableContainer.style.display = "none";
            func.resetToInitialPositions(nodeGroup, isMapView, svg2, initialPositions, legendBox, mapLayer, link, simulation);
        } else if (value === 25) {
            tableContainer.style.display = "none";
            func.moveToMapCoordinates(nodeGroup, link, isMapView, svg2, mapLayer, legendBox, projection, legendX, legendY, simulation, sichtbarkeit, svg, sichtLayer, barchart, topicColorMap);
        } else if (value === 50) {
            barchart = true;
            tableContainer.style.display = "none";
            func.showDiagramm(mapLayer, link, nodeGroup, legendBox, svg2, nodes, colorScale);
        }  else if (value === 75) {
            barchart = false;
            tableContainer.style.display = "block";
            populateJsonTable(nodes,nodeGroup, svg2);
            setTimeout(() => alignNodesWithTable(nodes, nodeGroup), 100); // Ensure table is ready
        
        } else {
            // Hide the JSON table for other slider values
            tableContainer.style.display = "none";
        }
    });
    
    // Function to populate the JSON table dynamically
    function populateJsonTable(nodes,nodeGroup, svg2) {
        nodeGroup.selectAll("rect").transition().duration(1000).style("opacity", 0); // Fade out rectangles
        nodeGroup.selectAll("circle").transition().duration(1000).style("opacity", 1).attr("r", 15);
        nodeGroup.transition().delay(1000).duration(5000).selectAll("text").style("opacity", 0);
        svg2.transition().duration(1000).style("opacity", 0);
        const table = document.getElementById("jsonTable");
        table.innerHTML = "";  // Clear any existing table content
    
        // Create table header
        const headerRow = table.insertRow();
        const headers = ["Name", "Funktion", "Region", "Von","Bis", "Koordinaten"];
        headers.forEach(headerText => {
            const headerCell = document.createElement("th");
            headerCell.textContent = headerText;
            headerRow.appendChild(headerCell);
        });
    
        // Populate table rows with data from nodes
        nodes.forEach(node => {
            const row = table.insertRow();
            const cellName = row.insertCell();
            cellName.textContent = node.Name || node.id;
    
            const cellFunkt = row.insertCell();
            cellFunkt.textContent = node.Funktion ;

            const cellRegion = row.insertCell();
            cellRegion.textContent = node.Region ;
            
            const cellVon = row.insertCell();
            cellVon.textContent = node.Von ;
            
            const cellBis = row.insertCell();
            cellBis.textContent = node.Bis ;

            const cellCoord = row.insertCell();
            cellCoord.textContent = node.Koordinaten ;
    
        });
    }

    function alignNodesWithTable(nodes, nodeGroup) {
        setTimeout(() => { // Delay to allow table to render
            const table = document.getElementById("jsonTable");
            const rows = table.getElementsByTagName("tr");
            console.log(rows)
            const svg = document.querySelector("svg");
            const svgRect = svg.getBoundingClientRect(); // Get SVG position
    
            nodeGroup.transition().duration(1000)
                .attr("transform", (d, i) => {
                    const row = rows[i + 1]; // Skip header row
                    if (row) {
                        const rowRect = row.getBoundingClientRect();
                        console.log(rowRect)
                        // Convert row Y position to SVG coordinates
                        const yInSvg = rowRect.top - svgRect.top; 
    
                        const xOffset = table.offsetWidth - 430; // Position nodes next to the table
                        return `translate(${xOffset}, ${yInSvg})`;
                    }
                    return d3.select(this).attr("transform"); // Keep position if row not found
                });
        }, 500); // Small delay to ensure table is rendered
    }
    
    
}).catch(error => console.error(error));
