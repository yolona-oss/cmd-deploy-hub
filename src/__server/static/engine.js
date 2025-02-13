document.addEventListener('DOMContentLoaded', function () {
    // Current Data Chart
    const currentDataCtx = document.getElementById('currentDataChart').getContext('2d');
    const currentDataChart = new Chart(currentDataCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Current Data',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Simulate polling data from server
    setInterval(() => {
        const newData = Math.random() * 100;
        const newLabel = new Date().toLocaleTimeString();
        currentDataChart.data.labels.push(newLabel);
        currentDataChart.data.datasets[0].data.push(newData);
        if (currentDataChart.data.labels.length > 10) {
            currentDataChart.data.labels.shift();
            currentDataChart.data.datasets[0].data.shift();
        }
        currentDataChart.update();
    }, 2000);

    // Bezier Curve Chart
    const bezierCurveCtx = document.getElementById('bezierCurveChart').getContext('2d');
    const bezierCurveChart = new Chart(bezierCurveCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Bezier Curve',
                data: [],
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const points = [];
    document.getElementById('addPoint').addEventListener('click', () => {
        const x = points.length;
        const y = Math.random() * 100;
        points.push({ x, y });
        updateBezierCurve();
    });

    document.getElementById('clearPoints').addEventListener('click', () => {
        points.length = 0;
        updateBezierCurve();
    });

    function updateBezierCurve() {
        const bezierPoints = calculateBezierCurve(points);
        bezierCurveChart.data.labels = bezierPoints.map((_, i) => i);
        bezierCurveChart.data.datasets[0].data = bezierPoints.map(p => p.y);
        bezierCurveChart.update();
    }

    function calculateBezierCurve(points) {
        const bezierPoints = [];
        for (let t = 0; t <= 1; t += 0.01) {
            const point = getBezierPoint(points, t);
            bezierPoints.push(point);
        }
        return bezierPoints;
    }

    function getBezierPoint(points, t) {
        if (points.length === 1) {
            return points[0];
        }
        const newPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            const x = (1 - t) * points[i].x + t * points[i + 1].x;
            const y = (1 - t) * points[i].y + t * points[i + 1].y;
            newPoints.push({ x, y });
        }
        return getBezierPoint(newPoints, t);
    }

    // Tree Menu
    const infoBlock = document.getElementById('infoBlock');
    document.querySelectorAll('.tree-menu li a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const info = this.getAttribute('data-info');
            infoBlock.innerHTML = `Information for ${info}`;
        });
    });
});
