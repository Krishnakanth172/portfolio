import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// ==================================================
// GLOBAL STATE
// ==================================================

let data = [];
let commits = [];

let xScale;
let yScale;


// ==================================================
// LOAD CSV DATA
// ==================================================

async function loadData() {
    return await d3.csv(
        'loc.csv',
        (row) => ({
            ...row,

            line: Number(row.line),
            depth: Number(row.depth),
            length: Number(row.length),

            date: new Date(
                row.date +
                'T00:00' +
                row.timezone
            ),

            datetime: new Date(
                row.datetime
            ),
        })
    );
}


// ==================================================
// PROCESS COMMIT DATA
// ==================================================

function processCommits(data) {
    return d3
        .groups(
            data,
            (d) => d.commit
        )
        .map(
            ([commit, lines]) => {
                const first = lines[0];

                const {
                    author,
                    date,
                    time,
                    timezone,
                    datetime,
                } = first;


                const result = {
                    id: commit,

                    url:
                        'https://github.com/Krishnakanth172/portfolio/commit/' +
                        commit,

                    author,
                    date,
                    time,
                    timezone,
                    datetime,

                    hourFrac:
                        datetime.getHours() +
                        datetime.getMinutes() / 60,

                    totalLines:
                        lines.length,
                };


                Object.defineProperty(
                    result,
                    'lines',
                    {
                        value: lines,
                        enumerable: false,
                        writable: false,
                        configurable: true,
                    }
                );


                return result;
            }
        );
}


// ==================================================
// SUMMARY STATISTICS
// ==================================================

function renderCommitInfo(
    data,
    commits
) {
    const statsContainer =
        d3.select('#stats');


    statsContainer
        .selectAll('*')
        .remove();


    const dl =
        statsContainer
            .append('dl')
            .attr(
                'class',
                'stats meta-stats'
            );


    const fileGroups =
        d3.group(
            data,
            (d) => d.file
        );


    const maxDepth =
        d3.max(
            data,
            (d) => d.depth
        );


    const averageLineLength =
        d3.mean(
            data,
            (d) => d.length
        );


    const fileLengths =
        d3.rollups(
            data,
            (lines) =>
                d3.max(
                    lines,
                    (d) => d.line
                ),
            (d) => d.file
        );


    const longestFile =
        d3.greatest(
            fileLengths,
            (d) => d[1]
        );


    const stats = [
        [
            'Total LOC',
            data.length,
        ],

        [
            'Total commits',
            commits.length,
        ],

        [
            'Files',
            fileGroups.size,
        ],

        [
            'Maximum depth',
            maxDepth,
        ],

        [
            'Average line length',
            d3.format('.1f')(
                averageLineLength
            ),
        ],

        [
            'Longest file',
            longestFile
                ? longestFile[0]
                : '—',
        ],
    ];


    for (
        const [label, value]
        of stats
    ) {
        dl.append('dt')
            .text(label);

        dl.append('dd')
            .text(value);
    }
}


// ==================================================
// TOOLTIP CONTENT
// ==================================================

function renderTooltipContent(
    commit
) {
    if (!commit) {
        return;
    }


    const link =
        document.getElementById(
            'commit-link'
        );

    const date =
        document.getElementById(
            'commit-date'
        );

    const time =
        document.getElementById(
            'commit-time'
        );

    const author =
        document.getElementById(
            'commit-author'
        );

    const lines =
        document.getElementById(
            'commit-lines'
        );


    link.href =
        commit.url;

    link.textContent =
        commit.id.slice(
            0,
            7
        );


    date.textContent =
        commit.datetime
            .toLocaleDateString(
                'en',
                {
                    dateStyle: 'full',
                }
            );


    time.textContent =
        commit.datetime
            .toLocaleTimeString(
                'en',
                {
                    timeStyle: 'short',
                }
            );


    author.textContent =
        commit.author;


    lines.textContent =
        commit.totalLines;
}


// ==================================================
// TOOLTIP VISIBILITY
// ==================================================

function updateTooltipVisibility(
    isVisible
) {
    const tooltip =
        document.getElementById(
            'commit-tooltip'
        );


    tooltip.hidden =
        !isVisible;
}


// ==================================================
// TOOLTIP POSITION
// ==================================================

function updateTooltipPosition(
    event
) {
    const tooltip =
        document.getElementById(
            'commit-tooltip'
        );


    const offset = 14;


    tooltip.style.left =
        `${event.clientX + offset}px`;

    tooltip.style.top =
        `${event.clientY + offset}px`;
}


// ==================================================
// TEST WHETHER COMMIT IS INSIDE BRUSH
// ==================================================

function isCommitSelected(
    selection,
    commit
) {
    if (!selection) {
        return false;
    }


    const [
        [x0, y0],
        [x1, y1],
    ] = selection;


    const x =
        xScale(
            commit.datetime
        );


    const y =
        yScale(
            commit.hourFrac
        );


    return (
        x >= x0 &&
        x <= x1 &&
        y >= y0 &&
        y <= y1
    );
}


// ==================================================
// SELECTED COMMIT COUNT
// ==================================================

function getSelectedCommits(
    selection
) {
    if (!selection) {
        return [];
    }


    return commits.filter(
        (commit) =>
            isCommitSelected(
                selection,
                commit
            )
    );
}


function renderSelectionCount(
    selection
) {
    const selectedCommits =
        getSelectedCommits(
            selection
        );


    const countElement =
        document.querySelector(
            '#selection-count'
        );


    countElement.textContent =
        selectedCommits.length
            ? `${selectedCommits.length} commits selected`
            : 'No commits selected';


    return selectedCommits;
}


// ==================================================
// LANGUAGE BREAKDOWN
// ==================================================

function renderLanguageBreakdown(
    selection
) {
    const selectedCommits =
        getSelectedCommits(
            selection
        );


    const container =
        document.getElementById(
            'language-breakdown'
        );


    container.innerHTML = '';


    if (
        selectedCommits.length === 0
    ) {
        return;
    }


    const lines =
        selectedCommits
            .flatMap(
                (commit) =>
                    commit.lines
            );


    const breakdown =
        d3.rollup(
            lines,

            (values) =>
                values.length,

            (d) =>
                d.type
        );


    const sortedBreakdown =
        Array.from(
            breakdown.entries()
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    for (
        const [
            language,
            count,
        ]
        of sortedBreakdown
    ) {
        const proportion =
            count /
            lines.length;


        const formatted =
            d3.format('.1~%')(
                proportion
            );


        container.innerHTML += `
            <dt>${language}</dt>
            <dd>
                ${count} lines (${formatted})
            </dd>
        `;
    }
}


// ==================================================
// BRUSH EVENT
// ==================================================

function brushed(
    event
) {
    const selection =
        event.selection;


    d3.selectAll(
        '#chart circle'
    )
        .classed(
            'selected',
            (commit) =>
                isCommitSelected(
                    selection,
                    commit
                )
        );


    renderSelectionCount(
        selection
    );


    renderLanguageBreakdown(
        selection
    );
}


// ==================================================
// SCATTERPLOT
// ==================================================

function renderScatterPlot(
    commits
) {
    const chart =
        d3.select(
            '#chart'
        );


    chart
        .selectAll('*')
        .remove();


    const width =
        1000;

    const height =
        600;


    const margin = {
        top: 20,
        right: 25,
        bottom: 55,
        left: 70,
    };


    const usableArea = {
        top:
            margin.top,

        right:
            width -
            margin.right,

        bottom:
            height -
            margin.bottom,

        left:
            margin.left,

        width:
            width -
            margin.left -
            margin.right,

        height:
            height -
            margin.top -
            margin.bottom,
    };


    const svg =
        chart
            .append('svg')
            .attr(
                'viewBox',
                `0 0 ${width} ${height}`
            )
            .style(
                'overflow',
                'visible'
            );


    // ==================================================
    // SCALES
    // ==================================================

    xScale =
        d3.scaleTime()
            .domain(
                d3.extent(
                    commits,
                    (d) =>
                        d.datetime
                )
            )
            .range([
                usableArea.left,
                usableArea.right,
            ])
            .nice();


    yScale =
        d3.scaleLinear()
            .domain([
                0,
                24,
            ])
            .range([
                usableArea.bottom,
                usableArea.top,
            ]);


    const [
        minLines,
        maxLines,
    ] =
        d3.extent(
            commits,
            (d) =>
                d.totalLines
        );


    const rScale =
        d3.scaleSqrt()
            .domain([
                minLines,
                maxLines,
            ])
            .range([
                3,
                26,
            ]);


    // ==================================================
    // HORIZONTAL GRID LINES
    // ==================================================

    svg
        .append('g')
        .attr(
            'class',
            'gridlines'
        )
        .attr(
            'transform',
            `translate(${usableArea.left}, 0)`
        )
        .call(
            d3.axisLeft(
                yScale
            )
                .tickFormat('')
                .tickSize(
                    -usableArea.width
                )
        );


    // ==================================================
    // AXES
    // ==================================================

    const xAxis =
        d3.axisBottom(
            xScale
        );


    const yAxis =
        d3.axisLeft(
            yScale
        )
            .tickFormat(
                (d) =>
                    String(
                        d % 24
                    )
                        .padStart(
                            2,
                            '0'
                        ) +
                    ':00'
            );


    svg
        .append('g')
        .attr(
            'class',
            'meta-axis'
        )
        .attr(
            'transform',
            `translate(0, ${usableArea.bottom})`
        )
        .call(
            xAxis
        );


    svg
        .append('g')
        .attr(
            'class',
            'meta-axis'
        )
        .attr(
            'transform',
            `translate(${usableArea.left}, 0)`
        )
        .call(
            yAxis
        );


    // ==================================================
    // AXIS LABELS
    // ==================================================

    svg
        .append('text')
        .attr(
            'class',
            'meta-axis-label'
        )
        .attr(
            'x',
            usableArea.left +
            usableArea.width / 2
        )
        .attr(
            'y',
            height - 8
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .text(
            'Commit date'
        );


    svg
        .append('text')
        .attr(
            'class',
            'meta-axis-label'
        )
        .attr(
            'transform',
            'rotate(-90)'
        )
        .attr(
            'x',
            -(
                usableArea.top +
                usableArea.height / 2
            )
        )
        .attr(
            'y',
            18
        )
        .attr(
            'text-anchor',
            'middle'
        )
        .text(
            'Time of day'
        );


    // ==================================================
    // DOTS
    // ==================================================

    const sortedCommits =
        d3.sort(
            commits,
            (d) =>
                -d.totalLines
        );


    const dots =
        svg
            .append('g')
            .attr(
                'class',
                'dots'
            );


    dots
        .selectAll(
            'circle'
        )
        .data(
            sortedCommits
        )
        .join(
            'circle'
        )
        .attr(
            'cx',
            (d) =>
                xScale(
                    d.datetime
                )
        )
        .attr(
            'cy',
            (d) =>
                yScale(
                    d.hourFrac
                )
        )
        .attr(
            'r',
            (d) =>
                rScale(
                    d.totalLines
                )
        )
        .attr(
            'fill',
            'steelblue'
        )
        .style(
            'fill-opacity',
            0.7
        )
        .on(
            'mouseenter',
            (
                event,
                commit
            ) => {
                d3.select(
                    event.currentTarget
                )
                    .style(
                        'fill-opacity',
                        1
                    );


                renderTooltipContent(
                    commit
                );


                updateTooltipVisibility(
                    true
                );


                updateTooltipPosition(
                    event
                );
            }
        )
        .on(
            'mousemove',
            (event) => {
                updateTooltipPosition(
                    event
                );
            }
        )
        .on(
            'mouseleave',
            (event) => {
                d3.select(
                    event.currentTarget
                )
                    .style(
                        'fill-opacity',
                        0.7
                    );


                updateTooltipVisibility(
                    false
                );
            }
        );


    // ==================================================
    // BRUSH
    // ==================================================

    const brush =
        d3.brush()
            .extent([
                [
                    usableArea.left,
                    usableArea.top,
                ],
                [
                    usableArea.right,
                    usableArea.bottom,
                ],
            ])
            .on(
                'start brush end',
                brushed
            );


    svg.call(
        brush
    );


    // Move dots above the brush overlay so
    // hover interactions continue to work.
    svg
        .selectAll(
            '.dots, .overlay ~ *'
        )
        .raise();
}


// ==================================================
// INITIALIZE PAGE
// ==================================================

data =
    await loadData();


commits =
    processCommits(
        data
    );


renderCommitInfo(
    data,
    commits
);


renderScatterPlot(
    commits
);