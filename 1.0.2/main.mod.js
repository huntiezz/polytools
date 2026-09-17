import { PolyMod } from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

class PolyTools extends PolyMod {
  postInit = () => {
    this.state = {
      wireframe: false,
      xray: false,
      ghost: false,
      rgb: false,
      fly: false
    };

    this.cars = new Set();
    this.car = null;
    this.originalMaterials = new WeakMap();
    this.rgbTime = 0;
    this.drag = null;
    this.flyKeys = new Set();
    this.flyFrame = null;

    this.installSceneHook();
    this.createUI();
    this.bindFlyKeys();
    this.startWatcher();
    this.startFlyLoop();
  };

  installSceneHook() {
    try {
      const chunk = window.webpackChunk;

      if (!chunk) {
        console.warn("[PolyTools] webpackChunk not found.");
        return;
      }

      let req;

      chunk.push([
        [Math.random()],
        {},
        r => {
          req = r;
        }
      ]);

      if (!req) return;

      const three = req(4922);

      const Group = three.YJl;

      if (!Group) {
        console.warn("[PolyTools] Three.js Group not found.");
        return;
      }

      const Object3D =
        Object.getPrototypeOf(Group.prototype).constructor;

      if (Object3D.prototype.__polyToolsHooked) return;

      const originalAdd = Object3D.prototype.add;

      Object3D.prototype.add = function (...objects) {
        const result = originalAdd.apply(this, objects);

        for (const object of objects) {
          try {
            if (
              object &&
              object.getObjectByName &&
              object.getObjectByName("Body")
            ) {
              window.__polyTools?.registerCar(object);
            }
          } catch {}
        }

        return result;
      };

      Object3D.prototype.__polyToolsHooked = true;

      window.__polyTools = {
        registerCar: car => {
          if (!car) return;

          if (
            car.getObjectByName &&
            car.getObjectByName("Body")
          ) {
            this.cars.add(car);
          }
        }
      };

      this.three = three;
    } catch (error) {
      console.error("[PolyTools] Scene hook failed:", error);
    }
  }

  startWatcher() {
    this.watcher = setInterval(() => {
      this.cleanupCars();
      this.findCurrentCar();
      this.updateEffects();
      this.updateButtons();
    }, 100);
  }

  startFlyLoop() {
    const update = () => {
      this.updateFly();
      this.flyFrame = requestAnimationFrame(update);
    };

    this.flyFrame = requestAnimationFrame(update);
  }

  bindFlyKeys() {
    window.addEventListener("keydown", event => {
      if (["Space", "ShiftLeft", "ShiftRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        this.flyKeys.add(event.code);
      }
    });

    window.addEventListener("keyup", event => {
      this.flyKeys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.flyKeys.clear();
    });
  }

  updateFly() {
    if (!this.state.fly || !this.car || !this.car.position) return;

    const horizontal = (this.flyKeys.has("KeyD") ? 1 : 0) -
      (this.flyKeys.has("KeyA") ? 1 : 0);
    const forward = (this.flyKeys.has("KeyW") ? 1 : 0) -
      (this.flyKeys.has("KeyS") ? 1 : 0);
    const vertical = (this.flyKeys.has("Space") ? 1 : 0) -
      ((this.flyKeys.has("ShiftLeft") || this.flyKeys.has("ShiftRight")) ? 1 : 0);

    if (!horizontal && !forward && !vertical) return;

    const length = Math.hypot(horizontal, forward, vertical) || 1;
    const speed = 0.35 / length;

    if (horizontal || forward) {
      this.car.translateX(horizontal * speed);
      this.car.translateZ(-forward * speed);
    }

    this.car.position.y += vertical * speed;
    this.car.updateMatrixWorld?.(true);
  }

  cleanupCars() {
    for (const car of this.cars) {
      if (!car || !car.parent) {
        this.cars.delete(car);
      }
    }
  }

  findCurrentCar() {
    const candidates = [...this.cars].filter(car => {
      if (!car?.parent) return false;

      const body = car.getObjectByName?.("Body");

      return (
        body &&
        car.parent.type === "Scene" &&
        body.matrixAutoUpdate === false
      );
    });

    if (!candidates.length) {
      this.car = null;
      return null;
    }

    const cameras = [];

    for (const candidate of candidates) {
      candidate.parent?.traverse?.(object => {
        if (object.isCamera) {
          cameras.push(object);
        }
      });
    }

    if (!cameras.length) {
      this.car = candidates[0];
      return this.car;
    }

    let closest = null;
    let closestDistance = Infinity;

    const carPosition = new this.three.Y7D();

    const cameraPosition = new this.three.Y7D();

    for (const car of candidates) {
      try {
        car.getWorldPosition(carPosition);

        for (const camera of cameras) {
          camera.getWorldPosition(cameraPosition);

          const distance =
            carPosition.distanceToSquared(cameraPosition);

          if (distance < closestDistance) {
            closestDistance = distance;
            closest = car;
          }
        }
      } catch {}
    }

    if (closest) {
      this.car = closest;
    }

    return this.car;
  }

  getMeshes() {
    if (!this.car) return [];

    const meshes = [];

    this.car.traverse(object => {
      if (object.isMesh && object.material) {
        meshes.push(object);
      }
    });

    return meshes;
  }

  rememberMaterial(mesh, material) {
    if (!this.originalMaterials.has(mesh)) {
      this.originalMaterials.set(
        mesh,
        Array.isArray(material)
          ? material.map(m => m.clone())
          : material.clone()
      );
    }
  }

  applyVisualState() {
    const meshes = this.getMeshes();

    for (const mesh of meshes) {
      if (!mesh.material) continue;

      this.rememberMaterial(mesh, mesh.material);

      const original = this.originalMaterials.get(mesh);

      const materials = Array.isArray(original)
        ? original
        : [original];

      const modified = materials.map(material => {
        const m = material.clone();

        m.wireframe = this.state.wireframe;

        if (this.state.xray || this.state.ghost) {
          m.transparent = true;
          m.depthWrite = false;
          m.opacity = this.state.ghost ? 0.3 : 0.55;
          m.side = 2;
        }

        return m;
      });

      mesh.material =
        modified.length === 1
          ? modified[0]
          : modified;
    }
  }

  resetVisuals() {
    for (const [mesh, material] of this.originalMaterials) {
      if (!mesh) continue;

      mesh.material = Array.isArray(material)
        ? material.map(m => m.clone())
        : material.clone();
    }

    this.state.wireframe = false;
    this.state.xray = false;
    this.state.ghost = false;
    this.state.rgb = false;
    this.state.fly = false;
    this.flyKeys.clear();

    this.updateButtons();
  }

  updateEffects() {
    if (!this.state.rgb) return;

    const meshes = this.getMeshes();

    this.rgbTime += 0.025;

    for (const mesh of meshes) {
      const material = mesh.material;

      const materials = Array.isArray(material)
        ? material
        : [material];

      for (const m of materials) {
        if (!m.color) continue;

        const hue =
          (this.rgbTime * 0.35 + mesh.id * 0.015) % 1;

        m.color.setHSL(hue, 0.8, 0.55);
      }
    }
  }

  toggle(name) {
    this.findCurrentCar();

    if (!this.car) return;

    this.state[name] = !this.state[name];

    this.applyVisualState();
    this.updateButtons();
  }

  createUI() {
    if (document.getElementById("polytools")) return;

    const root = document.createElement("div");

    root.id = "polytools";

    root.innerHTML = `
      <div class="pt-top">
        <div class="pt-drag">
          <span class="pt-dot"></span>
          <span>PolyTools</span>
        </div>

        <button class="pt-close">×</button>
      </div>

      <div class="pt-status">
        <span class="pt-status-dot"></span>
        <span class="pt-status-text">Searching for car</span>
      </div>

      <div class="pt-controls">

        <button class="pt-control" data-action="wireframe">
          <span class="pt-icon">◇</span>
          <span class="pt-name">Wireframe</span>
          <span class="pt-state">OFF</span>
        </button>

        <button class="pt-control" data-action="xray">
          <span class="pt-icon">◌</span>
          <span class="pt-name">X-Ray</span>
          <span class="pt-state">OFF</span>
        </button>

        <button class="pt-control" data-action="ghost">
          <span class="pt-icon">◈</span>
          <span class="pt-name">Ghost</span>
          <span class="pt-state">OFF</span>
        </button>

        <button class="pt-control" data-action="rgb">
          <span class="pt-icon">✦</span>
          <span class="pt-name">RGB</span>
          <span class="pt-state">OFF</span>
        </button>

        <button class="pt-control" data-action="fly">
          <span class="pt-icon">↑</span>
          <span class="pt-name">Fly</span>
          <span class="pt-state">OFF</span>
        </button>

      </div>

      <div class="pt-bottom">
        <button class="pt-reset">Reset</button>
      </div>
    `;

    document.body.appendChild(root);

    this.injectStyle();
    this.bindUI();
    this.updateButtons();
  }

  injectStyle() {
    const style = document.createElement("style");

    style.id = "polytools-style";

    style.textContent = `
      #polytools {
        position: fixed;
        left: 24px;
        top: 50%;
        transform: translateY(-50%);
        width: 214px;
        z-index: 999999;
        padding: 8px;

        background: rgba(13, 13, 15, .94);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 9px;

        color: #ededee;
        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;

        font-size: 11px;

        box-shadow:
          0 8px 30px rgba(0,0,0,.35);

        user-select: none;
        backdrop-filter: blur(12px);
      }

      #polytools * {
        box-sizing: border-box;
      }

      .pt-top {
        height: 29px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 0 3px 0 5px;

        cursor: grab;
      }

      .pt-top:active {
        cursor: grabbing;
      }

      .pt-drag {
        display: flex;
        align-items: center;
        gap: 7px;

        font-weight: 600;
        color: #e6e6e7;
      }

      .pt-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #777;
      }

      .pt-close {
        width: 22px;
        height: 22px;

        border: 0;
        border-radius: 5px;

        background: transparent;
        color: #777;

        font-size: 16px;
        line-height: 20px;

        cursor: pointer;
      }

      .pt-close:hover {
        background: #1d1d20;
        color: #ddd;
      }

      .pt-status {
        display: flex;
        align-items: center;
        gap: 7px;

        height: 24px;
        padding: 0 7px;

        color: #68686d;
        font-size: 10px;
      }

      .pt-status-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #555;
      }

      .pt-controls {
        display: flex;
        flex-direction: column;
        gap: 2px;

        margin-top: 3px;
      }

      .pt-control {
        display: grid;
        grid-template-columns: 19px 1fr auto;
        align-items: center;
        gap: 5px;

        width: 100%;
        height: 32px;

        padding: 0 7px;

        border: 0;
        border-radius: 6px;

        background: transparent;
        color: #bdbdc2;

        text-align: left;

        cursor: pointer;
      }

      .pt-control:hover {
        background: #19191c;
        color: #f1f1f2;
      }

      .pt-control.active {
        background: #202024;
        color: #fff;
      }

      .pt-icon {
        color: #737378;
        font-size: 12px;
        text-align: center;
      }

      .pt-control.active .pt-icon {
        color: #fff;
      }

      .pt-name {
        font-size: 11px;
        font-weight: 500;
      }

      .pt-state {
        color: #55555b;
        font-size: 9px;
        font-weight: 600;
        letter-spacing: .04em;
      }

      .pt-control.active .pt-state {
        color: #aaa;
      }

      .pt-bottom {
        margin-top: 5px;
        padding-top: 5px;

        border-top: 1px solid #202023;
      }

      .pt-reset {
        width: 100%;
        height: 27px;

        border: 0;
        border-radius: 5px;

        background: transparent;
        color: #68686d;

        font-size: 10px;
        cursor: pointer;
      }

      .pt-reset:hover {
        background: #19191c;
        color: #ccc;
      }
    `;

    document.head.appendChild(style);
  }

  bindUI() {
    const root = document.getElementById("polytools");

    root.querySelector(".pt-close").onclick = () => {
      root.remove();
    };

    root.querySelectorAll(".pt-control").forEach(button => {
      button.onclick = () => {
        this.toggle(button.dataset.action);
      };
    });

    root.querySelector(".pt-reset").onclick = () => {
      this.resetVisuals();
    };

    const header = root.querySelector(".pt-top");

    header.addEventListener("mousedown", event => {
      if (event.target.closest(".pt-close")) return;

      const rect = root.getBoundingClientRect();

      this.drag = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };

      root.style.transform = "none";

      const move = e => {
        if (!this.drag) return;

        root.style.left =
          `${e.clientX - this.drag.offsetX}px`;

        root.style.top =
          `${e.clientY - this.drag.offsetY}px`;
      };

      const up = () => {
        this.drag = null;

        document.removeEventListener(
          "mousemove",
          move
        );

        document.removeEventListener(
          "mouseup",
          up
        );
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  updateButtons() {
    const root = document.getElementById("polytools");

    if (!root) return;

    for (const button of root.querySelectorAll(".pt-control")) {
      const action = button.dataset.action;
      const enabled = !!this.state[action];

      button.classList.toggle("active", enabled);

      const state =
        button.querySelector(".pt-state");

      if (state) {
        state.textContent = enabled
          ? "ON"
          : "OFF";
      }
    }

    const statusText =
      root.querySelector(".pt-status-text");

    const statusDot =
      root.querySelector(".pt-status-dot");

    const headerDot =
      root.querySelector(".pt-dot");

    if (this.car) {
      statusText.textContent = "Car detected";
      statusDot.style.background = "#aaa";
      headerDot.style.background = "#aaa";
    } else {
      statusText.textContent = "Searching for car";
      statusDot.style.background = "#555";
      headerDot.style.background = "#555";
    }
  }
}

export let polyMod = new PolyTools();