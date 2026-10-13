// Marcador provisional: este mundo aún no está pintado.
export async function build() {
  const shots = {};
  for (const n of 'flyby,chase,whale,airship,dive'.split(',')) {
    shots[n] = ({ g, W, H }) => {
      g.fillStyle = '#20242c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#9aa3ad'; g.font = '48px serif'; g.textAlign = 'center';
      g.fillText('Plano «' + n + '» en preparación', W / 2, H / 2);
    };
  }
  return { shots };
}
