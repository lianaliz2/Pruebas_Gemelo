import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import projectInformation from "./components/Panels/ProjectInformation";
import elementData from "./components/Panels/Selection";
import settings from "./components/Panels/Settings";
import load from "./components/Toolbars/Sections/Import";
import camera from "./components/Toolbars/Sections/Camera";
import selection from "./components/Toolbars/Sections/Selection";
import { AppManager } from "./bim-components";

BUI.Manager.init();

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBF.PostproductionRenderer
>();
world.name = "Main";

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const viewport = BUI.Component.create<BUI.Viewport>(() => {
  return BUI.html`
    <bim-viewport>
      <bim-grid floating></bim-grid>
    </bim-viewport>
  `;
});

world.renderer = new OBF.PostproductionRenderer(components, viewport);
const { postproduction } = world.renderer;

world.camera = new OBC.OrthoPerspectiveCamera(components);

const worldGrid = components.get(OBC.Grids).create(world);
worldGrid.material.uniforms.uColor.value = new THREE.Color(0x424242);
worldGrid.material.uniforms.uSize1.value = 2;
worldGrid.material.uniforms.uSize2.value = 8;

const resizeWorld = () => {
  world.renderer?.resize();
  world.camera.updateAspect();
};

viewport.addEventListener("resize", resizeWorld);

components.init();

postproduction.enabled = true;
postproduction.customEffects.excludedMeshes.push(worldGrid.three);
postproduction.setPasses({ custom: true, ao: true, gamma: true });
postproduction.customEffects.lineColor = 0x17191c;

const appManager = components.get(AppManager);
const viewportGrid = viewport.querySelector<BUI.Grid>("bim-grid[floating]")!;
appManager.grids.set("viewport", viewportGrid);

const fragments = components.get(OBC.FragmentsManager);
const indexer = components.get(OBC.IfcRelationsIndexer);
const classifier = components.get(OBC.Classifier);
classifier.list.CustomSelections = {};

const ifcLoader = components.get(OBC.IfcLoader);
async function setupLoaders() {
    await ifcLoader.setup();
}

setupLoaders().catch(console.error);

const tilesLoader = components.get(OBF.IfcStreamer);
tilesLoader.url = "../resources/tiles/";
tilesLoader.world = world;
tilesLoader.culler.threshold = 10;
tilesLoader.culler.maxHiddenTime = 1000;
tilesLoader.culler.maxLostTime = 40000;

const highlighter = components.get(OBF.Highlighter);
highlighter.setup({ world });
highlighter.zoomToSelection = true;

const culler = components.get(OBC.Cullers).create(world);
culler.threshold = 50;

world.camera.controls.restThreshold = 0.25;
world.camera.controls.addEventListener("rest", () => {
  culler.needsUpdate = true;
  tilesLoader.culler.needsUpdate = true;
});

fragments.onFragmentsLoaded.add(async (model) => {
  if (model.hasProperties) {
    await indexer.process(model);
    classifier.byEntity(model);
  }

  for (const fragment of model.items) {
    world.meshes.add(fragment.mesh);
    culler.add(fragment.mesh);
  }

  world.scene.three.add(model);
  setTimeout(async () => {
    world.camera.fit(world.meshes, 0.8);
  }, 50);
});

const projectInformationPanel = projectInformation(components);
const elementDataPanel = elementData(components);

const toolbar = BUI.Component.create(() => {
  return BUI.html`
    <bim-toolbar>
      ${load(components)}
      ${camera(world)}
      ${selection(components, world)}
    </bim-toolbar>
  `;
});

const leftPanel = BUI.Component.create(() => {
  return BUI.html`
    <bim-tabs switchers-full>
      <bim-tab name="project" label="Project" icon="ph:building-fill">
        ${projectInformationPanel}
      </bim-tab>
      <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
        ${settings(components)}
      </bim-tab>
      <bim-tab name="element" label="Element Data" icon="material-symbols:help">
        ${elementDataPanel}
      </bim-tab>
    </bim-tabs> 
  `;
});

const tabViewer = document.getElementById("tab-viewer") as BUI.Grid;
const panel = document.getElementById("panel") as BUI.Grid;
const viewer = document.getElementById("viewer") as BUI.Grid;

tabViewer.appendChild(toolbar)
panel.appendChild(leftPanel)
viewer.appendChild(viewport)

const shadowHost = document.querySelector('#ribbon') as HTMLElement;
if (shadowHost && shadowHost.shadowRoot) {
    const style = document.createElement('style');
    style.textContent = `
        .switcher {
            border-radius: 6px;
            margin: 5px 5px 5px 0;
        }
        .content {
            border-top:none!important;
            margin-bottom: 5px
        }
    `;
    shadowHost.shadowRoot.appendChild(style);
}

