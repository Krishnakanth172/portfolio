const DATA_PATH =
    "./data/worldbank_aging.csv";


const state = {
    year: 2020,
    selectedCountry: null
};


const dimensions = {
    width: 960,
    height: 620,

    margin: {
        top: 50,
        right: 55,
        bottom: 90,
        left: 100
    }
};


let dataset = [];

let xScale;
let yScale;
let radiusScale;

let svg;
let gridLayer;
let trajectoryLayer;
let bubblesLayer;

let xAxisGroup;
let yAxisGroup;

let tooltip;


// ============================================================
// LOAD DATA
// ============================================================

d3.csv(
    DATA_PATH,

    d => ({
        country: d.country,
        country_code: d.country_code,
        year: +d.year,
        age_65_plus_pct:
            +d.age_65_plus_pct,
        population:
            +d.population,
        gdp_per_capita:
            +d.gdp_per_capita
    })
)
.then(data => {

    dataset = data.filter(
        d =>
            Number.isFinite(
                d.gdp_per_capita
            ) &&

            Number.isFinite(
                d.age_65_plus_pct
            ) &&

            Number.isFinite(
                d.population
            ) &&

            d.gdp_per_capita > 0 &&

            d.population > 0
    );


    setupScales();

    setupControls();

    createChart();

    render();

})
.catch(error => {

    console.error(
        "Error loading Project 3 data:",
        error
    );


    d3
        .select("#chart-container")
        .append("p")
        .attr(
            "class",
            "error-message"
        )
        .text(
            "The visualization data could not be loaded."
        );

});


// ============================================================
// SCALES
// ============================================================

function setupScales() {

    xScale = d3
        .scaleLog()
        .domain(
            d3.extent(
                dataset,
                d => d.gdp_per_capita
            )
        )
        .nice()
        .range([
            dimensions.margin.left,

            dimensions.width -
                dimensions.margin.right
        ]);


    yScale = d3
        .scaleLinear()
        .domain([
            0,

            d3.max(
                dataset,
                d => d.age_65_plus_pct
            ) * 1.05
        ])
        .nice()
        .range([
            dimensions.height -
                dimensions.margin.bottom,

            dimensions.margin.top
        ]);


    radiusScale = d3
        .scaleSqrt()
        .domain([
            0,

            d3.max(
                dataset,
                d => d.population
            )
        ])
        .range([
            3,
            34
        ]);

}


// ============================================================
// CONTROLS
// ============================================================

function setupControls() {

    const years = Array.from(
        new Set(
            dataset.map(
                d => d.year
            )
        )
    )
    .sort(
        (a, b) => a - b
    );


    const minYear =
        d3.min(years);

    const maxYear =
        d3.max(years);


    state.year =
        maxYear;


    const yearSlider =
        d3.select(
            "#year-slider"
        );


    yearSlider
        .attr(
            "min",
            minYear
        )
        .attr(
            "max",
            maxYear
        )
        .property(
            "value",
            maxYear
        );


    yearSlider.on(
        "input",

        function () {

            state.year =
                +this.value;

            render();

        }
    );


    const countryMap =
        d3.rollup(
            dataset,

            values =>
                values[0].country,

            d =>
                d.country_code
        );


    const countries =
        Array.from(
            countryMap,

            ([code, country]) => ({
                code,
                country
            })
        )
        .sort(
            (a, b) =>
                d3.ascending(
                    a.country,
                    b.country
                )
        );


    const countrySelect =
        d3.select(
            "#country-select"
        );


    countrySelect
        .selectAll(
            "option.country-option"
        )
        .data(countries)
        .join("option")
        .attr(
            "class",
            "country-option"
        )
        .attr(
            "value",
            d => d.code
        )
        .text(
            d => d.country
        );


    countrySelect.on(
        "change",

        function () {

            state.selectedCountry =
                this.value || null;

            render();

        }
    );


    d3
        .select(
            "#reset-button"
        )
        .on(
            "click",

            () => {

                state.year =
                    maxYear;

                state.selectedCountry =
                    null;


                yearSlider.property(
                    "value",
                    maxYear
                );


                countrySelect.property(
                    "value",
                    ""
                );


                render();

            }
        );

}


// ============================================================
// CREATE STATIC CHART ELEMENTS
// ============================================================

function createChart() {

    tooltip =
        d3.select(
            "#tooltip"
        );


    svg = d3
        .select(
            "#chart-container"
        )
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${dimensions.width} ${dimensions.height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Interactive bubble chart showing GDP per capita, population aging, and total population by country"
        );


    gridLayer =
        svg
            .append("g")
            .attr(
                "class",
                "grid-layer"
            );


    trajectoryLayer =
        svg
            .append("g")
            .attr(
                "class",
                "trajectory-layer"
            );


    bubblesLayer =
        svg
            .append("g")
            .attr(
                "class",
                "bubbles-layer"
            );


    xAxisGroup =
        svg
            .append("g")
            .attr(
                "class",
                "axis"
            )
            .attr(
                "transform",
                `translate(
                    0,
                    ${
                        dimensions.height -
                        dimensions.margin.bottom
                    }
                )`
            );


    yAxisGroup =
        svg
            .append("g")
            .attr(
                "class",
                "axis"
            )
            .attr(
                "transform",
                `translate(
                    ${dimensions.margin.left},
                    0
                )`
            );


    xAxisGroup.call(
        d3
            .axisBottom(
                xScale
            )
            .ticks(
                8,
                "$,.0s"
            )
    );


    yAxisGroup.call(
        d3
            .axisLeft(
                yScale
            )
            .tickFormat(
                d => `${d}%`
            )
    );


    createGrid();


    svg
        .append("text")
        .attr(
            "class",
            "axis-label"
        )
        .attr(
            "x",
            dimensions.width / 2
        )
        .attr(
            "y",
            dimensions.height - 24
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(
            "GDP per capita, PPP (constant 2017 international $)"
        );


    svg
        .append("text")
        .attr(
            "class",
            "axis-label"
        )
        .attr(
            "transform",
            "rotate(-90)"
        )
        .attr(
            "x",
            -dimensions.height / 2
        )
        .attr(
            "y",
            30
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(
            "Population age 65+ (%)"
        );

}


// ============================================================
// GRID
// ============================================================

function createGrid() {

    gridLayer
        .selectAll("*")
        .remove();


    gridLayer
        .append("g")
        .attr(
            "class",
            "grid-lines"
        )
        .attr(
            "transform",
            `translate(
                ${dimensions.margin.left},
                0
            )`
        )
        .call(
            d3
                .axisLeft(
                    yScale
                )
                .tickSize(
                    -(
                        dimensions.width -
                        dimensions.margin.left -
                        dimensions.margin.right
                    )
                )
                .tickFormat("")
        );

}


// ============================================================
// MAIN RENDER
// ============================================================

function render() {

    const yearData =
        dataset
            .filter(
                d =>
                    d.year ===
                    state.year
            )
            .slice()
            .sort(
                (a, b) =>
                    b.population -
                    a.population
            );


    updateYearLabel();

    updateSummaryStats(
        yearData
    );

    renderTrajectory();

    renderBubbles(
        yearData
    );

    updateSelectionNote();

}


// ============================================================
// BUBBLES
// ============================================================

function renderBubbles(
    yearData
) {

    const circles =
        bubblesLayer
            .selectAll(
                "circle"
            )
            .data(
                yearData,
                d => d.country_code
            )
            .join(

                enter =>
                    enter
                        .append(
                            "circle"
                        )
                        .attr(
                            "class",
                            "bubble"
                        )
                        .attr(
                            "cx",
                            d =>
                                xScale(
                                    d.gdp_per_capita
                                )
                        )
                        .attr(
                            "cy",
                            d =>
                                yScale(
                                    d.age_65_plus_pct
                                )
                        )
                        .attr(
                            "r",
                            0
                        ),

                update =>
                    update,

                exit =>
                    exit
                        .transition()
                        .duration(200)
                        .attr(
                            "r",
                            0
                        )
                        .remove()

            );


    circles
        .classed(
            "is-selected",

            d =>
                state.selectedCountry ===
                d.country_code
        )
        .classed(
            "is-dimmed",

            d =>
                state.selectedCountry !== null &&

                state.selectedCountry !==
                    d.country_code
        )
        .on(
            "mouseenter",

            (event, d) => {

                showTooltip(
                    event,
                    d
                );

            }
        )
        .on(
            "mousemove",

            event => {

                moveTooltip(
                    event
                );

            }
        )
        .on(
            "mouseleave",

            hideTooltip
        )
        .on(
            "click",

            (event, d) => {

                event.stopPropagation();


                state.selectedCountry =
                    d.country_code;


                d3
                    .select(
                        "#country-select"
                    )
                    .property(
                        "value",
                        d.country_code
                    );


                render();

            }
        );


    circles
        .transition()
        .duration(300)
        .attr(
            "cx",
            d =>
                xScale(
                    d.gdp_per_capita
                )
        )
        .attr(
            "cy",
            d =>
                yScale(
                    d.age_65_plus_pct
                )
        )
        .attr(
            "r",
            d =>
                radiusScale(
                    d.population
                )
        );

}


// ============================================================
// SELECTED COUNTRY TRAJECTORY
// ============================================================

function renderTrajectory() {

    trajectoryLayer
        .selectAll("*")
        .remove();


    if (
        !state.selectedCountry
    ) {

        return;

    }


    const countryData =
        dataset
            .filter(
                d =>
                    d.country_code ===
                    state.selectedCountry
            )
            .sort(
                (a, b) =>
                    a.year - b.year
            );


    if (
        countryData.length === 0
    ) {

        return;

    }


    const line =
        d3
            .line()
            .defined(
                d =>
                    Number.isFinite(
                        d.gdp_per_capita
                    ) &&

                    Number.isFinite(
                        d.age_65_plus_pct
                    )
            )
            .x(
                d =>
                    xScale(
                        d.gdp_per_capita
                    )
            )
            .y(
                d =>
                    yScale(
                        d.age_65_plus_pct
                    )
            );


    trajectoryLayer
        .append("path")
        .datum(
            countryData
        )
        .attr(
            "class",
            "trajectory-line"
        )
        .attr(
            "d",
            line
        );


    trajectoryLayer
        .selectAll(
            "circle"
        )
        .data(
            countryData
        )
        .join(
            "circle"
        )
        .attr(
            "class",
            "trajectory-point"
        )
        .attr(
            "cx",
            d =>
                xScale(
                    d.gdp_per_capita
                )
        )
        .attr(
            "cy",
            d =>
                yScale(
                    d.age_65_plus_pct
                )
        )
        .attr(
            "r",
            3
        );


    const latest =
        countryData[
            countryData.length - 1
        ];


    trajectoryLayer
        .append("text")
        .attr(
            "class",
            "trajectory-label"
        )
        .attr(
            "x",
            xScale(
                latest.gdp_per_capita
            ) + 9
        )
        .attr(
            "y",
            yScale(
                latest.age_65_plus_pct
            ) - 9
        )
        .text(
            latest.country
        );

}


// ============================================================
// YEAR LABEL
// ============================================================

function updateYearLabel() {

    d3
        .select(
            "#year-value"
        )
        .text(
            state.year
        );

}


// ============================================================
// SUMMARY CARDS
// ============================================================

function updateSummaryStats(
    yearData
) {

    const averageAging =
        d3.mean(
            yearData,
            d =>
                d.age_65_plus_pct
        );


    const medianGDP =
        d3.median(
            yearData,
            d =>
                d.gdp_per_capita
        );


    d3
        .select(
            "#stat-countries"
        )
        .text(
            yearData.length
        );


    d3
        .select(
            "#stat-aging"
        )
        .text(
            averageAging
                ? `${averageAging.toFixed(1)}%`
                : "—"
        );


    d3
        .select(
            "#stat-gdp"
        )
        .text(
            medianGDP
                ? `$${d3.format(",.0f")(medianGDP)}`
                : "—"
        );

}


// ============================================================
// SELECTION NOTE
// ============================================================

function updateSelectionNote() {

    const note =
        d3.select(
            "#selection-note"
        );


    if (
        !state.selectedCountry
    ) {

        note.text(
            "Hover over a bubble for details. Click a bubble or choose a country above to reveal its trajectory."
        );

        return;

    }


    const countryData =
        dataset
            .filter(
                d =>
                    d.country_code ===
                    state.selectedCountry
            )
            .sort(
                (a, b) =>
                    a.year - b.year
            );


    if (
        countryData.length === 0
    ) {

        return;

    }


    const first =
        countryData[0];

    const last =
        countryData[
            countryData.length - 1
        ];


    note.text(
        `Highlighted trajectory: ${first.country}, ${first.year}–${last.year}.`
    );

}


// ============================================================
// TOOLTIP
// ============================================================

function showTooltip(
    event,
    d
) {

    tooltip
        .classed(
            "is-visible",
            true
        )
        .html(
            `
                <strong>${d.country}</strong>

                <span>
                    Year:
                    ${d.year}
                </span>

                <span>
                    GDP per capita:
                    $${d3.format(",.0f")(d.gdp_per_capita)}
                </span>

                <span>
                    Population age 65+:
                    ${d.age_65_plus_pct.toFixed(1)}%
                </span>

                <span>
                    Population:
                    ${d3.format(",")(d.population)}
                </span>
            `
        );


    moveTooltip(
        event
    );

}


function moveTooltip(
    event
) {

    tooltip
        .style(
            "left",
            `${event.clientX + 16}px`
        )
        .style(
            "top",
            `${event.clientY + 16}px`
        );

}


function hideTooltip() {

    tooltip
        .classed(
            "is-visible",
            false
        );

}