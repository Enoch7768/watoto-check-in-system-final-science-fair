const fs = require('fs');
const { createCanvas } = require('canvas');

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#1E3A8A';
ctx.beginPath();
ctx.arc(100, 100, 100, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = 'white';
ctx.font = 'bold 120px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('W', 100, 100);

const buffer = canvas.toBuffer('image/png');
const base64 = buffer.toString('base64');
console.log(base64);
