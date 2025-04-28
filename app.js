const urlAutentification = "https://zone01normandie.org/api/auth/signin";
const urlGraph = "https://zone01normandie.org/api/graphql-engine/v1/graphql";

let infoUser;
let allTransactInfo;

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("submitButton").addEventListener("click", function() {
        const passwordDIV = document.getElementById("password");
        const usernameDIV = document.getElementById("username");
        credentials.password = passwordDIV.value;
        credentials.username = usernameDIV.value;
        fetchZone01();
    });
});

const credentials = {
    username: '',
    password: '',
};

let jwtToken;
function fetchZone01() {
    let login = async function () {
        const headers = new Headers();
        headers.append('Authorization', 'Basic ' + btoa(credentials.username + ':' + credentials.password));
        try {
            const response = await fetch(urlAutentification, {
                method: 'POST',
                headers: headers
            });
            const token = await response.json();
            if (response.ok) {
                jwtToken = token;
                fetchUserData();
            } else {
                afficherError(token.message || "Error bad password or username");
            }
        } catch (error) {
            console.error('Error:', error);
            afficherError("Network error occurred");
        }
    };
    login();
}

let timeout;
function afficherError(message) {
    clearTimeout(timeout);
    const error = document.getElementById("errorMessage");
    error.textContent = message;
    error.classList.add("show");
    timeout = setTimeout(() => {
        error.classList.remove("show");
    }, 3000);
}

async function fetchUserData() {
    try {
        const response = await fetch(urlGraph, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                query: `
                query {
                    user {
                        id
                        login
                        attrs
                        totalUp
                        totalDown
                        transactions (where: {type: {_eq: "xp"}}, order_by: {createdAt:asc}) {
                            amount
                            type
                            createdAt
                        }
                    }
                    transaction {
                        id
                        type
                        amount
                        objectId
                        userId
                        createdAt
                        path
                    }
                }`
            })
        });
        
        const data = await response.json();
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        infoUser = data.data.user[0];
        allTransactInfo = data.data.transaction;
        createProfilPageUser();
    } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
        afficherError("Failed to fetch user data");
    }
}

async function createProfilPageUser() {
    if (infoUser) {
        document.querySelector(".login-container").style.display = "none";
        const dashboard = document.getElementById("allContent");
        dashboard.style.display = "block";
        dashboard.innerHTML = "";
        
        await bonjourProfil();
        profilUser(dashboard);
        //generateGraphLinear();
        generateGraphBar();
        generateExpOverTimeGraph();
        createRadarChart(transactSkill());
    }
}



async function bonjourProfil() {
    const nomUser = infoUser.attrs.firstName;
    const welcomeContainer = document.createElement("div");
    welcomeContainer.className = "user-profile welcome-message";
    document.getElementById("allContent").appendChild(welcomeContainer);

    const messages = [
        "Initializing dashboard...",
        "Loading user data...",
        "Almost there...",
        `Welcome, ${nomUser}`
    ];

    messages.forEach((msg, index) => {
        setTimeout(() => {
            welcomeContainer.textContent = msg;
            welcomeContainer.classList.add("welcome-message");
            welcomeContainer.style.animationDelay = `${index * 0.4}s`;
        }, index * 400);
    });

    setTimeout(() => {
        welcomeContainer.innerHTML = `<h2>User Profile</h2><div class="user-info-grid" id="userInfoGrid"></div>`;
    }, messages.length * 400);
}

function profilUser(contentPage) {
    const userInfoGrid = document.createElement("div");
    userInfoGrid.className = "user-info-grid";
    contentPage.appendChild(userInfoGrid);

    const createInfoCard = (title, value) => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `<h3>${title}</h3><p>${value}</p>`;
        return card;
    };

    userInfoGrid.appendChild(createInfoCard("ID", infoUser.id));
    userInfoGrid.appendChild(createInfoCard("Username", infoUser.login));
    userInfoGrid.appendChild(createInfoCard("Level", foundLevelUser()));
    userInfoGrid.appendChild(createInfoCard("Phone", infoUser.attrs.Phone || "N/A"));
    userInfoGrid.appendChild(createInfoCard("Email", infoUser.attrs.email));
    userInfoGrid.appendChild(createInfoCard("Gender", infoUser.attrs.gender || "N/A"));
    userInfoGrid.appendChild(createInfoCard("Address", infoUser.attrs.addressStreet || "N/A"));
    userInfoGrid.appendChild(createInfoCard("Motivation", infoUser.attrs.attentes || "N/A"));

    const exitButton = document.createElement("button");
    exitButton.className = "exit-button";
    exitButton.textContent = "Log Out";
    exitButton.addEventListener("click", function() {
        window.location.reload();
    });
    contentPage.appendChild(exitButton);
}

function foundLevelUser() {
    for (let i = 0; i < infoUser.transactions.length-1; i++) {
        if (infoUser.transactions[i].type === "level") {
            return infoUser.transactions[i].amount;
        }
    }
    return "N/A";
}

function transactionsEXP() {
    let array = [];
    for(let i = 0; i < infoUser.transactions.length-1; i++) {
        if (infoUser.transactions[i].type === "xp") {
            array.push(Number(infoUser.transactions[i].amount));
        }
    }
    return array;
}

function generateGraphLinear() {
    const expData = transactionsEXP();
    if (expData.length === 0) return;

    const graphContainer = document.createElement("div");
    graphContainer.className = "graph-container";
    graphContainer.innerHTML = `<h2>Experience Points</h2>`;
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "graph-svg";
    svg.setAttribute("viewBox", "0 0 1000 400");
    
    const maxAmount = Math.max(...expData);
    const minAmount = Math.min(...expData);
    const sumAmount = expData.reduce((acc, curr) => acc + curr, 0);
    const avgAmount = sumAmount / expData.length;
    
    // Add Y axis
    for (let i = 0; i <= 5; i++) {
        const y = 400 - i * 80;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "50");
        line.setAttribute("y1", y);
        line.setAttribute("x2", "950");
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "rgba(79, 195, 247, 0.2)");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "30");
        text.setAttribute("y", y + 5);
        text.setAttribute("fill", "var(--accent-color)");
        text.setAttribute("font-size", "12");
        text.textContent = Math.round((maxAmount / 5) * i);
        svg.appendChild(text);
    }
    
    // Add X axis
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "50");
    line.setAttribute("y1", "350");
    line.setAttribute("x2", "950");
    line.setAttribute("y2", "350");
    line.setAttribute("stroke", "rgba(79, 195, 247, 0.5)");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
    
    // Add data points
    let cumulativeSum = 0;
    const points = expData.map((value, index) => {
        cumulativeSum += value;
        const x = 50 + (index * 900 / (expData.length - 1));
        const y = 350 - (cumulativeSum / sumAmount * 300);
        return `${x},${y}`;
    }).join(" ");
    
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "var(--accent-color)");
    polyline.setAttribute("stroke-width", "3");
    svg.appendChild(polyline);
    
    // Add stats
    const stats = document.createElementNS("http://www.w3.org/2000/svg", "text");
    stats.setAttribute("x", "500");
    stats.setAttribute("y", "50");
    stats.setAttribute("text-anchor", "middle");
    stats.setAttribute("fill", "var(--text-color)");
    stats.setAttribute("font-size", "14");
    stats.textContent = `Total XP: ${sumAmount} | Avg: ${Math.round(avgAmount)} | Max: ${maxAmount} | Min: ${minAmount}`;
    svg.appendChild(stats);
    
    graphContainer.appendChild(svg);
    document.getElementById("allContent").appendChild(graphContainer);
}

function transactPointAudits() {
    return allTransactInfo.filter(transact => transact.type === "up" || transact.type === "down");
}

function generateGraphBar() {
    const auditData = transactPointAudits();
    if (auditData.length === 0) return;

    const graphContainer = document.createElement("div");
    graphContainer.className = "graph-container";
    graphContainer.innerHTML = `<h2>Audit Results</h2>`;
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "graph-svg";
    svg.setAttribute("viewBox", "0 0 1000 400");
    
    const maxValue = Math.max(...auditData.map(item => Math.abs(item.amount)));
    const barWidth = 900 / auditData.length;
    
    // Add Y axis
    for (let i = 0; i <= 5; i++) {
        const y = 350 - i * 70;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "50");
        line.setAttribute("y1", y);
        line.setAttribute("x2", "950");
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "rgba(79, 195, 247, 0.2)");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "30");
        text.setAttribute("y", y + 5);
        text.setAttribute("fill", "var(--accent-color)");
        text.setAttribute("font-size", "12");
        text.textContent = Math.round((maxValue / 5) * i);
        svg.appendChild(text);
    }
    
    // Add X axis
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "50");
    line.setAttribute("y1", "350");
    line.setAttribute("x2", "950");
    line.setAttribute("y2", "350");
    line.setAttribute("stroke", "rgba(79, 195, 247, 0.5)");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
    
    // Add bars
    auditData.forEach((item, index) => {
        const barHeight = (Math.abs(item.amount) / maxValue) * 300;
        const x = 50 + (index * barWidth);
        const y = item.type === "up" ? 350 - barHeight : 350;
        
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width", barWidth - 5);
        rect.setAttribute("height", barHeight);
        rect.setAttribute("fill", item.type === "up" ? "var(--success-color)" : "var(--error-color)");
        rect.setAttribute("rx", "3");
        svg.appendChild(rect);
    });
    
    graphContainer.appendChild(svg);
    document.getElementById("allContent").appendChild(graphContainer);
}

function transactSkill() {
    const skills = {
        go: { amount: 0, type: "Go" },
        js: { amount: 0, type: "JavaScript" },
        algo: { amount: 0, type: "Algorithms" },
        front: { amount: 0, type: "Front-end" },
        back: { amount: 0, type: "Back-end" },
        prog: { amount: 0, type: "Programming" }
    };

    allTransactInfo.forEach(transact => {
        switch (transact.type) {
            case "skill_prog":
                if (transact.amount > skills.prog.amount) skills.prog = transact;
                break;
            case "skill_go":
                if (transact.amount > skills.go.amount) skills.go = transact;
                break;
            case "skill_js":
                if (transact.amount > skills.js.amount) skills.js = transact;
                break;
            case "skill_front-end":
                if (transact.amount > skills.front.amount) skills.front = transact;
                break;
            case "skill_back-end":
                if (transact.amount > skills.back.amount) skills.back = transact;
                break;
            case "skill_algo":
                if (transact.amount > skills.algo.amount) skills.algo = transact;
                break;
        }
    });

    return Object.values(skills);
}

function createRadarChart(data) {
    if (data.length === 0) return;

    const graphContainer = document.createElement("div");
    graphContainer.className = "graph-container";
    graphContainer.innerHTML = `<h2>Skills Radar</h2>`;
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "graph-svg";
    svg.setAttribute("viewBox", "0 0 600 400");
    
    const centerX = 300;
    const centerY = 200;
    const radius = 150;
    const levels = 5;
    
    // Draw radar levels
    for (let i = levels; i > 0; i--) {
        const points = [];
        for (let j = 0; j < data.length; j++) {
            const angle = (Math.PI * 2 * j / data.length) - Math.PI/2;
            const r = radius * (i / levels);
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            points.push(`${x},${y}`);
        }
        
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", points.join(" "));
        polygon.setAttribute("fill", `rgba(79, 195, 247, ${0.05 + (i * 0.05)})`);
        polygon.setAttribute("stroke", "rgba(79, 195, 247, 0.3)");
        polygon.setAttribute("stroke-width", "1");
        svg.appendChild(polygon);
    }
    
    // Draw axes
    for (let i = 0; i < data.length; i++) {
        const angle = (Math.PI * 2 * i / data.length) - Math.PI/2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", centerX);
        line.setAttribute("y1", centerY);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "rgba(79, 195, 247, 0.5)");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
    }
    
    // Draw data polygon
    const points = [];
    for (let i = 0; i < data.length; i++) {
        const angle = (Math.PI * 2 * i / data.length) - Math.PI/2;
        const value = Math.min(data[i].amount / 100, 1); // Normalize to 0-1 (assuming max is 100)
        const r = radius * value;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        points.push(`${x},${y}`);
        
        // Add skill labels
        const labelAngle = (Math.PI * 2 * i / data.length) - Math.PI/2;
        const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
        const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", labelX);
        text.setAttribute("y", labelY);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--accent-color)");
        text.setAttribute("font-size", "12");
        text.textContent = `${data[i].type}: ${data[i].amount}`;
        svg.appendChild(text);
    }
    
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.join(" "));
    polygon.setAttribute("fill", "rgba(79, 195, 247, 0.3)");
    polygon.setAttribute("stroke", "var(--accent-color)");
    polygon.setAttribute("stroke-width", "2");
    svg.appendChild(polygon);
    
    graphContainer.appendChild(svg);
    document.getElementById("allContent").appendChild(graphContainer);
}

function generateExpOverTimeGraph() {
    console.log("Generating XP over time graph..."); // Debug log
    
    const xpTransactions = infoUser.transactions.filter(transact => transact.type === "xp");
    console.log("XP Transactions:", xpTransactions); // Debug log
    
    if (xpTransactions.length === 0) {
        console.log("No XP transactions found"); // Debug log
        return;
    }
    // Sort transactions by date
    xpTransactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const graphContainer = document.createElement("div");
    graphContainer.className = "graph-container";
    graphContainer.innerHTML = `<h2>XP Progression Over Time</h2>`;
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.className = "graph-svg";
    svg.setAttribute("viewBox", "0 0 1000 400");
    
    // Calculate cumulative XP and prepare data
    let cumulativeXp = 0;
    const dataPoints = xpTransactions.map(transact => {
        cumulativeXp += Number(transact.amount);
        return {
            date: new Date(transact.createdAt),
            xp: cumulativeXp,
            amount: Number(transact.amount)
        };
    });

    const maxXp = Math.max(...dataPoints.map(d => d.xp));
    const minDate = dataPoints[0].date;
    const maxDate = dataPoints[dataPoints.length - 1].date;
    const timeRange = maxDate - minDate;

    // Add Y axis (XP)
    for (let i = 0; i <= 5; i++) {
        const y = 350 - i * 70;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "50");
        line.setAttribute("y1", y);
        line.setAttribute("x2", "950");
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "rgba(79, 195, 247, 0.2)");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "30");
        text.setAttribute("y", y + 5);
        text.setAttribute("fill", "var(--accent-color)");
        text.setAttribute("font-size", "12");
        text.textContent = Math.round((maxXp / 5) * i);
        svg.appendChild(text);
    }
    
    // Add X axis (Time)
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "50");
    line.setAttribute("y1", "350");
    line.setAttribute("x2", "950");
    line.setAttribute("y2", "350");
    line.setAttribute("stroke", "rgba(79, 195, 247, 0.5)");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    // Add date labels
    const numDateLabels = Math.min(5, dataPoints.length);
    for (let i = 0; i < numDateLabels; i++) {
        const index = Math.floor((dataPoints.length - 1) * (i / (numDateLabels - 1)));
        const point = dataPoints[index];
        const x = 50 + (900 * (point.date - minDate) / timeRange);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", "370");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--accent-color)");
        text.setAttribute("font-size", "10");
        text.textContent = point.date.toLocaleDateString();
        svg.appendChild(text);
        
        // Add vertical guide line
        const guideLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        guideLine.setAttribute("x1", x);
        guideLine.setAttribute("y1", "350");
        guideLine.setAttribute("x2", x);
        guideLine.setAttribute("y2", "50");
        guideLine.setAttribute("stroke", "rgba(79, 195, 247, 0.1)");
        guideLine.setAttribute("stroke-width", "1");
        svg.appendChild(guideLine);
    }

    // Create the line path
    let pathData = "";
    dataPoints.forEach((point, index) => {
        const x = 50 + (900 * (point.date - minDate) / timeRange);
        const y = 350 - (point.xp / maxXp * 300);
        
        if (index === 0) {
            pathData += `M ${x},${y} `;
        } else {
            pathData += `L ${x},${y} `;
        }
        
        // Add data point circles
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "var(--accent-color)");
        svg.appendChild(circle);
        
        // Add XP amount on hover
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${point.date.toLocaleDateString()}\nXP: ${point.amount}\nTotal: ${point.xp}`;
        circle.appendChild(title);
    });

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--accent-color)");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);

    // Add stats
    const stats = document.createElementNS("http://www.w3.org/2000/svg", "text");
    stats.setAttribute("x", "500");
    stats.setAttribute("y", "30");
    stats.setAttribute("text-anchor", "middle");
    stats.setAttribute("fill", "var(--text-color)");
    stats.setAttribute("font-size", "14");
    stats.textContent = `Total XP: ${maxXp} | First: ${minDate.toLocaleDateString()} | Last: ${maxDate.toLocaleDateString()}`;
    svg.appendChild(stats);

    graphContainer.appendChild(svg);
    document.getElementById("allContent").appendChild(graphContainer);
}