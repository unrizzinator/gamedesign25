const list = document.querySelector('.container');

const versions = [
    "1.0.0",
    "1.0.1",
    "1.0.2",
    "1.0.3",
    "1.0.4",
    "1.0.5",
    "1.0.6",
    "1.0.7",
    "1.0.8",
    "1.1.0",
    "1.1.1",
    "1.1.2",
    "1.1.3",
    "1.2.0",
    "1.2.1",
    "2.0.0",
    "2.0.1",
    "2.0.2",
]

function fillList() {
    versions.forEach(version => {
        const newLink = document.createElement('a');
        newLink.href = `./versions/v${version.replaceAll(".", "_")}/index.html`;
        newLink.innerHTML = `<button class="version">v${version}</button>`;
        list.append(newLink);
    });
}

fillList();