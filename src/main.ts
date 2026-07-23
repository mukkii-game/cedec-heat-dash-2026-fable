// CEDEC HEAT DASH 2026 - bootstrap (foundation commit)
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

ctx.fillStyle = '#14101f';
ctx.fillRect(0, 0, canvas.width, canvas.height);
