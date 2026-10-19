import { eventDate } from "./event";

export type Design = "electric" | "burst" | "minimal";
export type FlyerState = {
  design: Design;
  name: string;
  role: string;
  tagline: string;
  headline: string;
  format: string;
  zoom: number;
  x: number;
  y: number;
};
export const formats: Record<string, number> = {
  Portrait: 1350,
  Square: 1080,
  Story: 1920,
};
export const palette = {
  blue: "#123B86",
  electric: "#2563EB",
  gold: "#FFBE0B",
  cyan: "#22D3EE",
  navy: "#09172F",
  coral: "#FF657A",
};
export function drawFlyer(
  canvas: HTMLCanvasElement,
  s: FlyerState,
  photo: HTMLImageElement | null,
) {
  const w = 1080,
    h = formats[s.format];
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!;
  const minimal = s.design === "minimal",
    burst = s.design === "burst";
  c.fillStyle = minimal ? "#f4f2e9" : burst ? palette.gold : palette.blue;
  c.fillRect(0, 0, w, h);
  if (!minimal && !burst) {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, palette.blue);
    g.addColorStop(1, "#254ce7");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  const circle = (x: number, y: number, r: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  circle(
    1040,
    h * 0.42,
    330,
    burst ? palette.coral : minimal ? palette.gold : palette.electric,
  );
  c.strokeStyle = burst ? palette.blue : "#ffffff20";
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.arc(940, h * 0.4, 220 + i * 38, 0, Math.PI * 2);
    c.stroke();
  }
  const text = (
    t: string,
    x: number,
    y: number,
    size: number,
    color: string,
    max = 960,
  ) => {
    c.fillStyle = color;
    c.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    while (c.measureText(t).width > max && size > 12) {
      size -= 2;
      c.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    }
    c.fillText(t, x, y);
  };
  const ink = minimal || burst ? palette.navy : "#fff";
  text("MUCOSA", 64, 94, 42, ink);
  text("CAREER DAY / 2026", 64, 131, 20, ink);
  text(eventDate.short, 825, 85, 30, ink, 190);
  text("MUST • UGANDA", 825, 119, 17, ink, 200);
  const title =
    s.headline === "I'LL BE THERE!"
      ? ["I’LL BE", "THERE!"]
      : s.headline === "SEE YOU AT CAREER DAY!"
        ? ["SEE YOU", "AT CAREER DAY!"]
        : s.headline === "I'M ATTENDING!"
          ? ["I’M", "ATTENDING!"]
          : ["LET’S", "CONNECT!"];
  text(title[0], 60, 254, 114, ink);
  text(
    title[1],
    60,
    365,
    120,
    burst ? palette.blue : minimal ? palette.blue : palette.gold,
  );
  const py = 405,
    ph = h - 650,
    px = 64,
    pw = 952;
  c.save();
  c.beginPath();
  c.roundRect(px, py, pw, ph, [150, 150, 28, 28]);
  c.clip();
  c.fillStyle = burst ? palette.blue : minimal ? palette.blue : "#162d76";
  c.fillRect(px, py, pw, ph);
  if (photo) {
    const scale =
      Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight) * s.zoom;
    const iw = photo.naturalWidth * scale,
      ih = photo.naturalHeight * scale;
    c.drawImage(
      photo,
      px + (pw - iw) / 2 + s.x * pw,
      py + (ph - ih) / 2 + s.y * ph,
      iw,
      ih,
    );
  } else {
    circle(540, py + ph * 0.36, Math.min(ph * 0.24, 135), palette.cyan);
    c.fillStyle = palette.cyan;
    c.beginPath();
    c.ellipse(
      540,
      py + ph * 1.04,
      Math.min(pw * 0.36, 300),
      ph * 0.45,
      0,
      Math.PI,
      0,
    );
    c.fill();
    text("YOUR NEXT CHAPTER STARTS HERE", 120, py + ph - 38, 23, "#fff", 850);
  }
  const shade = c.createLinearGradient(0, py + ph * 0.55, 0, py + ph);
  shade.addColorStop(0, "#09172f00");
  shade.addColorStop(1, "#09172fbf");
  c.fillStyle = shade;
  c.fillRect(px, py, pw, ph);
  if (s.name) text(s.name, 98, py + ph - 66, 48, "#fff", 880);
  if (s.role)
    text(s.role.toUpperCase(), 100, py + ph - 28, 21, palette.cyan, 870);
  c.restore();
  c.save();
  c.translate(855, py + 36);
  c.rotate(0.13);
  c.fillStyle = palette.gold;
  c.fillRect(-103, -34, 206, 68);
  text("LET’S LINK UP", -88, 9, 22, palette.navy, 180);
  c.restore();
  text(s.tagline || "Connect. Explore. Innovate.", 64, h - 175, 30, ink, 950);
  c.fillStyle = ink;
  c.fillRect(64, h - 143, 952, 2);
  text(eventDate.withWeekday.toUpperCase(), 64, h - 93, 27, ink);
  text("Mbarara University of Science and Technology", 64, h - 53, 23, ink);
}
