import { PolyMod } from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

class PolyTools extends PolyMod {
  postInit = () => {
    this.createUI();
  };

  createUI() {
    if (document.getElementById("polytools")) return;

    const root = document.createElement("div");
    root.id = "polytools";

    root.innerHTML = `
      <div class="pt-header">
        <div>
          <div class="pt-title">PolyTools</div>
          <div class="pt-version">0.6.3</div>
        </div>
        <button class="pt-close">×</button>
      </div>

      <div class="pt-section">
        <div class="pt-label">VISUALS</div>

        <div class="pt-grid">
          <button data-action="wireframe">
            <span>Wireframe</span>
            <small>OFF</small>
          </button>

          <button data-action="xray">
            <span>X-Ray</span>
            <small>OFF</small>
          </button>
        </div>
      </div>

      <div class="pt-section">
        <div class="pt-label">CAR</div>

        <div class="pt-row">
          <span>Scale</span>
          <strong>100%</strong>
        </div>

        <input
          class="pt-range"
          type="range"
          min="50"
          max="150"
          value="100"
        />
      </div>

      <div class="pt-section">
        <div class="pt-label">EFFECTS</div>

        <div class="pt-chips">
          <button>Spin</button>
          <button>Ghost</button>
          <button>RGB</button>
        </div>
      </div>

      <div class="pt-footer">
        <button>Reset visuals</button>
      </div>
    `;

    document.body.appendChild(root);
    this.injectStyle();
    this.bindUI();
  }

  injectStyle() {
    const style = document.createElement("style");

    style.textContent = `
      #polytools {
        position: fixed;
        right: 24px;
        bottom: 24px;
        width: 300px;
        padding: 14px;
        z-index: 99999;
        background: #0d0d0f;
        color: #e8e8ea;
        border: 1px solid #29292d;
        border-radius: 10px;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 12px 40px rgba(0,0,0,.4);
      }

      #polytools * {
        box-sizing: border-box;
      }

      .pt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid #202024;
      }

      .pt-title {
        font-size: 14px;
        font-weight: 600;
      }

      .pt-version {
        margin-top: 2px;
        color: #66666d;
        font-size: 10px;
      }

      .pt-close {
        width: 24px;
        height: 24px;
        border: 0;
        background: transparent;
        color: #777;
        font-size: 18px;
        cursor: pointer;
      }

      .pt-section {
        padding: 14px 0;
        border-bottom: 1px solid #202024;
      }

      .pt-label {
        margin-bottom: 8px;
        color: #68686f;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .08em;
      }

      .pt-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .pt-grid button,
      .pt-chips button {
        border: 1px solid #29292d;
        background: #151518;
        color: #ddd;
        border-radius: 7px;
        cursor: pointer;
      }

      .pt-grid button {
        display: flex;
        justify-content: space-between;
        padding: 9px;
        text-align: left;
      }

      .pt-grid small {
        color: #666;
      }

      .pt-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
      }

      .pt-row strong {
        color: #999;
        font-weight: 500;
      }

      .pt-range {
        width: 100%;
        accent-color: #aaa;
      }

      .pt-chips {
        display: flex;
        gap: 6px;
      }

      .pt-chips button {
        padding: 7px 11px;
        font-size: 11px;
      }

      .pt-footer {
        padding-top: 12px;
      }

      .pt-footer button {
        width: 100%;
        height: 30px;
        border: 1px solid #29292d;
        background: transparent;
        color: #888;
        border-radius: 7px;
        cursor: pointer;
      }

      #polytools button:hover {
        background: #1c1c20;
        color: #fff;
      }
    `;

    document.head.appendChild(style);
  }

  bindUI() {
    const root = document.getElementById("polytools");

    root.querySelector(".pt-close").onclick = () => root.remove();

    root.querySelector(".pt-range").oninput = event => {
      root.querySelector(".pt-row strong").textContent =
        `${event.target.value}%`;
    };
  }
}

export let polyMod = new PolyTools();