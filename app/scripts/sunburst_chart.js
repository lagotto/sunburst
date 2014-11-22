var SunburstChart = function() {
    _.bindAll(this);
};

SunburstChart.prototype.create = function(el, properties, data) {
    this.svg = d3.select(el).append('svg')
        .attr('class', 'd3')
        .attr('width', properties.width)
        .attr('height', properties.height);

    this.properties = properties;
    this.width = properties.width;
    this.radius = properties.radius;
    this.height = properties.height;
    this.margin = {top: 20, right: 20, bottom: 40, left: 40};
    this.data = data;

    this._draw();

    return this;
}

SunburstChart.prototype._draw = function () {
    var b = this.properties.breadcrumb;
    var x = d3.scale.linear()
        .range([0, 2 * Math.PI]);

    var y = d3.scale.sqrt()
        .range([0, this.radius]);

    var color = d3.scale.category20c();

    var svg = this.svg.append("g")
        .attr("id", "container")
        .attr("transform", "translate(" + this.width / 2 + "," + (this.height / 2 + 10) + ")");

    var partition = d3.layout.partition()
        .sort(null)
        .value(function(d) { return d.views; });

    var arc = d3.svg.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

    // Basic setup of page elements.
    initializeBreadcrumbTrail.bind(this)();
    drawLegend();
    d3.select("#togglelegend").on("click", toggleLegend);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Keep track of the node that is currently being displayed as the root.
    var node = tree;

    var path = svg.datum(tree)
        .selectAll("path")
        .data(partition.nodes)
        .enter()
        .append("path")
            .attr("d", arc)
            .style("fill", function(d) {
                if(!d.depth) {
                    return 'transparent'
                } else {
                    return color((d.children ? d : d.parent).name);
                }
            })
            .on("click", click)
            .on("mouseover", mouseover)
            .each(stash);

    var centerText = svg.append("text")
        .attr('id', 'centerText')
        .attr('text-anchor', 'middle')
        .text('Explore with your mouse');

    d3.selectAll("input").on("change", function change() {
        var value = this.value === "count"
            ? function() { return 1; }
            : function(d) { return d.views; };

        path
            .data(partition.value(value).nodes)
            .transition()
            .attrTween("d", arcTweenData);
    });

    function click(d) {
        node = d;
        path.transition()
          .duration(1000)
          .attrTween("d", arcTweenZoom(d));
    }

    d3.select(self.frameElement).style("height", this.height + "px");

    // Setup for switching data: stash the old values for transition.
    function stash(d) {
        d.x0 = d.x;
        d.dx0 = d.dx;
    }

    // When switching data: interpolate the arcs in data space.
    function arcTweenData(a, i) {
        var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
        function tween(t) {
            var b = oi(t);
            a.x0 = b.x;
            a.dx0 = b.dx;
            return arc(b);
        }
        if (i == 0) {
            // If we are on the first arc, adjust the x domain to match the root node
            // at the current zoom level. (We only need to do this once.)
            var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
            return function(t) {
              x.domain(xd(t));
              return tween(t);
            };
        } else {
            return tween;
        }
    }

    // When zooming: interpolate the scales.
    function arcTweenZoom(d) {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 90 : 0, this.radius]);
        return function(d, i) {
            return i
                ? function(t) { return arc(d); }
                : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
        };
    }

    // Fade all but the current sequence, and show it in the breadcrumb trail.
    function mouseover(d) {
        centerText.text('');
        centerText.append('tspan').text(d.value + ' views')
        centerText.append('tspan').attr('x', 0).attr('dy', '15')
            .text(d.name);

        var sequenceArray = getAncestors(d);
        updateBreadcrumbs(sequenceArray, d.value);

        // Fade all the segments.
        d3.selectAll("path")
          .style("opacity", 0.3);

        // Then highlight only those that are an ancestor of the current segment.
        svg.selectAll("path")
            .filter(function(node) { return (sequenceArray.indexOf(node) >= 0); })
            .style("opacity", 1);
    }

    // Restore everything to full opacity when moving off the visualization.
    function mouseleave(d) {

        // Hide the breadcrumb trail
        d3.select("#trail")
          .style("visibility", "hidden");

        // Deactivate all segments during transition.
        d3.selectAll("path").on("mouseover", null);

        // Transition each segment to full opacity and then reactivate it.
        d3.selectAll("path")
            .transition()
            .duration(200)
            .style("opacity", 1)
            .each("end", function() {
                d3.select(this).on("mouseover", mouseover);
            });

        centerText.text('Explore with your mouse');

    }

    // Given a node in a partition layout, return an array of all of its ancestor
    // nodes, highest first, but excluding the root.
    function getAncestors(node) {
        var path = [];
        var current = node;
        while (current.parent) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }

    function initializeBreadcrumbTrail() {
        // Add the svg area.
        var trail = d3.select("#sequence").append("svg:svg")
            .attr("width", this.width)
            .attr("height", 50)
            .attr("id", "trail");
        // Add the label at the end, for the percentage.
        trail.append("svg:text")
            .attr("id", "endlabel")
            .style("fill", "#000");
    }

    // Generate a string that describes the points of a breadcrumb polygon.
    function breadcrumbPoints(d, i) {
        var points = [];
        points.push("0,0");
        points.push(b.width + ",0");
        points.push(b.width + b.tip + "," + (b.height / 2));
        points.push(b.width + "," + b.height);
        points.push("0," + b.height);
        if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
            points.push(b.tip + "," + (b.height / 2));
        }
        return points.join(" ");
    }

    // Update the breadcrumb trail to show the current sequence and percentage.
    function updateBreadcrumbs(nodeArray, value) {

        // Data join; key function combines name and depth (= position in sequence).
        var g = d3.select("#trail")
            .selectAll("g")
            .data(nodeArray, function(d) { return d.name + d.depth; });

        // Add breadcrumb and label for entering nodes.
        var entering = g.enter().append("svg:g");

        entering.append("svg:polygon")
            .attr("points", breadcrumbPoints)
            .style("fill", function(d) { return color((d.children ? d : d.parent).name); });

        entering.append("svg:text")
            .attr("x", (b.width + b.tip) / 2)
            .attr("y", b.height / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.name; });

        // Set position for entering and updating nodes.
        g.attr("transform", function(d, i) {
            return "translate(" + i * (b.width + b.spacing) + ", 0)";
        });

        // Remove exiting nodes.
        g.exit().remove();

        // Now move and update the percentage at the end.
        d3.select("#trail").select("#endlabel")
            .attr("x", (nodeArray.length + 0.5) * (b.width + b.spacing) - 50)
            .attr("y", b.height / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(value + ' views');

        // Make the breadcrumb trail visible, if it's hidden.
        d3.select("#trail")
            .style("visibility", "");

    }

    function drawLegend() {

        // Dimensions of legend item: width, height, spacing, radius of rounded rect.
        var li = {
            w: 75, h: 30, s: 3, r: 3
        };

        var legend = d3.select("#legend").append("svg:svg")
            .attr("width", li.w)
            .attr("height", 1 * (li.h + li.s));

        var g = legend.selectAll("g")
            .data([])
            .enter().append("svg:g")
            .attr("transform", function(d, i) {
                return "translate(0," + i * (li.h + li.s) + ")";
            });

        g.append("svg:rect")
            .attr("rx", li.r)
            .attr("ry", li.r)
            .attr("width", li.w)
            .attr("height", li.h)
            .style("fill", function(d) { return d.value; });

        g.append("svg:text")
            .attr("x", li.w / 2)
            .attr("y", li.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.key; });
    }

    function toggleLegend() {
        var legend = d3.select("#legend");
        if (legend.style("visibility") == "hidden") {
            legend.style("visibility", "");
        } else {
            legend.style("visibility", "hidden");
        }
    }

}


