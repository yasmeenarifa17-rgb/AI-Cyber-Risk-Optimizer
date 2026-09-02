/* =====================================================
   AI CYBER RISK DASHBOARD
   SIH26105

   Frontend components:
   1. Risk Score Cards
   2. Asset/Vulnerability Table
   3. Financial Risk Cards
   4. AI Recommendation Card

   Current data: MOCK DATA
===================================================== */


/* =====================================================
   MOCK DASHBOARD DATA
===================================================== */

const dashboardData = {

    /* -------------------------
       RISK DATA
    ------------------------- */

    risk: {

        overallScore: 72,

        critical: 3,

        high: 7,

        medium: 12,

        low: 18,

        vulnerableAssets: 15
    },


    /* -------------------------
       ASSET DATA
    ------------------------- */

    assets: [

        {
            asset: "Web Server",
            vulnerability: "SQL Injection",
            severity: "Critical",
            score: 92,
            loss: 800000
        },

        {
            asset: "Database Server",
            vulnerability: "Weak Authentication",
            severity: "High",
            score: 78,
            loss: 500000
        },

        {
            asset: "API Server",
            vulnerability: "Outdated Library",
            severity: "Medium",
            score: 56,
            loss: 250000
        },

        {
            asset: "Employee Laptop",
            vulnerability: "Missing Security Patch",
            severity: "High",
            score: 75,
            loss: 350000
        },

        {
            asset: "Cloud Storage",
            vulnerability: "Misconfiguration",
            severity: "Low",
            score: 35,
            loss: 100000
        },

        {
            asset: "Authentication Server",
            vulnerability: "Brute Force Exposure",
            severity: "Critical",
            score: 88,
            loss: 650000
        },

        {
            asset: "Mail Server",
            vulnerability: "Phishing Exposure",
            severity: "Medium",
            score: 61,
            loss: 180000
        }

    ],


    /* -------------------------
       FINANCIAL DATA
    ------------------------- */

    financial: {

        expectedLoss: 420000,

        potentialLoss: 1250000,

        cybersecurityExposure: 870000
    },


    /* -------------------------
       AI RECOMMENDATION
    ------------------------- */

    recommendation: {

        title: "Patch Critical Vulnerabilities",

        description:
            "Prioritize critical vulnerabilities in the web server and authentication infrastructure. Applying security patches and strengthening authentication controls can significantly reduce cyber risk and potential financial impact.",

        investment: 150000,

        riskReduction: 32,

        priority: "CRITICAL"
    }

};


/* =====================================================
   FORMAT CURRENCY
===================================================== */

function formatCurrency(value) {

    return new Intl.NumberFormat("en-IN", {

        style: "currency",

        currency: "INR",

        maximumFractionDigits: 0

    }).format(value);

}


/* =====================================================
   GET SEVERITY CLASS
===================================================== */

function getSeverityClass(severity) {

    const normalizedSeverity = severity.toLowerCase();

    switch (normalizedSeverity) {

        case "critical":
            return "critical";

        case "high":
            return "high";

        case "medium":
            return "medium";

        case "low":
            return "low";

        default:
            return "";
    }
}


/* =====================================================
   RENDER RISK SCORE CARDS
===================================================== */

function renderRiskCards() {

    const container = document.getElementById("riskCards");

    if (!container) {

        console.error("Risk cards container not found.");

        return;
    }


    const risk = dashboardData.risk;


    const cards = [

        {
            title: "Overall Cyber Risk",
            value: `${risk.overallScore}/100`,
            description: "Overall cybersecurity risk score",
            className: "overall"
        },

        {
            title: "Critical Risks",
            value: risk.critical,
            description: "Immediate attention required",
            className: "critical"
        },

        {
            title: "High Risks",
            value: risk.high,
            description: "High priority vulnerabilities",
            className: "high"
        },

        {
            title: "Medium Risks",
            value: risk.medium,
            description: "Moderate priority vulnerabilities",
            className: "medium"
        },

        {
            title: "Low Risks",
            value: risk.low,
            description: "Low priority vulnerabilities",
            className: "low"
        },

        {
            title: "Vulnerable Assets",
            value: risk.vulnerableAssets,
            description: "Assets requiring attention",
            className: "assets"
        }

    ];


    container.innerHTML = "";


    cards.forEach(function(card) {

        const cardElement = document.createElement("div");

        cardElement.className = `risk-card ${card.className}`;


        cardElement.innerHTML = `

            <h3>${card.title}</h3>

            <div class="risk-value">
                ${card.value}
            </div>

            <p class="risk-description">
                ${card.description}
            </p>

        `;


        container.appendChild(cardElement);

    });

}


/* =====================================================
   RENDER ASSET TABLE
===================================================== */

function renderAssetTable() {

    const tableBody = document.getElementById("assetTable");

    if (!tableBody) {

        console.error("Asset table container not found.");

        return;
    }


    tableBody.innerHTML = "";


    dashboardData.assets.forEach(function(asset) {

        const severityClass =
            getSeverityClass(asset.severity);


        const row = document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>${asset.asset}</strong>
            </td>

            <td>
                ${asset.vulnerability}
            </td>

            <td>

                <span class="badge badge-${severityClass}">
                    ${asset.severity}
                </span>

            </td>

            <td>

                <span class="score score-${severityClass}">
                    ${asset.score}/100
                </span>

            </td>

            <td>
                ${formatCurrency(asset.loss)}
            </td>

        `;


        tableBody.appendChild(row);

    });

}


/* =====================================================
   RENDER FINANCIAL RISK CARDS
===================================================== */

function renderFinancialCards() {

    const container =
        document.getElementById("financialCards");


    if (!container) {

        console.error("Financial cards container not found.");

        return;
    }


    const financial = dashboardData.financial;


    const cards = [

        {
            title: "Expected Loss",
            value: formatCurrency(financial.expectedLoss),
            description:
                "Estimated average financial impact"
        },

        {
            title: "Potential Loss",
            value: formatCurrency(financial.potentialLoss),
            description:
                "Maximum estimated financial impact"
        },

        {
            title: "Current Cybersecurity Exposure",
            value: formatCurrency(financial.cybersecurityExposure),
            description:
                "Current estimated financial exposure"
        }

    ];


    container.innerHTML = "";


    cards.forEach(function(card) {

        const cardElement =
            document.createElement("div");


        cardElement.className =
            "financial-card";


        cardElement.innerHTML = `

            <h3>
                ${card.title}
            </h3>

            <div class="financial-value">
                ${card.value}
            </div>

            <p class="financial-description">
                ${card.description}
            </p>

        `;


        container.appendChild(cardElement);

    });

}


/* =====================================================
   RENDER AI RECOMMENDATION
===================================================== */

function renderRecommendation() {

    const container =
        document.getElementById("recommendationCard");


    if (!container) {

        console.error(
            "Recommendation card container not found."
        );

        return;
    }


    const recommendation =
        dashboardData.recommendation;


    container.innerHTML = `

        <div class="recommendation-card">

            <div class="recommendation-top">

                <h3 class="recommendation-title">
                    ${recommendation.title}
                </h3>

                <span class="priority">
                    ${recommendation.priority}
                </span>

            </div>


            <p class="recommendation-description">
                ${recommendation.description}
            </p>


            <div class="recommendation-details">


                <div class="detail-box">

                    <span>
                        Investment Required
                    </span>

                    <strong>
                        ${formatCurrency(
                            recommendation.investment
                        )}
                    </strong>

                </div>


                <div class="detail-box">

                    <span>
                        Expected Risk Reduction
                    </span>

                    <strong>
                        ${recommendation.riskReduction}%
                    </strong>

                </div>


                <div class="detail-box">

                    <span>
                        Priority
                    </span>

                    <strong>
                        ${recommendation.priority}
                    </strong>

                </div>


            </div>

        </div>

    `;

}


/* =====================================================
   INITIALIZE DASHBOARD
===================================================== */

function initializeDashboard() {

    console.log(
        "Initializing AI Cyber Risk Dashboard..."
    );


    renderRiskCards();

    renderAssetTable();

    renderFinancialCards();

    renderRecommendation();


    console.log(
        "Dashboard components loaded successfully."
    );

}


/* =====================================================
   START APPLICATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);