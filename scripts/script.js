import * as func from "./functions.js";

Promise.all([
    d3.json("../data/nodes.json"), // Nodes data
    d3.json("../data/links.json"), // Links data
    d3.json("../data/switzerland.geojson"), // Swiss map GeoJSON
]).then(([nodes, links, switzerland]) => {

    const svg = d3.select("svg").classed("svg-content-responsive", true);
    var width = +svg.attr("width");
    var height = +svg.attr("height");

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
    console.log(topicColorMap)

    const projection = d3.geoMercator()
        .center([8.2275, 46.8182])
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

    mapLayer.style("opacity", 0);

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
        .attr("fill", d => {
            if (d.Thema && topicColorMap[d.Thema]) {
                return topicColorMap[d.Thema];
            }
            return d.color;
        });

    nodeGroup.on("mouseover", function (event, d) {
            d3.select(this).select("text").style("opacity", 1);
        })
        .on("mouseout", function (event, d) {
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
            // Save initial positions after simulation stabilizes
            nodes.forEach(d => {
                initialPositions[d.id] = { x: d.x, y: d.y };
            });
        });
    

    nodeGroup.attr("transform", d => {
        const pos = initialPositions[d.id] || {x: d.x, y: d.y};
        return `translate(${pos.x},${pos.y})`;
    });

    let text = nodeGroup.append("text")
        .attr("dx", d => d.group === "Thema" ? 20 : 12)
        .attr("dy", ".35em")
        .text(d => d.id)
        .style("opacity", 0);

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

    // Track if we are in map view (initially false)
    let isMapView = false;

    // Create SVG container for bar chart if needed
    const svg2 = d3.select("#barChart")
        .attr("width", width)
        .attr("height", height);

    // Add event listener for slider changes
    d3.select("#slider").on("input", function () {
        const value = +this.value;
        if (value === 0) {
            func.resetToInitialPositions(nodeGroup, isMapView, svg2, initialPositions, legendBox,
                mapLayer, link, simulation);
        } else if (value === 25) {
            func.moveToMapCoordinates(nodeGroup, link, isMapView, svg2, mapLayer, legendBox,
                projection, legendX, legendY, simulation);
        } else if (value === 50) {
            func.showDiagramm(mapLayer, link, nodeGroup, legendBox, svg2, nodes, colorScale);
        }
    });

}).catch(error => console.error(error));
