import * as func from "./functions.js";
Promise.all([

    d3.json("../BilderCHInfra/data/nodes.json"),
    d3.json("../BilderCHInfra/data/links.json"),
    d3.json("../BilderCHInfra/data/switzerland.geojson"),
    d3.json("../BilderCHInfra/data/geom.geojson"),
]).then(([nodes, links, switzerland, geom]) => {
    // Merge geom geometry attribute to nodes based on gehoert_zu attribute
    nodes.forEach(node => {
        const matchingGeom = geom.features.find(feature => feature.properties.gehoert_zu === node.id);
        node.geometry = matchingGeom ? matchingGeom.geometry : null;
    });
    const svg = d3.select("svg");
    const width = window.innerWidth * 0.7;
    const height = window.innerHeight * 0.7;
    svg.attr("width", width).attr("height", height);
    let initialPositions = {};
    // Extract unique groups (topics)
    const groups = Array.from(new Set(nodes.map(d => d.group)));
    // Define a color scale
    const colorScale = d3.scaleOrdinal()
        .domain(groups)
        .range(d3.schemeTableau10); // or any other categorical color scheme

    // Map to store base (thema) colors
    const topicColorMap = {};
    const themaNodes = groups.map(group => {
        const baseColor = d3.color(colorScale(group));
        topicColorMap[group] = baseColor;

        return {
            id: group,
            group: "thema",
            color: baseColor.formatHex()
        };
    });

    // Assign lighter colors to normal nodes based on their group
    nodes.forEach(d => {
        if (d.group !== "thema") {
            const base = topicColorMap[d.group];
            if (base) {
                const lighter = base.brighter(1); // you can adjust brightness level
                //console.log(base, lighter)
                d.color = lighter.formatHex();
            }
        }
    });

    // Add the thema nodes to the main node list
    nodes = nodes.concat(themaNodes);

    function computeCentering(features, scaleFactor = 1) {
        const projection = d3.geoMercator().scale(scaleFactor);
        const geoPathGenerator = d3.geoPath().projection(projection);
        const bounds = d3.geoBounds({
            type: "FeatureCollection",
            features
        });
        const [
            [x0, y0],
            [x1, y1]
        ] = bounds;

        const centerX = (x0 + x1) / 2;
        const centerY = (y0 + y1) / 2;

        projection.center([centerX, centerY])
            .translate([width / 2, height / 2]);

        return {
            projection,
            geoPathGenerator
        };
    }

    const minYear = d3.min(nodes, d => {
        // Ensure that the "von" field is a valid number
        const year = parseInt(d.von);
        return isNaN(year) ? Infinity : year;
    });

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
        d3.selectAll("circle").each(function(d) {
            // If d.bis is "Aktiv", set it to the current year
            if (d.bis === "Aktiv") {
                d.bis = currentYear;
            }

            let nodeChanged = false;
            // Apply styles based on the updated year values
            if (d.von >= minVal && d.bis <= maxVal) {
                d3.select(this).style("opacity", 1).style("filter", "none");
            } else if (minVal <= d.von && maxVal <= d.bis) {
                d3.select(this).style("opacity", 0.2).style("filter", "none");
                nodeChanged = true;
            } else if (minVal >= d.von && maxVal >= d.bis) {
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
        d3.selectAll("line").each(function(link) {
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
    const {
        projection,
        geoPathGenerator
    } = computeCentering(switzerland.features, 8000);
    const mapLayer = svg.append("g").attr("class", "map");

    mapLayer.selectAll("path")
        .data(switzerland.features)
        .enter()
        .append("path")
        .attr("d", geoPathGenerator)
        .attr("fill", "#e0e0e0")
        .attr("stroke", "#999");

    mapLayer.style("opacity", 0);

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
        .attr("r", d => d.group === "thema" ? 15 : 10)
        .attr("fill", d => d.thema && topicColorMap[d.thema] ? topicColorMap[d.thema] : d.color);

    nodeGroup.on("mouseover", function() {
            d3.select(this).select("text").style("opacity", 1);
        })
        .on("mouseout", function() {
            d3.select(this).select("text").style("opacity", 0);
        });

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", function() {
            func.ticked(link, nodeGroup);
        })
        .on("end", () => {
            nodes.forEach(d => {
                initialPositions[d.id] = {
                    x: d.x,
                    y: d.y
                };
            });
        });

    nodeGroup.attr("transform", d => {
        const pos = initialPositions[d.id] || {
            x: d.x,
            y: d.y
        };
        return `translate(${pos.x},${pos.y})`;
    });

    nodeGroup.append("text")
        .attr("dx", d => d.group === "thema" ? 20 : 12)
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


        d3.select("#slider").on("input", function() {
            const value = +this.value;
            const label = document.getElementById("mainModeLabel");
            const descriptionBox = document.getElementById("descriptionBox");
        
            if (value === 0) {
                func.resetToInitialPositions(nodeGroup, initialPositions, legendBox, mapLayer, link, simulation, svg);
                label.textContent = "Netzwerk";
                descriptionBox.textContent = "Visualisierung des Netzwerks von Infrastrukturen basierend auf Verbindungen.";
            } else if (value === 50) {
                func.moveToMapCoordinates(nodeGroup, link, mapLayer, legendBox, projection, legendX, legendY, simulation, svg, topicColorMap);
                label.textContent = "Karte";
                descriptionBox.textContent = "Geografische Darstellung der Infrastrukturen auf der Karte der Schweiz.";
            } else if (value === 100) {
                func.transformToCirclePack(nodes, svg, nodeGroup, mapLayer, legendBox, link, projection);
                label.textContent = "Bubble";
                descriptionBox.textContent = "Clustering der Infrastrukturen nach Themen in einer Bubble-Darstellung.";
            } else {
                label.textContent = "Modus in Transition";
                descriptionBox.textContent = "Eine Zwischenansicht – bitte schieben Sie den Regler auf einen festen Punkt.";
            }
        });
        


}).catch(error => console.error(error));