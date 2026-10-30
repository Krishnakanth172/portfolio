const dataPath = "./data/worldbank_aging.csv";


d3.csv(dataPath, d => ({
    country: d.country,
    country_code: d.country_code,
    year: +d.year,
    age_65_plus_pct: +d.age_65_plus_pct,
    population: +d.population,
    gdp_per_capita: +d.gdp_per_capita
}))
.then(data => {

    drawAgingOverTime(data);
    drawWealthVsAging(data);
    drawPopulationBubbleChart(data);
    drawAgingChangeComparison(data);
    drawOldestCountries(data);
    drawGrowthVsAgingChange(data);

})
.catch(error => {

    console.error(
        "Error loading Project 3 data:",
        error
    );

});


// ============================================================
// GRAPH 1
// Average population age 65+ over time
// ============================================================

function drawAgingOverTime(data) {

    const yearlyData = Array.from(
        d3.rollup(
            data,

            values => d3.mean(
                values,
                d => d.age_65_plus_pct
            ),

            d => d.year
        ),

        ([year, value]) => ({
            year,
            value
        })
    )
    .sort(
        (a, b) => a.year - b.year
    );


    const width = 900;
    const height = 500;

    const margin = {
        top: 40,
        right: 40,
        bottom: 70,
        left: 80
    };


    const svg = d3
        .select("#chart-1")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Line chart showing the average share of population age 65 and above from 1990 to 2020"
        );


    const x = d3
        .scaleLinear()
        .domain(
            d3.extent(
                yearlyData,
                d => d.year
            )
        )
        .range([
            margin.left,
            width - margin.right
        ]);


    const y = d3
        .scaleLinear()
        .domain([
            0,
            d3.max(
                yearlyData,
                d => d.value
            ) * 1.1
        ])
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3
                .axisBottom(x)
                .tickFormat(
                    d3.format("d")
                )
                .ticks(10)
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    const line = d3
        .line()
        .x(
            d => x(d.year)
        )
        .y(
            d => y(d.value)
        );


    svg
        .append("path")
        .datum(yearlyData)
        .attr(
            "fill",
            "none"
        )
        .attr(
            "stroke",
            "currentColor"
        )
        .attr(
            "stroke-width",
            3
        )
        .attr(
            "d",
            line
        );


    svg
        .append("text")
        .attr(
            "x",
            width / 2
        )
        .attr(
            "y",
            height - 15
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text("Year");


    svg
        .append("text")
        .attr(
            "transform",
            "rotate(-90)"
        )
        .attr(
            "x",
            -height / 2
        )
        .attr(
            "y",
            22
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(
            "Average population age 65+ (%)"
        );


    const first =
        yearlyData[0];

    const last =
        yearlyData[
            yearlyData.length - 1
        ];


    [first, last]
        .forEach(d => {

            svg
                .append("circle")
                .attr(
                    "cx",
                    x(d.year)
                )
                .attr(
                    "cy",
                    y(d.value)
                )
                .attr(
                    "r",
                    5
                )
                .attr(
                    "fill",
                    "currentColor"
                );

        });


    svg
        .append("text")
        .attr(
            "x",
            x(first.year) + 10
        )
        .attr(
            "y",
            y(first.value) - 10
        )
        .text(
            `${first.year}: ${first.value.toFixed(1)}%`
        );


    svg
        .append("text")
        .attr(
            "x",
            x(last.year) - 10
        )
        .attr(
            "y",
            y(last.value) - 10
        )
        .attr(
            "text-anchor",
            "end"
        )
        .text(
            `${last.year}: ${last.value.toFixed(1)}%`
        );

}


// ============================================================
// GRAPH 2
// GDP per capita versus population age 65+
// ============================================================

function drawWealthVsAging(data) {

    const yearData =
        data.filter(
            d => d.year === 2020
        );


    const width = 900;
    const height = 520;

    const margin = {
        top: 40,
        right: 40,
        bottom: 80,
        left: 90
    };


    const svg = d3
        .select("#chart-2")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Scatterplot of GDP per capita versus population age 65 and above in 2020"
        );


    const x = d3
        .scaleLog()
        .domain(
            d3.extent(
                yearData,
                d => d.gdp_per_capita
            )
        )
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);


    const y = d3
        .scaleLinear()
        .domain([
            0,

            d3.max(
                yearData,
                d => d.age_65_plus_pct
            ) * 1.1
        ])
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3
                .axisBottom(x)
                .ticks(
                    8,
                    "$,.0s"
                )
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    const points = svg
        .append("g")
        .selectAll("circle")
        .data(yearData)
        .join("circle")
        .attr(
            "cx",
            d => x(
                d.gdp_per_capita
            )
        )
        .attr(
            "cy",
            d => y(
                d.age_65_plus_pct
            )
        )
        .attr(
            "r",
            5
        )
        .attr(
            "fill",
            "steelblue"
        )
        .attr(
            "opacity",
            0.65
        );


    points
        .append("title")
        .text(
            d =>
`${d.country}
GDP per capita: $${d.gdp_per_capita.toLocaleString()}
Age 65+: ${d.age_65_plus_pct}%`
        );


    addAxisLabels(
        svg,
        width,
        height,

        "GDP per capita, PPP (constant 2017 international $)",

        "Population age 65+ (%)"
    );

}


// ============================================================
// GRAPH 3
// Bubble size represents population
// ============================================================

function drawPopulationBubbleChart(data) {

    const yearData = data
        .filter(
            d => d.year === 2020
        )
        .slice()
        .sort(
            (a, b) =>
                b.population -
                a.population
        );


    const width = 900;
    const height = 520;

    const margin = {
        top: 40,
        right: 40,
        bottom: 80,
        left: 90
    };


    const svg = d3
        .select("#chart-3")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Bubble chart of GDP per capita versus population age 65 and above in 2020 with bubble size representing population"
        );


    const x = d3
        .scaleLog()
        .domain(
            d3.extent(
                yearData,
                d => d.gdp_per_capita
            )
        )
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);


    const y = d3
        .scaleLinear()
        .domain([
            0,

            d3.max(
                yearData,
                d => d.age_65_plus_pct
            ) * 1.1
        ])
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    const radius = d3
        .scaleSqrt()
        .domain([
            0,

            d3.max(
                yearData,
                d => d.population
            )
        ])
        .range([
            3,
            30
        ]);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3
                .axisBottom(x)
                .ticks(
                    8,
                    "$,.0s"
                )
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    const points = svg
        .append("g")
        .selectAll("circle")
        .data(yearData)
        .join("circle")
        .attr(
            "cx",
            d => x(
                d.gdp_per_capita
            )
        )
        .attr(
            "cy",
            d => y(
                d.age_65_plus_pct
            )
        )
        .attr(
            "r",
            d => radius(
                d.population
            )
        )
        .attr(
            "fill",
            "steelblue"
        )
        .attr(
            "opacity",
            0.55
        )
        .attr(
            "stroke",
            "white"
        )
        .attr(
            "stroke-width",
            1
        );


    points
        .append("title")
        .text(
            d =>
`${d.country}
GDP per capita: $${d.gdp_per_capita.toLocaleString()}
Age 65+: ${d.age_65_plus_pct}%
Population: ${d.population.toLocaleString()}`
        );


    addAxisLabels(
        svg,
        width,
        height,

        "GDP per capita, PPP (constant 2017 international $)",

        "Population age 65+ (%)"
    );

}


// ============================================================
// GRAPH 4
// Compare aging in 1990 versus 2020
// ============================================================

function drawAgingChangeComparison(data) {

    const pairedData =
        getPairedYears(
            data,
            1990,
            2020
        )
        .map(d => ({

            country:
                d.country,

            age1990:
                d.start.age_65_plus_pct,

            age2020:
                d.end.age_65_plus_pct

        }));


    const width = 900;
    const height = 540;

    const margin = {
        top: 40,
        right: 50,
        bottom: 80,
        left: 90
    };


    const svg = d3
        .select("#chart-4")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Scatterplot comparing the share of population age 65 and above in 1990 and 2020"
        );


    const maxValue = d3.max(
        pairedData,

        d => Math.max(
            d.age1990,
            d.age2020
        )
    );


    const x = d3
        .scaleLinear()
        .domain([
            0,
            maxValue * 1.05
        ])
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);


    const y = d3
        .scaleLinear()
        .domain([
            0,
            maxValue * 1.05
        ])
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3.axisBottom(x)
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    svg
        .append("line")
        .attr(
            "x1",
            x(0)
        )
        .attr(
            "y1",
            y(0)
        )
        .attr(
            "x2",
            x(maxValue)
        )
        .attr(
            "y2",
            y(maxValue)
        )
        .attr(
            "stroke",
            "gray"
        )
        .attr(
            "stroke-width",
            2
        )
        .attr(
            "stroke-dasharray",
            "6 6"
        );


    const points = svg
        .append("g")
        .selectAll("circle")
        .data(pairedData)
        .join("circle")
        .attr(
            "cx",
            d => x(
                d.age1990
            )
        )
        .attr(
            "cy",
            d => y(
                d.age2020
            )
        )
        .attr(
            "r",
            5
        )
        .attr(
            "fill",
            "steelblue"
        )
        .attr(
            "opacity",
            0.65
        );


    points
        .append("title")
        .text(
            d =>
`${d.country}
1990: ${d.age1990.toFixed(2)}%
2020: ${d.age2020.toFixed(2)}%
Change: ${(d.age2020 - d.age1990).toFixed(2)} percentage points`
        );


    addAxisLabels(
        svg,
        width,
        height,

        "Population age 65+ in 1990 (%)",

        "Population age 65+ in 2020 (%)"
    );

}


// ============================================================
// GRAPH 5
// Top 15 oldest populations in 2020
// ============================================================

function drawOldestCountries(data) {

    const topCountries = data
        .filter(
            d => d.year === 2020
        )
        .slice()
        .sort(
            (a, b) =>
                b.age_65_plus_pct -
                a.age_65_plus_pct
        )
        .slice(
            0,
            15
        );


    const width = 900;
    const height = 620;

    const margin = {
        top: 30,
        right: 80,
        bottom: 60,
        left: 180
    };


    const svg = d3
        .select("#chart-5")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Horizontal bar chart showing the fifteen countries with the largest share of population age 65 and above in 2020"
        );


    const x = d3
        .scaleLinear()
        .domain([
            0,

            d3.max(
                topCountries,
                d => d.age_65_plus_pct
            ) * 1.1
        ])
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);


    const y = d3
        .scaleBand()
        .domain(
            topCountries.map(
                d => d.country
            )
        )
        .range([
            margin.top,
            height - margin.bottom
        ])
        .padding(0.2);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        .call(
            d3.axisBottom(x)
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    svg
        .append("g")
        .selectAll("rect")
        .data(topCountries)
        .join("rect")
        .attr(
            "x",
            x(0)
        )
        .attr(
            "y",
            d => y(d.country)
        )
        .attr(
            "width",
            d =>
                x(d.age_65_plus_pct) -
                x(0)
        )
        .attr(
            "height",
            y.bandwidth()
        )
        .attr(
            "fill",
            "steelblue"
        )
        .attr(
            "opacity",
            0.75
        );


    svg
        .append("g")
        .selectAll("text")
        .data(topCountries)
        .join("text")
        .attr(
            "x",
            d =>
                x(d.age_65_plus_pct) +
                8
        )
        .attr(
            "y",
            d =>
                y(d.country) +
                y.bandwidth() / 2
        )
        .attr(
            "dominant-baseline",
            "middle"
        )
        .text(
            d =>
                `${d.age_65_plus_pct.toFixed(1)}%`
        );


    svg
        .append("text")
        .attr(
            "x",
            (
                margin.left +
                width -
                margin.right
            ) / 2
        )
        .attr(
            "y",
            height - 15
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
// GRAPH 6
// GDP growth versus aging change
// ============================================================

function drawGrowthVsAgingChange(data) {

    const changeData =
        getPairedYears(
            data,
            1990,
            2020
        )
        .map(d => ({

            country:
                d.country,

            gdpMultiplier:
                d.end.gdp_per_capita /
                d.start.gdp_per_capita,

            agingChange:
                d.end.age_65_plus_pct -
                d.start.age_65_plus_pct

        }))
        .filter(
            d =>
                Number.isFinite(
                    d.gdpMultiplier
                ) &&

                d.gdpMultiplier > 0 &&

                Number.isFinite(
                    d.agingChange
                )
        );


    const width = 900;
    const height = 540;

    const margin = {
        top: 40,
        right: 50,
        bottom: 80,
        left: 90
    };


    const svg = d3
        .select("#chart-6")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width} ${height}`
        )
        .attr(
            "role",
            "img"
        )
        .attr(
            "aria-label",
            "Scatterplot comparing GDP per capita growth from 1990 to 2020 with change in population age 65 and above"
        );


    const x = d3
        .scaleLog()
        .domain(
            d3.extent(
                changeData,
                d => d.gdpMultiplier
            )
        )
        .nice()
        .range([
            margin.left,
            width - margin.right
        ]);


    const yExtent = d3.extent(
        changeData,
        d => d.agingChange
    );


    const yPadding =
        (
            yExtent[1] -
            yExtent[0]
        ) * 0.08;


    const y = d3
        .scaleLinear()
        .domain([
            yExtent[0] -
                yPadding,

            yExtent[1] +
                yPadding
        ])
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${height - margin.bottom}
            )`
        )
        
        .call(
            d3
                .axisBottom(x)
                .tickValues([0.5, 1, 2, 4, 8, 16])
                .tickFormat(
                    d => 
                        `${d}×`
                )
        );


    svg
        .append("g")
        .attr(
            "transform",
            `translate(
                ${margin.left},
                0
            )`
        )
        .call(
            d3.axisLeft(y)
        );


    if (
        x.domain()[0] <= 1 &&
        x.domain()[1] >= 1
    ) {

        svg
            .append("line")
            .attr(
                "x1",
                x(1)
            )
            .attr(
                "x2",
                x(1)
            )
            .attr(
                "y1",
                margin.top
            )
            .attr(
                "y2",
                height - margin.bottom
            )
            .attr(
                "stroke",
                "gray"
            )
            .attr(
                "stroke-dasharray",
                "6 6"
            );

    }


    if (
        y.domain()[0] <= 0 &&
        y.domain()[1] >= 0
    ) {

        svg
            .append("line")
            .attr(
                "x1",
                margin.left
            )
            .attr(
                "x2",
                width - margin.right
            )
            .attr(
                "y1",
                y(0)
            )
            .attr(
                "y2",
                y(0)
            )
            .attr(
                "stroke",
                "gray"
            )
            .attr(
                "stroke-dasharray",
                "6 6"
            );

    }


    const points = svg
        .append("g")
        .selectAll("circle")
        .data(changeData)
        .join("circle")
        .attr(
            "cx",
            d => x(
                d.gdpMultiplier
            )
        )
        .attr(
            "cy",
            d => y(
                d.agingChange
            )
        )
        .attr(
            "r",
            5
        )
        .attr(
            "fill",
            "steelblue"
        )
        .attr(
            "opacity",
            0.65
        );


    points
        .append("title")
        .text(
            d =>
`${d.country}
GDP per capita: ${d.gdpMultiplier.toFixed(2)}× its 1990 level
Age 65+ change: ${d.agingChange.toFixed(2)} percentage points`
        );


    addAxisLabels(
        svg,
        width,
        height,

        "GDP per capita multiplier, 2020 / 1990",

        "Change in population age 65+ (percentage points)"
    );

}


// ============================================================
// HELPER
// Find countries that contain data for both requested years
// ============================================================

function getPairedYears(
    data,
    startYear,
    endYear
) {

    const byCountry =
        d3.group(
            data,
            d => d.country_code
        );


    const pairs = [];


    for (
        const values
        of byCountry.values()
    ) {

        const start =
            values.find(
                d =>
                    d.year ===
                    startYear
            );


        const end =
            values.find(
                d =>
                    d.year ===
                    endYear
            );


        if (
            start &&
            end
        ) {

            pairs.push({

                country:
                    end.country,

                country_code:
                    end.country_code,

                start,

                end

            });

        }

    }


    return pairs;

}


// ============================================================
// HELPER
// Shared axis labels
// ============================================================

function addAxisLabels(
    svg,
    width,
    height,
    xLabel,
    yLabel
) {

    svg
        .append("text")
        .attr(
            "x",
            width / 2
        )
        .attr(
            "y",
            height - 20
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(xLabel);


    svg
        .append("text")
        .attr(
            "transform",
            "rotate(-90)"
        )
        .attr(
            "x",
            -height / 2
        )
        .attr(
            "y",
            25
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(yLabel);

}