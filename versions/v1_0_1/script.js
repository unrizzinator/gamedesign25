const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

var fps = 30;

canvas.width = 600;
canvas.height = 400;

setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 91%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
    ctx.fillRect((Math.random() * canvas.width)-50, (Math.random() * canvas.height)-50, 10, 10);

    // ctx.fillStyle = `hsl(${Math.random() * 360}, 30%, 91%)`;
    // ctx.beginPath();
    // ctx.ellipse((Math.random() * canvas.width)-50, (Math.random() * canvas.height)-50, 50, 50, Math.PI*2, 0, Math.PI*2);
    // ctx.fill();
    // ctx.closePath();
}, 1000/fps);