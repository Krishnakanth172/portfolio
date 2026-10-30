import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import {
    fetchJSON,
    renderProjects,
} from '../global.js';


// ==================================================
// Load project data
// ==================================================

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const searchInput = document.querySelector('.searchBar');

const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');


// ==================================================
// Initial project rendering
// ==================================================

renderProjects(projects, projectsContainer, 'h2');

projectsTitle.textContent = `${projects.length} Projects`;


// ==================================================
// Lab 5 state
// ==================================================

let query = '';

let selectedIndex = -1;


// ==================================================
// D3 chart configuration
// ==================================================

const arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(50);

const colors = d3.scaleOrdinal(d3.schemeTableau10);


// ==================================================
// Search projects
// ==================================================

function setQuery(newQuery) {
    query = newQuery;

    return projects.filter((project) => {
        const values = Object
            .values(project)
            .join('\n')
            .toLowerCase();

        return values.includes(query.toLowerCase());
    });
}


// ==================================================
// Select / deselect a year
// ==================================================

function updateSelection(
    index,
    data,
    projectsGiven
) {
    selectedIndex =
        selectedIndex === index
            ? -1
            : index;


    // Highlight selected pie slice
    svg
        .selectAll('path')
        .attr(
            'class',
            (_, idx) =>
                idx === selectedIndex
                    ? 'selected'
                    : null
        )
        .attr(
            'aria-pressed',
            (_, idx) =>
                idx === selectedIndex
                    ? 'true'
                    : 'false'
        );


    // Highlight corresponding legend entry
    legend
        .selectAll('li')
        .attr(
            'class',
            (_, idx) =>
                idx === selectedIndex
                    ? 'legend-item selected'
                    : 'legend-item'
        )
        .attr(
            'aria-pressed',
            (_, idx) =>
                idx === selectedIndex
                    ? 'true'
                    : 'false'
        );


    // No selected slice:
    // restore all projects currently allowed by search.
    if (selectedIndex === -1) {
        renderProjects(
            projectsGiven,
            projectsContainer,
            'h2'
        );

        return;
    }


    // Selected slice:
    // filter the CURRENT searched project set by year.
    const selectedYear =
        data[selectedIndex].label;

    const yearProjects =
        projectsGiven.filter(
            (project) =>
                project.year === selectedYear
        );

    renderProjects(
        yearProjects,
        projectsContainer,
        'h2'
    );
}


// ==================================================
// Render pie chart
// ==================================================

function renderPieChart(projectsGiven) {

    // ----------------------------------------------
    // Group projects by year
    // ----------------------------------------------

    const rolledData = d3.rollups(
        projectsGiven,
        (values) => values.length,
        (project) => project.year
    );


    // ----------------------------------------------
    // Convert rollup into objects for D3
    // ----------------------------------------------

    const data = rolledData.map(
        ([year, count]) => ({
            value: count,
            label: year,
        })
    );


    // ----------------------------------------------
    // Generate pie slices
    // ----------------------------------------------

    const sliceGenerator = d3
        .pie()
        .value((d) => d.value);

    const arcData =
        sliceGenerator(data);


    // ----------------------------------------------
    // Clear previous chart and legend
    // ----------------------------------------------

    svg
        .selectAll('path')
        .remove();

    legend
        .selectAll('li')
        .remove();


    // ----------------------------------------------
    // Draw pie slices
    // ----------------------------------------------

    arcData.forEach((arc, index) => {

        const path = svg
            .append('path')
            .attr('d', arcGenerator(arc))
            .attr('fill', colors(index))
            .attr('role', 'button')
            .attr('tabindex', 0)
            .attr('aria-pressed', 'false')
            .attr(
                'aria-label',
                `${data[index].label}: ${data[index].value} projects`
            );


        // Mouse interaction
        path.on('click', () => {
            updateSelection(
                index,
                data,
                projectsGiven
            );
        });


        // Keyboard accessibility
        path.on('keydown', (event) => {
            if (
                event.key === 'Enter' ||
                event.key === ' '
            ) {
                event.preventDefault();

                updateSelection(
                    index,
                    data,
                    projectsGiven
                );
            }
        });

    });


    // ----------------------------------------------
    // Draw legend
    // ----------------------------------------------

    data.forEach((d, index) => {

        const legendItem = legend
            .append('li')
            .attr(
                'style',
                `--color:${colors(index)}`
            )
            .attr(
                'class',
                'legend-item'
            )
            .attr('role', 'button')
            .attr('tabindex', 0)
            .attr('aria-pressed', 'false')
            .html(
                `<span class="swatch"></span>
                 ${d.label}
                 <em>(${d.value})</em>`
            );


        // Allow legend to act as filtering UI too
        legendItem.on('click', () => {
            updateSelection(
                index,
                data,
                projectsGiven
            );
        });


        // Keyboard accessibility for legend
        legendItem.on(
            'keydown',
            (event) => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault();

                    updateSelection(
                        index,
                        data,
                        projectsGiven
                    );
                }
            }
        );

    });
}


// ==================================================
// Initial pie chart
// ==================================================

renderPieChart(projects);


// ==================================================
// Reactive project search
// ==================================================

searchInput.addEventListener(
    'input',
    (event) => {

        // Get projects matching current search.
        const filteredProjects =
            setQuery(event.target.value);


        // A new search resets any previous year
        // selection so indexes cannot become stale.
        selectedIndex = -1;


        // Update project cards.
        renderProjects(
            filteredProjects,
            projectsContainer,
            'h2'
        );


        // Update pie chart and legend so they show
        // only the currently searchable projects.
        renderPieChart(
            filteredProjects
        );
    }
);