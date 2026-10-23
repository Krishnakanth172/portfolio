console.log("IT'S ALIVE!");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

// ----------------------------------------------------------
// SITE PAGES
// ----------------------------------------------------------

let pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "contact/", title: "Contact" },
    { url: "resume/", title: "Resume" },
    { url: "https://github.com/Krishnakanth172", title: "GitHub" },
];

// ----------------------------------------------------------
// BASE PATH
//
// Local:
// http://127.0.0.1:5500/
//
// GitHub Pages:
// https://krishnakanth172.github.io/portfolio/
// ----------------------------------------------------------

const BASE_PATH =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio/";

// ----------------------------------------------------------
// CREATE NAVIGATION
// ----------------------------------------------------------

let nav = document.createElement("nav");

document.body.prepend(nav);

// ----------------------------------------------------------
// CREATE EACH NAV LINK
// ----------------------------------------------------------

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    // Add correct base path to internal links
    url = !url.startsWith("http")
        ? BASE_PATH + url
        : url;

    let a = document.createElement("a");

    a.href = url;
    a.textContent = title;

    // Highlight current page
    if (
        a.host === location.host &&
        a.pathname === location.pathname
    ) {
        a.classList.add("current");
    }

    // Open external links in a new tab
    if (a.host !== location.host) {
        a.target = "_blank";
    }

    nav.append(a);
}
// ----------------------------------------------------------
// THEME SWITCHER
// ----------------------------------------------------------

document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);
// ----------------------------------------------------------
// MAKE THEME SWITCHER WORK
// ----------------------------------------------------------

let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty(
        "color-scheme",
        colorScheme
    );

    select.value = colorScheme;
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

select.addEventListener("input", function (event) {
    let colorScheme = event.target.value;

    setColorScheme(colorScheme);

    localStorage.colorScheme = colorScheme;
});
// ----------------------------------------------------------
// FETCH JSON DATA
// ----------------------------------------------------------

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch projects: ${response.statusText}`
            );
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.error(
            "Error fetching or parsing JSON data:",
            error
        );
    }
}
// ----------------------------------------------------------
// RENDER PROJECTS
// ----------------------------------------------------------

export function renderProjects(
    projects,
    containerElement,
    headingLevel = 'h2'
) {
    containerElement.innerHTML = '';

    for (let project of projects) {
        const article = document.createElement('article');

        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
        `;

        containerElement.appendChild(article);
    }
}
// ----------------------------------------------------------
// FETCH GITHUB DATA
// ----------------------------------------------------------

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}