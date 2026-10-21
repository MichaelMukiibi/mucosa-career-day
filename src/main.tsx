import { TelemetryPreferences } from './AnalyticsNotice';
import { trackEvent } from './analytics';
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Upload,
  Download,
  Share2,
  Check,
  Sparkles,
  ShieldCheck,
  MapPin,
  CalendarDays,
  Copy,
  RotateCcw,
  X,
  Move,
  Zap,
} from "lucide-react";
import { drawFlyer, formats, type FlyerState, type Design } from "./flyer";
import { eventDate, sharingCaption as caption } from "./event";
import "./style.css";
const initial: FlyerState = {
  design: "electric",
  name: "",
  role: "",
  tagline: "",
  headline: "I'LL BE THERE!",
  format: "Portrait",
  zoom: 1,
  x: 0,
  y: 0,
};
function App() {
  const [state, setState] = useState(initial),
    [photo, setPhoto] = useState<HTMLImageElement | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [step, setStep] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
      null,
    );
  const update = <K extends keyof FlyerState>(key: K, value: FlyerState[K]) =>
    setState((s) => ({ ...s, [key]: value }));
  useEffect(() => {
    let active = true;
    const render = () => {
      if (active && canvas.current) drawFlyer(canvas.current, state, photo);
    };
    render();
    document.fonts.ready.then(render);
    return () => {
      active = false;
    };
  }, [state, photo]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Please choose a photo smaller than 20 MB.");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setState((s) => ({ ...s, zoom: 1, x: 0, y: 0 }));
      URL.revokeObjectURL(url);
      setBusy(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That photo could not be opened. Please try another.");
      setBusy(false);
    };
    img.src = url;
  }
  async function blob() {
    await document.fonts.ready;
    const output = document.createElement("canvas");
    drawFlyer(output, state, photo);
    return new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Export failed. Please try again.")),
        "image/png",
      ),
    );
  }
  function save(b: Blob) {
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MUCOSA-Career-Day-2026-Ill-Be-There-${state.format}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function exportFlyer(share = false) {
    if (!photo) {
      setError("Add your photo first to make this flyer yours.");
      input.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const b = await blob();
      const file = new File([b], "MUCOSA-Career-Day-2026.png", {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "MUCOSA Career Day 2026",
          text: caption,
        });
        trackEvent('flyer_shared', { format: state.format, design: state.design });
      } else {
        save(b);
        trackEvent('flyer_downloaded', { format: state.format, design: state.design });
        setNotice(
          share
            ? "Flyer downloaded. Share it with the caption below!"
            : "Your flyer is ready. See you at Career Day!",
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError((e as Error).message || "Could not export. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <TelemetryPreferences />
      <nav className="nav">
        <a href="#" className="brand">
          <span className="brand-symbol">
            m<span>✳</span>
          </span>
          <span>
            MUCOSA<small>CAREER DAY 2026</small>
          </span>
        </a>
        <div className="nav-right">
          <span className="event-pill">
            <i /> {eventDate.short} • MUST, MBARARA
          </span>
          <a href="#studio">
            Get your flyer <ArrowUpRight size={17} />
          </a>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> THE FUTURE HAS A MEETING POINT.
            </div>
            <h1>
              Big ideas.
              <br />
              New connections.
              <br />
              <span>You, in the mix.</span>
              <svg viewBox="0 0 430 20" aria-hidden="true">
                <path d="M3 14 Q200 -4 423 9" />
              </svg>
            </h1>
            <p>
              Your next opportunity could start with a hello.
              <br className="desktop" /> Let everyone know you’re coming to
              MUCOSA Career Day.
            </p>
            <a className="primary hero-cta" href="#studio">
              Make my “I’ll be there” flyer <ArrowUpRight size={20} />
            </a>
            <div className="hero-meta">
              <span>
                <Zap size={15} /> Ready in under a minute
              </span>
              <span>
                <ShieldCheck size={15} /> Your photo stays on your device
              </span>
            </div>
          </div>
          <div className="hero-art" aria-label="Career Day campaign artwork">
            <div className="orbit" />
            <span className="art-star">✳</span>
            <div className="mini-poster">
              <div className="mini-top">
                MUCOSA <span>2026 ↗</span>
              </div>
              <div className="mini-title">
                I’LL BE
                <br />
                <em>THERE!</em>
              </div>
              <div className="portrait-art">
                <div className="avatar-head" />
                <div className="avatar-body" />
                <span>
                  YOUR FACE.
                  <br />
                  YOUR FUTURE.
                </span>
              </div>
              <div className="mini-bottom">
                {eventDate.dayMonth} / MUST, MBARARA
                <br />
                <small>Connect. Explore. Innovate.</small>
              </div>
            </div>
            <span className="sticker">
              Meet your
              <br />
              next <b>what’s next.</b> ↗
            </span>
            <span className="art-note">Good people. Big possibilities.</span>
          </div>
        </section>
        <div className="ticker">
          <span>BUILD YOUR NEXT CHAPTER</span>
          <b>✳</b>
          <span>CONNECT. EXPLORE. INNOVATE.</span>
          <b>✳</b>
          <span>{eventDate.full.toUpperCase()}</span>
          <b>✳</b>
          <span>YOUR FUTURE IS CALLING</span>
          <b>✳</b>
        </div>
        <section id="studio" className="studio">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THE FLYER STUDIO</div>
              <h2>
                Put yourself on the poster<span>.</span>
              </h2>
              <p>A little you. A lot of possibility. Make it yours.</p>
            </div>
            <span className="studio-badge">
              <Sparkles size={15} /> No sign-up. Just show up.
            </span>
          </div>
          <div className="editor">
            <div className="controls">
              <div className="steps">
                {["Your photo", "Make it yours", "Your style"].map((s, i) => (
                  <button
                    key={s}
                    className={step === i ? "active" : ""}
                    onClick={() => setStep(i)}
                  >
                    <span>{i + 1}</span>
                    {s}
                  </button>
                ))}
              </div>
              <section
                className={`control-section ${step === 0 ? "mobile-active" : ""}`}
              >
                <h3>
                  <span>01</span> Start with your best shot
                </h3>
                <div
                  className="upload"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    upload(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    id="photo"
                    className="sr-only"
                    onChange={(e) => {
                      upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <label htmlFor="photo">
                    <span className="upload-icon">
                      <Upload size={23} />
                    </span>
                    <strong>
                      {photo
                        ? "Looking good. Change your photo?"
                        : "Drop your photo here"}
                    </strong>
                    <span>
                      or <u>browse files</u> from your device
                    </span>
                    <small>JPG, PNG or WebP • Up to 20 MB</small>
                  </label>
                </div>
                {photo && (
                  <div className="photo-tools">
                    <label>
                      Zoom{" "}
                      <input
                        aria-label="Photo zoom"
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={state.zoom}
                        onChange={(e) => update("zoom", +e.target.value)}
                      />
                    </label>
                    <div className="position-controls">
                      <label>
                        Horizontal
                        <input
                          aria-label="Horizontal photo position"
                          type="range"
                          min="-1"
                          max="1"
                          step=".01"
                          value={state.x}
                          onChange={(e) => update("x", +e.target.value)}
                        />
                      </label>
                      <label>
                        Vertical
                        <input
                          aria-label="Vertical photo position"
                          type="range"
                          min="-1"
                          max="1"
                          step=".01"
                          value={state.y}
                          onChange={(e) => update("y", +e.target.value)}
                        />
                      </label>
                    </div>
                    <div>
                      <button
                        onClick={() =>
                          setState((s) => ({ ...s, zoom: 1, x: 0, y: 0 }))
                        }
                      >
                        <RotateCcw size={14} /> Reset crop
                      </button>
                      <button onClick={() => setPhoto(null)}>
                        <X size={14} /> Remove
                      </button>
                    </div>
                  </div>
                )}
                <p className="privacy">
                  <ShieldCheck size={13} /> Your photo never leaves your
                  browser.
                </p>
              </section>
              <section
                className={`control-section ${step === 1 ? "mobile-active" : ""}`}
              >
                <h3>
                  <span>02</span> Add your personal touch{" "}
                  <small>OPTIONAL</small>
                </h3>
                <label className="field">
                  Your name
                  <input
                    maxLength={38}
                    placeholder="e.g. Alex Mugisha"
                    value={state.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    I’m a…
                    <select
                      value={state.role}
                      onChange={(e) => update("role", e.target.value)}
                    >
                      <option value="">Choose your role</option>
                      {[
                        "Student",
                        "Developer",
                        "Researcher",
                        "Engineer",
                        "Speaker",
                        "Industry Professional",
                        "Innovator",
                      ].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Your message
                    <select
                      value={state.headline}
                      onChange={(e) => update("headline", e.target.value)}
                    >
                      {[
                        "I'LL BE THERE!",
                        "SEE YOU AT CAREER DAY!",
                        "I'M ATTENDING!",
                        "LET'S CONNECT!",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  A little something about you
                  <input
                    maxLength={60}
                    placeholder="e.g. Building ideas into reality 🚀"
                    value={state.tagline}
                    onChange={(e) => update("tagline", e.target.value)}
                  />
                </label>
              </section>
              <section
                className={`control-section ${step === 2 ? "mobile-active" : ""}`}
              >
                <h3>
                  <span>03</span> Pick your energy
                </h3>
                <div className="templates">
                  {(
                    [
                      ["electric", "Electric Future"],
                      ["burst", "Color Burst"],
                      ["minimal", "Minimal Bold"],
                    ] as [Design, string][]
                  ).map(([id, name]) => (
                    <button
                      key={id}
                      className={`template ${id} ${state.design === id ? "selected" : ""}`}
                      onClick={() => update("design", id)}
                      aria-pressed={state.design === id}
                    >
                      <div>
                        <span>
                          I’LL BE
                          <br />
                          THERE!
                        </span>
                        <i />
                        {state.design === id && (
                          <b>
                            <Check size={12} />
                          </b>
                        )}
                      </div>
                      <strong>{name}</strong>
                    </button>
                  ))}
                </div>
              </section>
              <div className="mobile-next">
                <button
                  className="secondary"
                  onClick={() => setStep((step + 1) % 3)}
                >
                  {step === 2 ? "Back to photo" : "Next step"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="preview-panel">
              <div className="preview-top">
                <span>
                  <i /> LIVE PREVIEW
                </span>
                <span>Made for your main feed ↗</span>
              </div>
              <div className="canvas-wrap">
                <canvas
                  ref={canvas}
                  aria-label="Your personalized Career Day flyer preview. Drag to reposition your photo."
                  onPointerDown={(e) => {
                    if (!photo) return;
                    drag.current = {
                      x: e.clientX,
                      y: e.clientY,
                      ox: state.x,
                      oy: state.y,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!drag.current) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    const d = drag.current;
                    setState((s) => ({
                      ...s,
                      x: Math.max(
                        -1,
                        Math.min(1, d.ox + (e.clientX - d.x) / r.width),
                      ),
                      y: Math.max(
                        -1,
                        Math.min(
                          1,
                          d.oy + (e.clientY - d.y) / (r.height * 0.5),
                        ),
                      ),
                    }));
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                />
              </div>
              <p className="drag-hint">
                <Move size={13} />{" "}
                {photo
                  ? "Drag your photo to find the perfect crop"
                  : "Your photo is the missing piece"}
              </p>
              <div
                className="format-picker"
                role="group"
                aria-label="Export size"
              >
                {Object.entries(formats).map(([key, h]) => (
                  <button
                    key={key}
                    aria-pressed={state.format === key}
                    className={state.format === key ? "selected" : ""}
                    onClick={() => update("format", key)}
                  >
                    {key}
                    <small>1080 × {h}</small>
                  </button>
                ))}
              </div>
              <div className="export-actions">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => exportFlyer()}
                >
                  <Download size={18} />
                  {busy ? "Getting it ready…" : "Download my flyer"}
                </button>
                <button
                  className="share-button"
                  aria-label="Share flyer"
                  disabled={busy}
                  onClick={() => exportFlyer(true)}
                >
                  <Share2 size={19} />
                </button>
              </div>
              <p className="export-note">
                High-res PNG. Big main-character energy.
              </p>
            </div>
          </div>
          <div role="alert" className={error ? "error" : "sr-only"}>
            {error}
          </div>
          <div className="caption-box">
            <span>
              POST IT. TAG IT. MAKE CONNECTIONS.
              <small>Your caption is ready too.</small>
            </span>
            <p>{caption}</p>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(caption);
                  setNotice("Caption copied!");
                } catch {
                  setError(
                    "Copy is unavailable. Select and copy the caption above.",
                  );
                }
              }}
            >
              <Copy size={15} /> Copy caption
            </button>
          </div>
        </section>
        <section className="event-section">
          <div>
            <span className="eyebrow">MORE THAN A DATE ON YOUR CALENDAR</span>
            <h2>
              Where curiosity
              <br />
              meets opportunity<span>↗</span>
            </h2>
            <p>
              Students, builders, researchers, and industry minds.
              <br />
              One day to explore what comes next, together.
            </p>
            <div className="event-details">
              <span>
                <CalendarDays size={17} /> {eventDate.withWeekday}
              </span>
              <span>
                <MapPin size={17} /> MUST, Mbarara, Uganda
              </span>
            </div>
          </div>
          <div className="schedule">
            <article>
              <span>11:00 AM — 2:00 PM</span>
              <h3>
                Find your community <ArrowUpRight />
              </h3>
              <p>
                Concurrent PyTorch & AWS community meetups.
                <br />
                AI, cloud, fresh ideas, and people who get it.
              </p>
              <div>
                <b>AI & MACHINE LEARNING</b>
                <b>CLOUD & BUILDING</b>
              </div>
            </article>
            <article>
              <span>2:00 PM — 5:00 PM</span>
              <h3>
                Connect to what’s next <ArrowUpRight />
              </h3>
              <p>
                Industry perspectives, career conversations, and
                <br />
                connections that go beyond the classroom.
              </p>
              <div>
                <b>INDUSTRY PANEL</b>
                <b>CAREER CONNECTIONS</b>
              </div>
            </article>
            <small>
              Community and speaker participation subject to confirmation.
            </small>
          </div>
        </section>
      </main>
      <footer>
        <a href="#" className="brand">
          MUCOSA<span className="footer-x">✳</span>
        </a>
        <p>
          Faculty of Computing & Informatics · MUST Computing Students
          Association
        </p>
        <span>Made for the next generation. © 2026</span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
