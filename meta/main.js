import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


// ==================================================
// GLOBAL STATE
// ==================================================

let data = [];
let commits = [];
let displayedCommits = [];

let xScale;
let yScale;
let timeScale;

let commitProgress = 100;
let commitMaxTime;

let brush;
let brushGroup;
let scroller;


// ==================================================
// CHART CONSTANTS
// ==================================================

const WIDTH = 1000;
const HEIGHT = 600;

const MARGIN = {
    top: 20,
    right: 25,
    bottom: 55,
    left: 70,
};

const USABLE = {
    top: MARGIN.top,
    right: WIDTH - MARGIN.right,
    bottom: HEIGHT - MARGIN.bottom,
    left: MARGIN.left,
    width:
        WIDTH -
        MARGIN.left -
        MARGIN.right,
    height:
        HEIGHT -
        MARGIN.top -
        MARGIN.bottom,
};


// ==================================================
// LOAD CSV
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
// PROCESS COMMITS
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
        )
        .sort(
            (a, b) =>
                a.datetime - b.datetime
        );
}


// ==================================================
// SUMMARY STATS
// ==================================================

function renderCommitInfo(
    data,
    commits
) {
    const container =
        d3.select('#stats');

    if (container.empty()) {
        return;
    }

    container
        .selectAll('*')
        .remove();

    const dl =
        container
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
// TOOLTIP
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

    if (
        !link ||
        !date ||
        !time ||
        !author ||
        !lines
    ) {
        return;
    }

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
                'en-US',
                {
                    dateStyle: 'full',
                }
            );

    time.textContent =
        commit.datetime
            .toLocaleTimeString(
                'en-US',
                {
                    timeStyle: 'short',
                }
            );

    author.textContent =
        commit.author;

    lines.textContent =
        commit.totalLines;
}


function updateTooltipVisibility(
    visible
) {
    const tooltip =
        document.getElementById(
            'commit-tooltip'
        );

    if (!tooltip) {
        return;
    }

    tooltip.hidden =
        !visible;
}


function updateTooltipPosition(
    event
) {
    const tooltip =
        document.getElementById(
            'commit-tooltip'
        );

    if (!tooltip) {
        return;
    }

    const offset = 14;

    tooltip.style.left =
        `${event.clientX + offset}px`;

    tooltip.style.top =
        `${event.clientY + offset}px`;
}


// ==================================================
// BRUSHING
// ==================================================

function isCommitSelected(
    selection,
    commit
) {
    if (
        !selection ||
        !xScale ||
        !yScale
    ) {
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


function getSelectedCommits(
    selection
) {
    if (!selection) {
        return [];
    }

    return displayedCommits.filter(
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
    const selected =
        getSelectedCommits(
            selection
        );

    const element =
        document.querySelector(
            '#selection-count'
        );

    if (!element) {
        return selected;
    }

    element.textContent =
        selected.length
            ? `${selected.length} commits selected`
            : 'No commits selected';

    return selected;
}


function renderLanguageBreakdown(
    selection
) {
    const selected =
        getSelectedCommits(
            selection
        );

    const container =
        document.getElementById(
            'language-breakdown'
        );

    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (
        selected.length === 0
    ) {
        return;
    }

    const lines =
        selected.flatMap(
            (commit) =>
                commit.lines
        );

    const breakdown =
        d3.rollup(
            lines,
            (values) =>
                values.length,
            (d) =>
                d.type || 'Other'
        );

    const sorted =
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
        of sorted
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


function brushed(
    event
) {
    const selection =
        event.selection;

    d3.selectAll(
        '#chart .dots circle'
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


function clearBrush() {
    if (
        brushGroup &&
        brush
    ) {
        brushGroup.call(
            brush.move,
            null
        );
    }
}


// ==================================================
// DATE DOMAIN HELPER
// ==================================================

function getDateDomain(
    commitsToShow
) {
    const extent =
        d3.extent(
            commitsToShow,
            (d) => d.datetime
        );

    if (
        !extent[0] ||
        !extent[1]
    ) {
        return [
            new Date(),
            new Date(),
        ];
    }

    if (
        +extent[0] ===
        +extent[1]
    ) {
        const padding =
            12 * 60 * 60 * 1000;

        return [
            new Date(
                +extent[0] -
                padding
            ),

            new Date(
                +extent[1] +
                padding
            ),
        ];
    }

    return extent;
}


// ==================================================
// RADIUS SCALE
// ==================================================

function makeRadiusScale(
    commitsToShow
) {
    const [
        minLines,
        maxLines,
    ] =
        d3.extent(
            commitsToShow,
            (d) =>
                d.totalLines
        );

    if (
        minLines === undefined ||
        maxLines === undefined
    ) {
        return () => 5;
    }

    if (
        minLines === maxLines
    ) {
        return () => 8;
    }

    return d3
        .scaleSqrt()
        .domain([
            minLines,
            maxLines,
        ])
        .range([
            3,
            26,
        ]);
}


// ==================================================
// INITIAL SCATTERPLOT
// ==================================================

function renderScatterPlot(
    commitsToShow
) {
    displayedCommits =
        [...commitsToShow];

    const chart =
        d3.select(
            '#chart'
        );

    chart
        .selectAll('*')
        .remove();

    const svg =
        chart
            .append('svg')
            .attr(
                'viewBox',
                `0 0 ${WIDTH} ${HEIGHT}`
            )
            .style(
                'overflow',
                'visible'
            );


    // ------------------------------
    // Scales
    // ------------------------------

    xScale =
        d3.scaleTime()
            .domain(
                getDateDomain(
                    commitsToShow
                )
            )
            .range([
                USABLE.left,
                USABLE.right,
            ])
            .nice();

    yScale =
        d3.scaleLinear()
            .domain([
                0,
                24,
            ])
            .range([
                USABLE.bottom,
                USABLE.top,
            ]);


    const rScale =
        makeRadiusScale(
            commitsToShow
        );


    // ------------------------------
    // Grid
    // ------------------------------

    svg
        .append('g')
        .attr(
            'class',
            'gridlines'
        )
        .attr(
            'transform',
            `translate(${USABLE.left}, 0)`
        )
        .call(
            d3.axisLeft(
                yScale
            )
                .tickFormat('')
                .tickSize(
                    -USABLE.width
                )
        );


    // ------------------------------
    // Axes
    // ------------------------------

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
            'meta-axis x-axis'
        )
        .attr(
            'transform',
            `translate(0, ${USABLE.bottom})`
        )
        .call(
            xAxis
        );


    svg
        .append('g')
        .attr(
            'class',
            'meta-axis y-axis'
        )
        .attr(
            'transform',
            `translate(${USABLE.left}, 0)`
        )
        .call(
            yAxis
        );


    // ------------------------------
    // Axis labels
    // ------------------------------

    svg
        .append('text')
        .attr(
            'class',
            'meta-axis-label'
        )
        .attr(
            'x',
            USABLE.left +
            USABLE.width / 2
        )
        .attr(
            'y',
            HEIGHT - 8
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
                USABLE.top +
                USABLE.height / 2
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


    // ------------------------------
    // Dots
    // ------------------------------

    svg
        .append('g')
        .attr(
            'class',
            'dots'
        );


    updateDots(
        commitsToShow,
        rScale,
        false
    );


    // ------------------------------
    // Brush
    // ------------------------------

    brush =
        d3.brush()
            .extent([
                [
                    USABLE.left,
                    USABLE.top,
                ],
                [
                    USABLE.right,
                    USABLE.bottom,
                ],
            ])
            .on(
                'start brush end',
                brushed
            );


    brushGroup =
        svg
            .append('g')
            .attr(
                'class',
                'brush'
            )
            .call(
                brush
            );


    // Keep dots above brush overlay so
    // point hover still works.
    svg
        .select(
            '.dots'
        )
        .raise();
}


// ==================================================
// DOT JOIN / UPDATE
// ==================================================

function updateDots(
    commitsToShow,
    rScale =
        makeRadiusScale(
            commitsToShow
        ),
    animate = true
) {
    const svg =
        d3.select(
            '#chart svg'
        );

    if (
        svg.empty()
    ) {
        return;
    }

    const sorted =
        d3.sort(
            commitsToShow,
            (d) =>
                -d.totalLines
        );

    const circles =
        svg
            .select(
                '.dots'
            )
            .selectAll(
                'circle'
            )
            .data(
                sorted,
                (d) => d.id
            );


    const entered =
        circles
            .enter()
            .append(
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
                0
            )
            .attr(
                'fill',
                'steelblue'
            )
            .style(
                'fill-opacity',
                0
            );


    const merged =
        entered
            .merge(
                circles
            );


    merged
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


    if (animate) {
        merged
            .transition()
            .duration(
                250
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
            .style(
                'fill-opacity',
                0.7
            );


        circles
            .exit()
            .transition()
            .duration(
                200
            )
            .attr(
                'r',
                0
            )
            .style(
                'fill-opacity',
                0
            )
            .remove();
    }

    else {
        merged
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
            .style(
                'fill-opacity',
                0.7
            );

        circles
            .exit()
            .remove();
    }
}


// ==================================================
// UPDATE EXISTING SCATTERPLOT
// ==================================================

function updateScatterPlot(
    commitsToShow
) {
    if (
        !commitsToShow.length
    ) {
        return;
    }

    displayedCommits =
        [...commitsToShow];

    const svg =
        d3.select(
            '#chart svg'
        );

    if (
        svg.empty()
    ) {
        renderScatterPlot(
            commitsToShow
        );

        return;
    }


    // Clear an existing Lab 6 brush
    // before changing coordinate scales.
    clearBrush();


    xScale
        .domain(
            getDateDomain(
                commitsToShow
            )
        )
        .nice();


    const xAxis =
        d3.axisBottom(
            xScale
        );


    svg
        .select(
            '.x-axis'
        )
        .transition()
        .duration(
            250
        )
        .call(
            xAxis
        );


    const rScale =
        makeRadiusScale(
            commitsToShow
        );


    updateDots(
        commitsToShow,
        rScale,
        true
    );


    svg
        .select(
            '.dots'
        )
        .raise();
}


// ==================================================
// LAB 8 — FILE UNIT VISUALIZATION
// ==================================================

const technologyColor =
    d3.scaleOrdinal(
        d3.schemeTableau10
    );


function updateFileDisplay(
    commitsToShow
) {
    const container =
        d3.select(
            '#files'
        );

    if (
        container.empty()
    ) {
        return;
    }


    const lines =
        commitsToShow.flatMap(
            (commit) =>
                commit.lines
        );


    const files =
        d3.groups(
            lines,
            (d) => d.file
        )
            .map(
                ([name, fileLines]) => ({
                    name,
                    lines: fileLines,
                })
            )
            .sort(
                (a, b) =>
                    b.lines.length -
                    a.lines.length
            );


    const rows =
        container
            .selectAll(
                'div.file-row'
            )
            .data(
                files,
                (d) => d.name
            )
            .join(
                (enter) => {
                    const row =
                        enter
                            .append(
                                'div'
                            )
                            .attr(
                                'class',
                                'file-row'
                            );


                    const dt =
                        row
                            .append(
                                'dt'
                            );


                    dt
                        .append(
                            'code'
                        );


                    dt
                        .append(
                            'small'
                        );


                    row
                        .append(
                            'dd'
                        );


                    return row;
                },

                (update) =>
                    update,

                (exit) =>
                    exit.remove()
            );


    rows
        .select(
            'dt > code'
        )
        .text(
            (d) =>
                d.name
        );


    rows
        .select(
            'dt > small'
        )
        .text(
            (d) =>
                `${d.lines.length} lines`
        );


    rows
        .select(
            'dd'
        )
        .selectAll(
            'div.loc'
        )
        .data(
            (d) =>
                d.lines,
            (d, i) =>
                `${d.commit}-${d.file}-${d.line}-${i}`
        )
        .join(
            'div'
        )
        .attr(
            'class',
            'loc'
        )
        .style(
            '--color',
            (d) =>
                technologyColor(
                    d.type ||
                    'Other'
                )
        )
        .attr(
            'title',
            (d) =>
                `${d.type || 'Other'} — ${d.file}:${d.line}`
        );
}


// ==================================================
// LAB 8 — SLIDER LABEL
// ==================================================

function updateCommitTimeLabel() {
    const element =
        document.getElementById(
            'commit-max-time'
        );

    if (
        !element ||
        !commitMaxTime
    ) {
        return;
    }

    element.dateTime =
        commitMaxTime
            .toISOString();

    element.textContent =
        commitMaxTime
            .toLocaleString(
                'en-US',
                {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }
            );
}


// ==================================================
// LAB 8 — APPLY TIME FILTER
// ==================================================

function applyTimeFilter(
    maxTime,
    {
        syncSlider = true,
    } = {}
) {
    commitMaxTime =
        maxTime;


    const filtered =
        commits.filter(
            (commit) =>
                commit.datetime <=
                commitMaxTime
        );


    if (
        !filtered.length
    ) {
        return;
    }


    updateCommitTimeLabel();


    if (
        syncSlider &&
        timeScale
    ) {
        commitProgress =
            Math.max(
                0,
                Math.min(
                    100,
                    timeScale(
                        commitMaxTime
                    )
                )
            );


        const slider =
            document.getElementById(
                'commit-progress'
            );


        if (slider) {
            slider.value =
                commitProgress;
        }
    }


    updateScatterPlot(
        filtered
    );


    updateFileDisplay(
        filtered
    );
}


// ==================================================
// LAB 8 — SLIDER
// ==================================================

function setupSlider() {
    const slider =
        document.getElementById(
            'commit-progress'
        );


    if (!slider) {
        return;
    }


    slider.value =
        commitProgress;


    slider.addEventListener(
        'input',
        (event) => {
            commitProgress =
                Number(
                    event.target.value
                );


            commitMaxTime =
                timeScale.invert(
                    commitProgress
                );


            applyTimeFilter(
                commitMaxTime,
                {
                    syncSlider: false,
                }
            );
        }
    );
}


// ==================================================
// LAB 8 — STORY TEXT
// ==================================================

function renderStory() {
    const story =
        d3.select(
            '#scatter-story'
        );


    if (
        story.empty()
    ) {
        return;
    }


    story
        .selectAll(
            '.step'
        )
        .data(
            commits,
            (d) => d.id
        )
        .join(
            'div'
        )
        .attr(
            'class',
            'step'
        )
        .html(
            (commit, index) => {
                const fileCount =
                    new Set(
                        commit.lines.map(
                            (line) =>
                                line.file
                        )
                    ).size;


                return `
                    <p>
                        <strong>
                            ${
                                commit.datetime
                                    .toLocaleString(
                                        'en-US',
                                        {
                                            dateStyle:
                                                'full',
                                            timeStyle:
                                                'short',
                                        }
                                    )
                            }
                        </strong>
                    </p>

                    <p>
                        ${
                            index === 0
                                ? 'This is the first commit represented in the current codebase.'
                                : 'Another commit moves the portfolio forward.'
                        }
                    </p>

                    <p>
                        This commit edited
                        <strong>
                            ${commit.totalLines}
                        </strong>
                        lines across
                        <strong>
                            ${fileCount}
                        </strong>
                        ${
                            fileCount === 1
                                ? 'file'
                                : 'files'
                        }.
                    </p>

                    <p>
                        <a
                            href="${commit.url}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View this commit on GitHub
                        </a>
                    </p>
                `;
            }
        );
}


// ==================================================
// LAB 8 — SCROLLYTELLING
// ==================================================

function onStepEnter(
    response
) {
    const commit =
        response.element
            .__data__;


    if (!commit) {
        return;
    }


    d3.selectAll(
        '#scatter-story .step'
    )
        .classed(
            'is-active',
            false
        );


    d3.select(
        response.element
    )
        .classed(
            'is-active',
            true
        );


    applyTimeFilter(
        commit.datetime
    );
}


function setupScrollytelling() {
    const container =
        document.getElementById(
            'scrolly-1'
        );


    const firstStep =
        document.querySelector(
            '#scatter-story .step'
        );


    if (
        !container ||
        !firstStep
    ) {
        return;
    }


    scroller =
        scrollama();


    scroller
        .setup({
            container:
                '#scrolly-1',

            step:
                '#scrolly-1 .step',

            offset:
                0.5,
        })
        .onStepEnter(
            onStepEnter
        );


    window.addEventListener(
        'resize',
        () => {
            scroller.resize();
        }
    );
}


// ==================================================
// INITIALIZE
// ==================================================

async function init() {
    data =
        await loadData();


    commits =
        processCommits(
            data
        );


    if (
        commits.length === 0
    ) {
        console.warn(
            'No commit data found.'
        );

        return;
    }


    // ----------------------------------------------
    // Lab 8 time scale
    // ----------------------------------------------

    timeScale =
        d3.scaleTime()
            .domain(
                d3.extent(
                    commits,
                    (d) =>
                        d.datetime
                )
            )
            .range([
                0,
                100,
            ]);


    commitProgress =
        100;


    commitMaxTime =
        timeScale.invert(
            commitProgress
        );


    // ----------------------------------------------
    // Original Lab 6 content
    // ----------------------------------------------

    renderCommitInfo(
        data,
        commits
    );


    renderScatterPlot(
        commits
    );


    // ----------------------------------------------
    // Lab 8
    // ----------------------------------------------

    updateFileDisplay(
        commits
    );


    updateCommitTimeLabel();


    setupSlider();


    renderStory();


    setupScrollytelling();
}


await init();